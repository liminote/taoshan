import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { GoogleAIFileManager, FileState } from '@google/generative-ai/server'
import { downloadFileToTmp } from '@/lib/google-drive'
import fs from 'fs'
import { cache } from '@/lib/cache'

export const maxDuration = 60; // Allow up to 60 seconds for processing (if plan allows)

// Initialize Supabase
function getSupabaseClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const supabaseKey = serviceRoleKey || anonKey

    if (!supabaseUrl || !supabaseKey) {
        throw new Error('Supabase environment variables are not configured')
    }

    return createClient(supabaseUrl, supabaseKey, {
        auth: { persistSession: false, autoRefreshToken: false }
    })
}

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || '')
const fileManager = new GoogleAIFileManager(process.env.GOOGLE_AI_API_KEY || '')

// Helper function to parse action items from content string if structured
function parseActionItemsFromContent(content: string): any[] {
    const items: any[] = [];
    if (!content) return items;

    const lines = content.split('\n');
    // Regex to match: * Task Content | Assignee | Date ...
    // Example: * 聯絡廠商 | Allen | 2025-12-09
    const regex = /^\s*\*\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(\d{4}-\d{2}-\d{2})/;

    for (const line of lines) {
        const match = line.match(regex);
        if (match) {
            items.push({
                content: match[1].trim(),
                assignee: match[2].trim(),
                dueDate: match[3].trim()
            });
        }
    }
    return items;
}

export async function POST(request: NextRequest) {
    let tempFilePath: string | null = null

    try {
        const { fileId, fileName, fileKey } = await request.json()

        if ((!fileId || !fileName) && !fileKey) {
            return NextResponse.json({ error: 'File source is required' }, { status: 400 })
        }

        const supabase = getSupabaseClient()

        // 1. Download file (from Drive or Supabase)
        if (fileKey) {
            // Download from Supabase Storage
            console.log(`Downloading file from Supabase: ${fileKey}...`)
            const { data, error } = await supabase.storage
                .from('temp-meeting-uploads')
                .download(fileKey)

            if (error) throw new Error(`Supabase download failed: ${error.message}`)

            const buffer = Buffer.from(await data.arrayBuffer())
            tempFilePath = `/tmp/${fileKey}`
            fs.writeFileSync(tempFilePath, buffer)
            console.log(`Downloaded to ${tempFilePath}`)
        } else {
            // Download from Drive
            console.log(`Downloading file ${fileName} (${fileId})...`)
            tempFilePath = await downloadFileToTmp(fileId, fileName)
            console.log(`Downloaded to ${tempFilePath}`)
        }

        // 2. Upload to Gemini
        console.log('Uploading to Gemini...')
        const uploadResult = await fileManager.uploadFile(tempFilePath, {
            mimeType: 'video/mp4', // Gemini handles audio with this mime type too usually, or we can detect
            displayName: fileName || fileKey,
        })
        const fileUri = uploadResult.file.uri
        const name = uploadResult.file.name
        console.log(`Uploaded to Gemini: ${name} (${fileUri})`)

        // 3. Wait for processing
        let file = await fileManager.getFile(name)
        while (file.state === FileState.PROCESSING) {
            console.log('Processing video...')
            await new Promise((resolve) => setTimeout(resolve, 5000)) // Wait 5s
            file = await fileManager.getFile(name)
        }

        if (file.state === FileState.FAILED) {
            throw new Error('Video processing failed.')
        }
        console.log('Video processing complete.')

        // 4. Generate Content
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
        const prompt = `
      請分析這個會議影片/音檔，並產出 JSON 格式的會議記錄。
      
      【重要規則】
      1. 人名修正：若聽到 "Louis" 請修正為 "Luis"，若聽到 "Alen" 請修正為 "Allen"。
      2. 風格要求：如實陳述，不要加油添醋，不要廢話，不要使用過度修飾的形容詞（如「旨在將此次的挫敗轉化為...」這類話術）。
      3. 格式要求：請嚴格遵守以下 JSON 結構。

      請輸出一個 JSON 物件，包含以下欄位：
      1. meeting_date: 會議日期 (YYYY-MM-DD)，若無法判斷請回傳 null。
      2. summary: 第一大項：會議摘要。約 100-200 字，描述討論事項，不需列出數字與待辦。
      3. content: 第二大項：會議內容。以條列式整理討論內容 (繁體中文)。若有明確的待辦事項，請務必同時列入 action_items，不要只寫在這裡。
      4. tags: 相關標籤陣列。
      5. action_items: 第三大項：待辦事項陣列（這是最重要的部分，請勿遺漏）。每個項目包含：
         - content: 事項內容
         - assignee: 負責人 (若無則為 null)
         - dueDate: 預計完成日 (YYYY-MM-DD，若無則為 null)
         
      注意：JSON 的 content 欄位請直接回傳整理好的條列式文字，不要回傳 JSON array。
      `

        const result = await model.generateContent([
            { fileData: { mimeType: file.mimeType, fileUri: file.uri } },
            { text: prompt }
        ])

        const responseText = result.response.text()
        console.log('Gemini response:', responseText)

        // Clean up JSON string (remove markdown if present)
        const jsonStr = responseText.replace(/```json/g, '').replace(/```/g, '').trim()
        const data = JSON.parse(jsonStr)

        // Fallback: If action_items is empty but content has structured items, parse them
        if ((!data.action_items || data.action_items.length === 0) && data.content) {
            console.log('Action items empty, attempting to parse from content...');
            const parsedItems = parseActionItemsFromContent(data.content);
            if (parsedItems.length > 0) {
                console.log(`Parsed ${parsedItems.length} items from content string as fallback.`);
                data.action_items = parsedItems;
            }
        }

        // 5. Insert into Database
        // supabase client is already initialized above

        const meetingDate = data.meeting_date || new Date().toISOString().split('T')[0]

        const recordPayload = {
            meeting_date: meetingDate,
            content: data.content || '無內容',
            summary: data.summary,
            tags: data.tags || [],
            created_at: new Date().toISOString(),
            completed: false,
            archived: false,
        }

        const { data: insertedRecord, error: insertError } = await supabase
            .from('meeting_records')
            .insert([recordPayload])
            .select()
            .single()

        if (insertError) {
            throw new Error(`Database insert failed: ${insertError.message}`)
        }

        // 6. Insert Action Items
        if (data.action_items && data.action_items.length > 0) {
            const todos = data.action_items.map((item: any) => ({
                date: item.dueDate || meetingDate,
                content: item.content,
                assignee: item.assignee || '未定',
                completed: false
            }))

            const { error: todoError } = await supabase
                .from('important_items')
                .insert(todos)

            if (todoError) {
                console.error('Failed to insert action items:', todoError)
            } else {
                // Clear cache if needed
                // Assuming cache keys are imported or we can just ignore for now
            }
        }

        // 7. Cleanup
        if (tempFilePath && fs.existsSync(tempFilePath)) {
            fs.unlinkSync(tempFilePath)
        }
        // Optionally delete from Gemini to save space? 
        // await fileManager.deleteFile(name)

        return NextResponse.json({ success: true, record: insertedRecord })

    } catch (error: any) {
        console.error('Processing error:', error)
        // Cleanup temp file on error
        if (tempFilePath && fs.existsSync(tempFilePath)) {
            fs.unlinkSync(tempFilePath)
        }
        return NextResponse.json(
            { error: `Video processing failed: ${error.message}` },
            { status: 500 }
        )
    }
}
