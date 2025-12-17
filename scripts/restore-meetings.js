
const { createClient } = require('@supabase/supabase-js');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { GoogleAIFileManager, FileState } = require('@google/generative-ai/server');
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const os = require('os');
require('dotenv').config({ path: '.env.local' });

// --- Configuration ---
const FOLDER_NAME = 'Meet Recordings';
const MAX_VIDEOS_TO_PROCESS = 50; // Safety limit
const DELAY_BETWEEN_FILES_MS = 10000; // 10s delay to be safe with rate limits

// --- Supabase Setup ---
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}
const supabase = createClient(supabaseUrl, serviceRoleKey);

// --- Gemini Setup ---
if (!process.env.GOOGLE_AI_API_KEY) {
    console.error('Missing GOOGLE_AI_API_KEY');
    process.exit(1);
}
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
const fileManager = new GoogleAIFileManager(process.env.GOOGLE_AI_API_KEY);

// --- Google Drive Setup ---
async function getDriveClient() {
    try {
        const credsStr = process.env.GOOGLE_SHEETS_CREDENTIALS;
        if (!credsStr) throw new Error('Missing GOOGLE_SHEETS_CREDENTIALS');
        const credentials = JSON.parse(credsStr);
        const auth = new google.auth.GoogleAuth({
            credentials,
            scopes: ['https://www.googleapis.com/auth/drive.readonly']
        });
        return google.drive({ version: 'v3', auth });
    } catch (error) {
        console.error('Drive Auth Failed:', error);
        throw error;
    }
}

// --- Helper Functions ---

async function downloadFile(drive, fileId, fileName) {
    console.log(`Downloading ${fileName}...`);
    const tmpDir = os.tmpdir();
    const filePath = path.join(tmpDir, fileName);
    const dest = fs.createWriteStream(filePath);

    const res = await drive.files.get(
        { fileId, alt: 'media' },
        { responseType: 'stream' }
    );

    return new Promise((resolve, reject) => {
        res.data
            .on('end', () => resolve(filePath))
            .on('error', reject)
            .pipe(dest);
    });
}

function parseActionItemsFromContent(content) {
    const items = [];
    if (!content) return items;
    const lines = content.split('\n');
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

// --- Main Logic ---

async function main() {
    console.log('Starting Meeting Restoration...');

    // 1. Connect to Drive
    const drive = await getDriveClient();

    // 2. Find Folder
    console.log(`Looking for folder: ${FOLDER_NAME}...`);
    const res = await drive.files.list({
        q: `mimeType='application/vnd.google-apps.folder' and name='${FOLDER_NAME}' and trashed=false`,
        fields: 'files(id, name)'
    });

    if (!res.data.files || res.data.files.length === 0) {
        console.error(`Folder '${FOLDER_NAME}' not found!`);
        return;
    }
    const folderId = res.data.files[0].id;
    console.log(`Found folder ID: ${folderId}`);

    // 3. List Videos
    const fileRes = await drive.files.list({
        q: `'${folderId}' in parents and (mimeType='video/mp4' or mimeType contains 'audio/') and trashed=false`,
        fields: 'files(id, name, createdTime)',
        orderBy: 'createdTime desc',
        pageSize: MAX_VIDEOS_TO_PROCESS
    });

    const files = fileRes.data.files || [];
    console.log(`Found ${files.length} video/audio files to process.`);

    // 4. Process Each File
    for (const file of files) {
        console.log(`\n--- Processing: ${file.name} ---`);

        // Check if already processed (optional, but good for idempotency if re-running)
        // Here we'll just check if a record with the same summary exists? No, summary is generated.
        // Maybe check date? But date is extracted from content...
        // Let's just process it.

        let tempFilePath = null;
        try {
            // Download
            tempFilePath = await downloadFile(drive, file.id, file.name);

            // Upload to Gemini
            console.log('Uploading to Gemini...');
            const uploadResult = await fileManager.uploadFile(tempFilePath, {
                mimeType: 'video/mp4',
                displayName: file.name
            });
            const name = uploadResult.file.name;
            const fileUri = uploadResult.file.uri;

            // Wait for processing
            let geminiFile = await fileManager.getFile(name);
            while (geminiFile.state === FileState.PROCESSING) {
                console.log('Gemini processing video...');
                await new Promise(r => setTimeout(r, 5000));
                geminiFile = await fileManager.getFile(name);
            }

            if (geminiFile.state === FileState.FAILED) {
                throw new Error('Gemini video processing failed.');
            }

            // Generate Content
            console.log('Generating summary...');
            const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
            const prompt = `
            請分析這個會議影片/音檔，並產出 JSON 格式的會議記錄。
            
            【重要規則】
            1. 人名修正：若聽到 "Louis" 請修正為 "Luis"，若聽到 "Alen" 請修正為 "Allen"。
            2. 風格要求：如實陳述，不要加油添醋，不要廢話。
            
            請輸出一個 JSON 物件，包含以下欄位：
            1. meeting_date: 會議日期 (YYYY-MM-DD)，若無法判斷請回傳檔案建立日期 (${file.createdTime.split('T')[0]})。
            2. summary: 會議摘要。
            3. content: 會議內容 (條列式)。
            4. tags: 相關標籤陣列。
            5. action_items: 待辦事項陣列 [{content, assignee, dueDate}]。
            
            回傳純 JSON。
            `;

            const result = await model.generateContent([
                { fileData: { mimeType: geminiFile.mimeType, fileUri: geminiFile.uri } },
                { text: prompt }
            ]);

            const responseText = result.response.text();
            const jsonStr = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
            const data = JSON.parse(jsonStr);

            // DB Insert - Meeting Record
            const recordPayload = {
                meeting_date: data.meeting_date || file.createdTime.split('T')[0],
                content: data.content || '無內容',
                summary: data.summary,
                tags: data.tags || [],
                created_at: new Date().toISOString(),
                // Note: We are creating it NOW, so created_at is now. 
                // Alternatively we could use file.createdTime but database usually prefers its own timeline or "record creation" time.
            };

            const { data: insertedRecord, error: insertError } = await supabase
                .from('meeting_records')
                .insert([recordPayload])
                .select()
                .single();

            if (insertError) throw insertError;
            console.log(`Meeting record inserted (ID: ${insertedRecord.id})`);

            // DB Insert - Action Items
            if (data.action_items && data.action_items.length > 0) {
                const todos = data.action_items.map(item => ({
                    date: item.dueDate || recordPayload.meeting_date,
                    content: item.content,
                    assignee: item.assignee || '未定',
                    completed: false
                }));

                const { error: todoError } = await supabase
                    .from('important_items')
                    .insert(todos);

                if (todoError) console.error('Error inserting todos:', todoError);
                else console.log(`Inserted ${todos.length} action items.`);
            }

            // Cleanup
            if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
            // Optional: await fileManager.deleteFile(name);

        } catch (e) {
            console.error(`Error processing file ${file.name}:`, e);
        }

        // Rate Limit Delay
        console.log(`Waiting ${DELAY_BETWEEN_FILES_MS / 1000}s...`);
        await new Promise(r => setTimeout(r, DELAY_BETWEEN_FILES_MS));
    }
}

main();
