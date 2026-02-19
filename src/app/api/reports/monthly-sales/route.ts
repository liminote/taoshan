import { NextResponse } from 'next/server'
import { reportCache, CACHE_KEYS } from '@/lib/cache'
import { parseCsv } from '@/lib/csv'

export async function GET() {
  try {
    // 1. 檢查快取
    const cachedData = reportCache.get(CACHE_KEYS.MONTHLY_SALES)
    if (cachedData) {
      const isLegacyCache = Array.isArray(cachedData)
      const data = isLegacyCache ? cachedData : (cachedData as any).trends
      return NextResponse.json({
        success: true,
        data: data,
        lastSalesDate: isLegacyCache ? null : (cachedData as any).lastSalesDate,
        cached: true
      })
    }

    // 2. 獲取資料
    const orderSheetUrl = 'https://docs.google.com/spreadsheets/d/1EWPECWQp_Ehz43Lfks_I8lcvEig8gV9DjyjEIzC5EO4/export?format=csv&gid=0'
    const productSheetUrl = 'https://docs.google.com/spreadsheets/d/1GeRbtCX_oHJBooYvZeRbREaSxJ4r8P8QoL-vHiSz2eo/export?format=csv&gid=0'

    const [orderRes, productRes] = await Promise.all([
      fetch(orderSheetUrl, { cache: 'no-store' }),
      fetch(productSheetUrl, { cache: 'no-store' })
    ])

    const orderCsv = await orderRes.text()
    const productCsv = await productRes.text()

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
        amount: 0,
        orderCount: 0,
        avgOrderValue: 0,
        productItemCount: 0,
        productItems: new Set()
      }
    }

    let latestDate = ''

    // 處理每一行資料
    orderRows.slice(1).forEach(row => {
      const timeStr = row[timeIdx]
      if (!timeStr) return

      const date = new Date(timeStr.replace(/\//g, '-'))
      if (isNaN(date.getTime())) return

      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      if (trends[monthKey]) {
        const rawAmount = row[amountIdx] || '0'
        const cleanAmount = rawAmount.replace(/[^-0-9.]/g, '') // 只保留數字相關字元
        const amt = parseFloat(cleanAmount) || 0

        trends[monthKey].amount += amt
        trends[monthKey].orderCount += 1

        const dateStr = `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`
        if (dateStr > latestDate) latestDate = dateStr
      }
    })

    // 4. 處理商品多樣性
    const productRows = parseCsv(productCsv)
    const pHeaders = productRows[0].map(h => h.trim())
    const pTimeIdx = pHeaders.findIndex(h => h.includes('結帳時間') || h.includes('時間'))
    const pNameIdx = pHeaders.findIndex(h => h.includes('商品名稱') || h.includes('品項'))

    productRows.slice(1).forEach(row => {
      const timeStr = row[pTimeIdx]
      const name = row[pNameIdx]
      if (timeStr && name && trends) {
        const date = new Date(timeStr.replace(/\//g, '-'))
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        if (trends[monthKey]) {
          trends[monthKey].productItems.add(name)
        }
      }
    })

    // 5. 格式化輸出
    const sortedTrends = Object.values(trends)
      .sort((a, b) => b.month.localeCompare(a.month))
      .map(t => ({
        month: t.month,
        monthDisplay: t.monthDisplay,
        amount: Math.round(t.amount),
        orderCount: t.orderCount,
        avgOrderValue: t.orderCount > 0 ? Math.round(t.amount / t.orderCount) : 0,
        productItemCount: t.productItems.size
      }))

    const finalResult = { trends: sortedTrends, lastSalesDate: latestDate }
    reportCache.set(CACHE_KEYS.MONTHLY_SALES, finalResult)

    return NextResponse.json({ success: true, data: sortedTrends, lastSalesDate: latestDate })

  } catch (error) {
    console.error('Monthly Sales API Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
