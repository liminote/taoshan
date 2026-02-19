import { NextResponse } from 'next/server'
import { parseCsv } from '@/lib/csv'

const REWARD_CARDS_URL = 'https://docs.google.com/spreadsheets/d/1EWPECWQp_Ehz43Lfks_I8lcvEig8gV9DjyjEIzC5EO4/export?format=csv&gid=1365932888'
const REWARD_POINTS_URL = 'https://docs.google.com/spreadsheets/d/1EWPECWQp_Ehz43Lfks_I8lcvEig8gV9DjyjEIzC5EO4/export?format=csv&gid=995416755'
const ORDER_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1EWPECWQp_Ehz43Lfks_I8lcvEig8gV9DjyjEIzC5EO4/export?format=csv&gid=0'

/**
 * Strict Period Mapping logic
 */
function getPeriodInfo(dateStr: string) {
    const y = parseInt(dateStr.slice(0, 4));
    const m = parseInt(dateStr.slice(4, 6)) - 1;
    const d = parseInt(dateStr.slice(6, 8));
    const fileDate = new Date(y, m, d);

    const day = fileDate.getDate();
    const year = fileDate.getFullYear();
    const month = fileDate.getMonth();

    if (day >= 28 || day <= 5) {
        const tDate = day <= 5 ? new Date(year, month - 1, 1) : new Date(year, month, 1);
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
    if (day >= 13 && day <= 20) {
        const start = new Date(year, month, 1, 0, 0, 0);
        const end = new Date(year, month, 15, 23, 59, 59);
        return {
            type: 'Upper',
            start,
            end,
            label: `${year}/${String(month + 1).padStart(2, '0')} 上半月`
        };
    }
    return { type: 'Other', label: `${year}/${String(month + 1).padStart(2, '0')}/${day}`, start: fileDate, end: fileDate };
}

export async function GET() {
    try {
        // 1. Fetch data from Google Sheets instead of local files
        const [cardRes, pointRes, orderRes] = await Promise.all([
            fetch(REWARD_CARDS_URL, { cache: 'no-store' }),
            fetch(REWARD_POINTS_URL, { cache: 'no-store' }),
            fetch(ORDER_SHEET_URL, { cache: 'no-store' })
        ])

        const cardCsv = await cardRes.text()
        const pointCsv = await pointRes.text()
        const orderCsv = await orderRes.text()

        const cardRows = parseCsv(cardCsv)
        const pointRows = parseCsv(pointCsv)
        const orderRows = parseCsv(orderCsv)

        // Process Orders for Inflow Rate (Tue-Thu)
        let allOrders: { date: Date, day: number }[] = []
        if (orderRows.length > 1) {
            const h = orderRows[0].map(s => s.trim())
            const tIdx = h.findIndex(s => /時間|結帳時間/.test(s))
            allOrders = orderRows.slice(1).map(r => {
                const d = new Date(r[tIdx]?.replace(/\//g, '-'))
                return { date: d, day: d.getDay() }
            }).filter(o => !isNaN(o.date.getTime()))
        }

        // Process Cards
        const rawCardData: any[] = []
        if (cardRows.length > 1) {
            const h = cardRows[0].map(s => s.trim())
            cardRows.slice(1).forEach(row => {
                const dateStr = row[0] // Data_Date
                const record: any = { date: `${dateStr.slice(0, 4)}/${dateStr.slice(4, 6)}/${dateStr.slice(6, 8)}`, fileDateStr: dateStr }
                h.forEach((header, i) => { record[header] = row[i] })
                rawCardData.push(record)
            })
        }

        // Process Points
        const rawPointData: any[] = []
        if (pointRows.length > 1) {
            const h = pointRows[0].map(s => s.trim())
            // Group by Data_Date
            const groups: Record<string, any> = {}
            pointRows.slice(1).forEach(row => {
                const dateStr = row[0]
                if (!groups[dateStr]) groups[dateStr] = { date: `${dateStr.slice(0, 4)}/${dateStr.slice(4, 6)}/${dateStr.slice(6, 8)}` }
                const p = row[1] // point
                const u = row[2] // users
                groups[dateStr][`p${p}`] = u
            })
            Object.values(groups).forEach(g => rawPointData.push(g))
        }

        // Calculate Deltas and Rates
        const enhancedCardData: any[] = []
        const cardGroups: Record<string, any[]> = {}
        rawCardData.forEach(r => {
            const n = r.name || 'Unknown'
            if (!cardGroups[n]) cardGroups[n] = []
            cardGroups[n].push(r)
        })

        Object.keys(cardGroups).forEach(name => {
            const group = cardGroups[name].sort((a, b) => a.fileDateStr.localeCompare(b.fileDateStr))
            for (let i = 0; i < group.length; i++) {
                const current = group[i]
                const previous = i > 0 ? group[i - 1] : null

                const currAwarded = parseFloat(current.vouchersAwarded) || 0
                const prevAwarded = previous ? (parseFloat(previous.vouchersAwarded) || 0) : 0
                const currUsed = parseFloat(current.vouchersUsed) || 0
                const prevUsed = previous ? (parseFloat(previous.vouchersUsed) || 0) : 0

                current.newVouchersAwarded = Math.max(0, currAwarded - prevAwarded)
                current.newVouchersUsed = Math.max(0, currUsed - prevUsed)
                current.usageRate = current.newVouchersAwarded > 0 ? (current.newVouchersUsed / current.newVouchersAwarded) : 0

                const period = getPeriodInfo(current.fileDateStr)
                current.periodLabel = period.label

                const tueThuOrders = allOrders.filter(o => {
                    return o.date >= period.start && o.date <= period.end && (o.day === 2 || o.day === 3 || o.day === 4)
                }).length

                current.tueThuOrders = tueThuOrders
                current.inflowRate = tueThuOrders > 0 ? (current.newVouchersAwarded / tueThuOrders) : 0
                enhancedCardData.push(current)
            }
        })

        enhancedCardData.sort((a, b) => b.fileDateStr.localeCompare(a.fileDateStr))
        rawPointData.sort((a, b) => (b as any).date.localeCompare((a as any).date))

        return NextResponse.json({
            success: true,
            cardHistory: enhancedCardData,
            pointHistory: rawPointData
        })

    } catch (error) {
        console.error('Reward Cards API Error:', error)
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 })
    }
}
