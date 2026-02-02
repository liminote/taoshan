import { NextResponse } from 'next/server'
import { parseCsv } from '@/lib/csv'
import fs from 'fs'
import path from 'path'

const SKILL_DIR = path.join(process.cwd(), 'skills', 'reward_cards')

const ORDER_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1EWPECWQp_Ehz43Lfks_I8lcvEig8gV9DjyjEIzC5EO4/export?format=csv&gid=0'

function getInterval(fileDate: Date) {
    const day = fileDate.getDate();
    const year = fileDate.getFullYear();
    const month = fileDate.getMonth();

    if (day >= 25 || day <= 5) {
        const intervalMonthDate = day <= 5 ? new Date(year, month - 1, 1) : new Date(year, month, 1);
        const iYear = intervalMonthDate.getFullYear();
        const iMonth = intervalMonthDate.getMonth();
        const start = new Date(iYear, iMonth, 16, 0, 0, 0);
        const end = new Date(iYear, iMonth + 1, 0, 23, 59, 59);
        return { start, end };
    } else if (day >= 10 && day <= 20) {
        const start = new Date(year, month, 1, 0, 0, 0);
        const end = new Date(year, month, 15, 23, 59, 59);
        return { start, end };
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

        const cardData: any[] = []
        const rawPointData: any[] = []

        for (const file of files) {
            if (!file.endsWith('.csv')) continue

            const filePath = path.join(SKILL_DIR, file)
            const content = fs.readFileSync(filePath, 'utf-8')
            const rows = parseCsv(content)

            if (rows.length < 2) continue

            const headers = rows[0].map(h => h.trim())
            const dataRows = rows.slice(1)

            // Extract date from filename rewardcards_stats_xxx_YYYYMMDD.csv
            const dateMatch = file.match(/(\d{8})/)
            const dateStr = dateMatch ? dateMatch[0] : ''
            const cy = dateStr.slice(0, 4)
            const cm = dateStr.slice(4, 6)
            const cd = dateStr.slice(6, 8)
            const formattedDate = dateStr ? `${cy}/${cm}/${cd}` : 'Unknown'
            const fileDate = dateStr ? new Date(`${cy}-${cm}-${cd}`) : null

            if (file.includes('_cards_')) {
                dataRows.forEach(row => {
                    const record: any = { date: formattedDate, originalFile: file }
                    headers.forEach((header, index) => {
                        record[header] = row[index] || ''
                    })

                    // Calculate A: Usage Rate (vouchersUsed / vouchersAwarded)
                    const awarded = parseFloat(record.vouchersAwarded) || 0
                    const used = parseFloat(record.vouchersUsed) || 0
                    record.usageRate = awarded > 0 ? (used / awarded) : 0

                    // Calculate B: Tue-Thu Orders in Interval
                    let tueThuOrders = 0
                    if (fileDate) {
                        const interval = getInterval(fileDate)
                        if (interval) {
                            tueThuOrders = allOrders.filter(o => {
                                return o.date >= interval.start &&
                                    o.date <= interval.end &&
                                    (o.day === 2 || o.day === 3 || o.day === 4)
                            }).length
                        }
                    }
                    record.tueThuOrders = tueThuOrders

                    // Calculate C: Inflow Rate (vouchersAwarded / tueThuOrders)
                    record.inflowRate = tueThuOrders > 0 ? (awarded / tueThuOrders) : 0

                    cardData.push(record)
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

        // Sort Card Data: newest date first
        cardData.sort((a, b) => b.date.localeCompare(a.date))

        // Sort Point Data: newest date first
        rawPointData.sort((a, b) => b.date.localeCompare(a.date))

        return NextResponse.json({
            success: true,
            cardHistory: cardData,
            pointHistory: rawPointData
        })

    } catch (error) {
        console.error('Error fetching reward card stats:', error)
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 })
    }
}
