import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { GoogleAIFileManager, FileState } from '@google/generative-ai/server'
import { downloadFileToTmp } from '@/lib/google-drive'
import fs from 'fs'
import { cache } from '@/lib/cache'

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

export async function POST(request: NextRequest) {
    let tempFilePath: string | null = null

    try {
        const { fileId, fileName } = await request.json()

        if (!fileId || !fileName) {
            return NextResponse.json({ error: 'File ID and Name are required' }, { status: 400 })
        }

        // 1. Download video from Drive
        console.log(`Downloading file ${fileName} (${fileId})...`)
        tempFilePath = await downloadFileToTmp(fileId, fileName)
        console.log(`Downloaded to ${tempFilePath}`)

        // 2. Upload to Gemini
        console.log('Uploading to Gemini...')
        const uploadResult = await fileManager.uploadFile(tempFilePath, {
            mimeType: 'video/mp4',
            displayName: fileName,
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
      請分析這個會議影片/音檔。
      請輸出一個 JSON 物件，包含以下欄位：
      1. meeting_date: 會議日期 (YYYY-MM-DD)，如果無法從影片判斷，請回傳 null。
      2. content: 詳細的會議記錄內容 (繁體中文)。
      3. summary: 2-3 句的重點摘要 (繁體中文)。
      4. tags: 相關標籤陣列 (例如 ["產品", "行銷"])。
      5. action_items: 代辦事項陣列，每個項目包含:
         - content: 事項內容
         - assignee: 負責人 (若無則為 null)
         - dueDate: 預計完成日 (YYYY-MM-DD，若無則為 null)

      請確保回傳的是純 JSON 格式，不要有 markdown code block。
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

        // 5. Insert into Database
        const supabase = getSupabaseClient()

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
