import { NextResponse } from 'next/server'
import { parseCsv } from '@/lib/csv'
import fs from 'fs'
import path from 'path'

const SKILL_DIR = path.join(process.cwd(), 'skills', 'reward_cards')

const ORDER_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1EWPECWQp_Ehz43Lfks_I8lcvEig8gV9DjyjEIzC5EO4/export?format=csv&gid=0'

/**
 * Strict Period Mapping:
 * - File Date 15~18th -> Upper Half (1st-15th of the same month)
 * - File Date 28~2nd -> Lower Half (16th-End of the month)
 */
function getPeriodInfo(fileDate: Date) {
    const day = fileDate.getDate();
    const year = fileDate.getFullYear();
    const month = fileDate.getMonth();

    // Lower Half (16th-End): triggered by files dated 28th to 2nd of next month
    if (day >= 28 || day <= 2) {
        // If day <= 2, it's the beginning of next month, so target month is month - 1
        const tDate = day <= 2 ? new Date(year, month - 1, 1) : new Date(year, month, 1);
        const tYear = tDate.getFullYear();
        const tMonth = tDate.getMonth();
        const start = new Date(tYear, tMonth, 16, 0, 0, 0);
        const end = new Date(tYear, tMonth + 1, 0, 23, 59, 59);
        return {
            type: 'Lower',
            start,
            end,
            label: `${tYear}/${String(tMonth + 1).padStart(2, '0')} 下半月`
        };
    }
    // Upper Half (1st-15th): triggered by files dated 15th to 18th
    if (day >= 15 && day <= 18) {
        const start = new Date(year, month, 1, 0, 0, 0);
        const end = new Date(year, month, 15, 23, 59, 59);
        return {
            type: 'Upper',
            start,
            end,
            label: `${year}/${String(month + 1).padStart(2, '0')} 上半月`
        };
    }
    return null;
}

export async function GET() {
    try {
        if (!fs.existsSync(SKILL_DIR)) {
            return NextResponse.json({ success: true, cardHistory: [], pointHistory: [] })
        }

        // 1. Fetch Orders for Tue-Thu count
        let allOrders: { date: Date, day: number }[] = []
        try {
            const orderResponse = await fetch(ORDER_SHEET_URL)
            if (orderResponse.ok) {
                const orderCsv = await orderResponse.text()
                const orderRows = parseCsv(orderCsv)
                if (orderRows.length > 1) {
                    const headers = orderRows[0].map(h => h.trim())
                    const timeIdx = headers.findIndex(h => h.includes('結帳時間'))
                    if (timeIdx !== -1) {
                        allOrders = orderRows.slice(1).map(row => {
                            const timeStr = row[timeIdx]?.replace(/\//g, '-')
                            const date = new Date(timeStr)
                            return { date, day: date.getDay() }
                        }).filter(o => !isNaN(o.date.getTime()))
                    }
                }
            }
        } catch (err) {
            console.error('Failed to fetch orders for metrics:', err)
        }

        const files = fs.readdirSync(SKILL_DIR)

        const rawCardData: any[] = []
        const rawPointData: any[] = []

        for (const file of files) {
            if (!file.endsWith('.csv')) continue

            const filePath = path.join(SKILL_DIR, file)
            const content = fs.readFileSync(filePath, 'utf-8')
            const rows = parseCsv(content)

            if (rows.length < 2) continue

            const headers = rows[0].map(h => h.trim())
            const dataRows = rows.slice(1)

            const dateMatch = file.match(/(\d{8})/)
            const dateStr = dateMatch ? dateMatch[0] : ''
            const cy = dateStr.slice(0, 4)
            const cm = dateStr.slice(4, 6)
            const cd = dateStr.slice(6, 8)
            const fileDate = dateStr ? new Date(`${cy}-${cm}-${cd}`) : null
            const formattedDate = dateStr ? `${cy}/${cm}/${cd}` : 'Unknown'

            if (file.includes('_cards_')) {
                dataRows.forEach(row => {
                    const record: any = { date: formattedDate, fileDate, originalFile: file }
                    headers.forEach((header, index) => {
                        record[header] = row[index] || ''
                    })
                    rawCardData.push(record)
                })
            } else if (file.includes('_points_')) {
                const pointMap: { [key: string]: string } = { date: formattedDate }
                dataRows.forEach(row => {
                    const point = row[headers.indexOf('point')]
                    const users = row[headers.indexOf('users')]
                    if (point !== undefined && users !== undefined) {
                        pointMap[`p${point}`] = users
                    }
                })
                rawPointData.push(pointMap)
            }
        }

        // 2. Process Deltas for Card Data (New in Period)
        // Group by Name to calculate deltas correctly
        const cardGroups: { [name: string]: any[] } = {}
        rawCardData.forEach(record => {
            const name = record.name || 'Unknown'
            if (!cardGroups[name]) cardGroups[name] = []
            cardGroups[name].push(record)
        })

        const enhancedCardData: any[] = []

        Object.keys(cardGroups).forEach(name => {
            // Sort by fileDate ascending to find "previous" snapshots
            const group = cardGroups[name].sort((a, b) => (a.fileDate?.getTime() || 0) - (b.fileDate?.getTime() || 0))

            for (let i = 0; i < group.length; i++) {
                const current = group[i]
                const previous = i > 0 ? group[i - 1] : null

                const currAwarded = parseFloat(current.vouchersAwarded) || 0
                const prevAwarded = previous ? (parseFloat(previous.vouchersAwarded) || 0) : 0
                const currUsed = parseFloat(current.vouchersUsed) || 0
                const prevUsed = previous ? (parseFloat(previous.vouchersUsed) || 0) : 0

                // C: New In-Period Awarded
                const newAwarded = currAwarded - prevAwarded
                current.newVouchersAwarded = Math.max(0, newAwarded) // Avoid negatives due to deletions/corrections

                // New In-Period Used
                const newUsed = currUsed - prevUsed
                current.newVouchersUsed = Math.max(0, newUsed)

                // A: Usage Rate (Delta Used / Delta Awarded)
                // If newAwarded is 0, we can't calculate a period rate easily, maybe fallback to snapshot or 0
                current.usageRate = current.newVouchersAwarded > 0
                    ? (current.newVouchersUsed / current.newVouchersAwarded)
                    : 0

                // B & Period Meta
                let tueThuOrders = 0
                let periodLabel = '未知區間'
                if (current.fileDate) {
                    const period = getPeriodInfo(current.fileDate)
                    if (period) {
                        periodLabel = period.label
                        tueThuOrders = allOrders.filter(o => {
                            return o.date >= period.start &&
                                o.date <= period.end &&
                                (o.day === 2 || o.day === 3 || o.day === 4)
                        }).length
                    }
                }
                current.periodLabel = periodLabel
                current.tueThuOrders = tueThuOrders

                // C: Inflow Rate (New Awarded / Tue-Thu Orders)
                current.inflowRate = tueThuOrders > 0 ? (current.newVouchersAwarded / tueThuOrders) : 0

                enhancedCardData.push(current)
            }
        })

        // Sort descending by date (newest first)
        enhancedCardData.sort((a, b) => b.date.localeCompare(a.date))
        rawPointData.sort((a, b) => b.date.localeCompare(a.date))

        return NextResponse.json({
            success: true,
            cardHistory: enhancedCardData,
            pointHistory: rawPointData
        })

    } catch (error) {
        console.error('Error fetching reward card stats:', error)
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 })
    }
}
