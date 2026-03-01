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
        const combinedPayload: { cards?: any[], points?: any[] } = {}

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

            if (rows.length < 2) {
                uploadResults.push({ name: file.name, success: false, message: '檔案內容過短或空白' })
                continue
            }

            const dataRows = rows.slice(1).filter(row => row.length > 0 && row.some(cell => cell.trim() !== ''))

            if (dataRows.length === 0) {
                uploadResults.push({ name: file.name, success: false, message: '檔案內沒有有效數據' })
                continue
            }

            const dateMatch = file.name.match(/(\d{8})/)
            const rawDate = dateMatch ? dateMatch[0] : ''

            if (!rawDate) {
                uploadResults.push({ name: file.name, success: false, message: '檔名中找不到 8 碼日期 (YYYYMMDD)' })
                continue
            }

            const augmentedDataRows = dataRows.map(row => {
                return [rawDate, ...row]
            })

            if (type === 'cards') {
                if (!combinedPayload.cards) combinedPayload.cards = []
                combinedPayload.cards.push(...augmentedDataRows)
            } else if (type === 'points') {
                if (!combinedPayload.points) combinedPayload.points = []
                combinedPayload.points.push(...augmentedDataRows)
            }

            uploadResults.push({ name: file.name, success: true })
        }

        // If we have anything to send, make exactly one request to GAS to avoid race conditions/locks
        if (combinedPayload.cards?.length || combinedPayload.points?.length) {
            console.log('Sending payload to GAS:', JSON.stringify({
                cardsCount: combinedPayload.cards?.length || 0,
                pointsCount: combinedPayload.points?.length || 0
            }))

            try {
                // Google Apps Script requires following redirects for POST Web Apps
                const res = await fetch(GAS_WEB_APP_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(combinedPayload),
                    redirect: 'follow'
                })

                console.log('GAS Response Status:', res.status, res.statusText)
                const textOutput = await res.text()
                console.log('GAS Raw Text:', textOutput)

                let gasResponse;
                try {
                    gasResponse = JSON.parse(textOutput)
                } catch (e) {
                    throw new Error(`Failed to parse GAS response: ${textOutput}`)
                }

                if (!gasResponse.success) {
                    uploadResults.forEach(r => {
                        if (r.success) {
                            r.success = false;
                            r.message = gasResponse.error || '寫入 Google Sheets 失敗';
                        }
                    })
                }
            } catch (err: any) {
                console.error('Fetch to GAS failed:', err)
                uploadResults.forEach(r => {
                    if (r.success) {
                        r.success = false;
                        r.message = '與 Google Apps Script 連線失敗: ' + err.message;
                    }
                })
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
