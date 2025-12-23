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

function isValidDate(dateStr: string): boolean {
    if (!dateStr) return false;
    // Strict YYYY-MM-DD format check
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(dateStr)) return false;
    const date = new Date(dateStr);
    return !isNaN(date.getTime());
}

// Helper function to parse action items from content string if structured
function parseActionItemsFromContent(content: string, meetingDate: string): any[] {
    const items: any[] = [];
    if (!content) return items;

    const lines = content.split('\n');

    // Regex for standard bullet points: * Content | Assignee | Date
    const standardRegex = /^\s*[\*\-]\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(\d{4}-\d{2}-\d{2})/;

    for (const line of lines) {
        // 1. Try standard regex first
        const match = line.match(standardRegex);
        if (match) {
            items.push({
                content: match[1].trim(),
                assignee: match[2].trim(),
                dueDate: match[3].trim()
            });
            continue;
        }

        // 2. Try pipe-separated format (tolerant of no bullet points)
        // e.g. "Content | Assignee | DueDate" or "Content | Assignee | DeadlineText | CreatedDate"
        const cleanLine = line.replace(/^[\s*\-]*\s*/, '').trim(); // Remove leading markers
        if (!cleanLine || !cleanLine.includes('|')) continue;

        const parts = cleanLine.split('|').map(p => p.trim());

        if (parts.length >= 3) {
            const contentText = parts[0];
            const assignee = parts[1];
            let dueDateCandidate = parts[2];
            let rawDeadlineText = parts[2];

            // If there's a 4th column, it might be the date, or the 3rd might be text like "ASAP"
            // Case A: Content | Assignee | Date(YYYY-MM-DD) | Date(YYYY-MM-DD) -> Take col 3
            // Case B: Content | Assignee | "ASAP" | Date(YYYY-MM-DD) -> Take col 4 as date? Or just fallback.

            // Check if col 2 (3rd part) is a date
            if (isValidDate(dueDateCandidate)) {
                items.push({
                    content: contentText,
                    assignee: assignee,
                    dueDate: dueDateCandidate
                });
            } else {
                // Col 2 is NOT a date (e.g. "下次會議前", "盡快")
                // We will use meetingDate (or col 3 if it's a date) as the DB date,
                // and append the text deadline to content.
                let dbDate = meetingDate;

                // If we have a 4th column and it IS a date, maybe use that?
                // Usually the 4th column involves "Created Date" which is today.
                if (parts.length >= 4 && isValidDate(parts[3])) {
                    // Use the created date as the target date? 
                    // Probably safer to stick to meetingDate or the explicit date if provided.
                    // But if the user provided "2025-12-23" (today) as the 4th column, it's a safe fallback.
                    dbDate = parts[3];
                }

                items.push({
                    content: `${contentText} (期限: ${rawDeadlineText})`,
                    assignee: assignee,
                    dueDate: dbDate
                });
            }
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
         - dueDate: 預計完成日 (必須是 YYYY-MM-DD 格式。若聽到「下週」、「盡快」等模糊時間，請回傳 null)
         
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

        let data;
        try {
            data = JSON.parse(jsonStr)
        } catch (e) {
            console.error("Failed to parse JSON", e);
            // Fallback: try to extract partial JSON or basic structure if possible
            // But for now, just creating a basic structure to avoid crash
            data = {
                content: responseText, // Just dump everything to content
                action_items: []
            }
        }

        const meetingDate = data.meeting_date || new Date().toISOString().split('T')[0]

        // Fallback: If action_items is empty but content has structured items, parse them
        if ((!data.action_items || data.action_items.length === 0) && data.content) {
            console.log('Action items empty, attempting to parse from content...');
            // Need meetingDate for fallback dates
            const parsedItems = parseActionItemsFromContent(data.content, meetingDate);
            if (parsedItems.length > 0) {
                console.log(`Parsed ${parsedItems.length} items from content string as fallback.`);
                data.action_items = parsedItems;
            }
        }

        // 5. Insert into Database
        // supabase client is already initialized above

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
            const todos = data.action_items.map((item: any) => {
                let finalDate = item.dueDate;
                let finalContent = item.content;

                if (!isValidDate(finalDate)) {
                    // If date is invalid or null, use meetingDate but append info to content
                    if (finalDate && finalDate.trim().length > 0) {
                        finalContent = `${finalContent} (期限: ${finalDate})`;
                    }
                    finalDate = meetingDate;
                }

                return {
                    date: finalDate,
                    content: finalContent,
                    assignee: item.assignee || '未定',
                    completed: false
                }
            })

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
