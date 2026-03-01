import { NextResponse } from 'next/server'
import { reportCache, CACHE_KEYS } from '@/lib/cache'
import { parseCsv } from '@/lib/csv'
import { getBusinessDateAndPeriod } from '@/lib/dateUtils'

export async function GET() {
    try {
        // 1. 檢查快取
        // 這裡我們我們需要新的 Cache Key，但沒有直接定義在 CACHE_KEYS 也可以先用字串
        const cacheKey = 'time_periods_sales'
        const cachedData = reportCache.get(cacheKey)
        if (cachedData) {
            return NextResponse.json({
                success: true,
                data: (cachedData as any).trends,
                lastSalesDate: (cachedData as any).lastSalesDate,
                cached: true
            })
        }

        // 2. 獲取資料
        const orderSheetUrl = 'https://docs.google.com/spreadsheets/d/1EWPECWQp_Ehz43Lfks_I8lcvEig8gV9DjyjEIzC5EO4/export?format=csv&gid=0'

        const orderRes = await fetch(orderSheetUrl, { cache: 'no-store' })
        const orderCsv = await orderRes.text()

        // 3. 解析訂單
        const orderRows = parseCsv(orderCsv)
        if (orderRows.length < 1) throw new Error('無法讀取訂單資料')

        const orderHeaders = orderRows[0].map(h => h.trim())

        // 超強健欄位搜尋
        const findIndexByNames = (names: string[]) => {
            for (const name of names) {
                const idx = orderHeaders.findIndex(h => h.includes(name))
                if (idx !== -1) return idx
            }
            return -1
        }

        const timeIdx = findIndexByNames(['結帳時間', '發票時間', '時間'])
        const amountIdx = findIndexByNames(['發票金額', '結帳金額', '總計', '金額'])

        if (timeIdx === -1 || amountIdx === -1) {
            console.error('CRITICAL: 找不到必要欄位', { orderHeaders, timeIdx, amountIdx })
            return NextResponse.json({ error: 'Data error' }, { status: 500 })
        }

        // 初始化 13 個月
        const trends: Record<string, any> = {}
        const now = new Date()
        for (let i = 0; i < 13; i++) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
            trends[key] = {
                month: key,
                monthDisplay: `${key.replace('-', '年')}月`,
                regular: { amount: 0, orderCount: 0 },
                nightOwl: { amount: 0, orderCount: 0 }
            }
        }

        let latestDate = ''

        // 處理每一行資料
        orderRows.slice(1).forEach(row => {
            const timeStr = row[timeIdx]
            if (!timeStr) return

            const businessInfo = getBusinessDateAndPeriod(timeStr)
            if (!businessInfo) return

            const monthKey = businessInfo.businessMonthKey
            if (trends[monthKey]) {
                const rawAmount = row[amountIdx] || '0'
                const cleanAmount = rawAmount.replace(/[^-0-9.]/g, '') // 只保留數字相關字元
                const amt = parseFloat(cleanAmount) || 0

                if (businessInfo.isNightOwl) {
                    trends[monthKey].nightOwl.amount += amt
                    trends[monthKey].nightOwl.orderCount += 1
                } else {
                    trends[monthKey].regular.amount += amt
                    trends[monthKey].regular.orderCount += 1
                }

                const bd = businessInfo.businessDate
                const dateStr = `${bd.getFullYear()}/${String(bd.getMonth() + 1).padStart(2, '0')}/${String(bd.getDate()).padStart(2, '0')}`
                if (dateStr > latestDate) latestDate = dateStr
            }
        })

        // 4. 格式化輸出
        const sortedTrends = Object.values(trends)
            .sort((a, b) => b.month.localeCompare(a.month)) // 新到舊
            .map(t => ({
                month: t.month,
                monthDisplay: t.monthDisplay,
                regular: {
                    amount: Math.round(t.regular.amount),
                    orderCount: t.regular.orderCount,
                    avgOrderValue: t.regular.orderCount > 0 ? Math.round(t.regular.amount / t.regular.orderCount) : 0
                },
                nightOwl: {
                    amount: Math.round(t.nightOwl.amount),
                    orderCount: t.nightOwl.orderCount,
                    avgOrderValue: t.nightOwl.orderCount > 0 ? Math.round(t.nightOwl.amount / t.nightOwl.orderCount) : 0
                }
            }))

        const finalResult = { trends: sortedTrends, lastSalesDate: latestDate }
        reportCache.set(cacheKey, finalResult)

        return NextResponse.json({ success: true, data: sortedTrends, lastSalesDate: latestDate })

    } catch (error) {
        console.error('Time Periods API Error:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
