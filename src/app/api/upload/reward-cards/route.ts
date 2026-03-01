import { NextResponse } from 'next/server'
import { parseCsv } from '@/lib/csv'

// Require the user to define their GAS Web App URL in environment variables
const GAS_WEB_APP_URL = process.env.GAS_REWARD_CARDS_URL

export async function POST(request: Request) {
    if (!GAS_WEB_APP_URL) {
        return NextResponse.json({ success: false, message: 'Google Apps Script 無效或未設定 (GAS_REWARD_CARDS_URL)' }, { status: 500 })
    }

    try {
        const formData = await request.formData()
        const files = formData.getAll('file') as File[]

        if (!files || files.length === 0) {
            return NextResponse.json({ success: false, message: 'No files received' }, { status: 400 })
        }

        const uploadResults = []

        for (const file of files) {
            if (!file.name.endsWith('.csv')) {
                uploadResults.push({ name: file.name, success: false, message: 'Only CSV files are allowed' })
                continue
            }

            // Determine if it is cards or points
            let type = ''
            if (file.name.includes('_cards_')) {
                type = 'cards'
            } else if (file.name.includes('_points_')) {
                type = 'points'
            } else {
                uploadResults.push({ name: file.name, success: false, message: '檔案名稱必須包含 _cards_ 或 _points_' })
                continue
            }

            const buffer = await file.arrayBuffer()
            const text = new TextDecoder().decode(buffer)

            // Parse CSV dynamically
            const rows = parseCsv(text)

            // Expected that rows contains headers in row 0, data in row 1+
            if (rows.length < 2) {
                uploadResults.push({ name: file.name, success: false, message: '檔案內容過短或空白' })
                continue
            }

            // We want to send all rows (except header because the GAS script logic usually apps values, but Google Sheets needs us to append just the data)
            // Wait, the Google Sheet already has headers at row 1.
            // We should only append data rows.
            const dataRows = rows.slice(1).filter(row => row.length > 0 && row.some(cell => cell.trim() !== ''))

            if (dataRows.length === 0) {
                uploadResults.push({ name: file.name, success: false, message: '檔案內沒有有效數據' })
                continue
            }

            // Extract the date from the filename to inject into the rows if needed?
            // "rewardcards_stats_xxx_YYYYMMDD.csv"
            // Wait! Our old Google Sheet structure for cards had "Data_Date" in the first column!
            // Line 1 of _cards_: "name,validCards,issuedCards..."
            // But in Google Sheet, it's "Data_Date, name, validCards..."

            // Let's parse the exact date from the filename
            const dateMatch = file.name.match(/(\d{8})/)
            const rawDate = dateMatch ? dateMatch[0] : ''

            if (!rawDate) {
                uploadResults.push({ name: file.name, success: false, message: '檔名中找不到 8 碼日期 (YYYYMMDD)' })
                continue
            }

            // We need to inject the rawDate into the 0th index of EVERY row before sending to Google Sheets!
            const augmentedDataRows = dataRows.map(row => {
                return [rawDate, ...row]
            })

            // Send payload to Google Apps Script
            const payload = {
                type: type,
                rows: augmentedDataRows
            }

            const res = await fetch(GAS_WEB_APP_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            })

            const gasResponse = await res.json()

            if (gasResponse.success) {
                uploadResults.push({ name: file.name, success: true })
            } else {
                uploadResults.push({ name: file.name, success: false, message: gasResponse.error || '寫入 Google Sheets 失敗' })
            }
        }

        const allSuccess = uploadResults.every(r => r.success)

        if (!allSuccess) {
            return NextResponse.json({
                success: false,
                message: '有檔案上傳失敗',
                results: uploadResults
            }, { status: 400 })
        }

        return NextResponse.json({
            success: true,
            message: '全部檔案已成功寫入 Google Sheets',
            results: uploadResults
        })

    } catch (error) {
        console.error('Upload Error:', error)
        return NextResponse.json({ success: false, message: 'Internal server error during upload' }, { status: 500 })
    }
}
