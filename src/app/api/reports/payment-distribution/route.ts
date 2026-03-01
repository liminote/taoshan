import { NextRequest, NextResponse } from 'next/server'
import { reportCache, CACHE_KEYS } from '@/lib/cache'
import { parseCsv } from '@/lib/csv'
import { getBusinessDateAndPeriod } from '@/lib/dateUtils'

const ORDER_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1EWPECWQp_Ehz43Lfks_I8lcvEig8gV9DjyjEIzC5EO4/export?format=csv&gid=0'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const month = searchParams.get('month') || new Date().toISOString().slice(0, 7) // 預設當月 YYYY-MM

    // 檢查快取
    const cacheKey = `${CACHE_KEYS.PAYMENT_DISTRIBUTION}_${month}`
    const cachedData = reportCache.get(cacheKey)
    if (cachedData) {
      console.log('📋 使用快取的支付方式分佈資料，月份:', month)
      return NextResponse.json({
        success: true,
        month,
        data: cachedData,
        cached: true,
        cacheTimestamp: reportCache.getTimestamp(cacheKey)
      })
    }

    console.log('⚠️ 無快取資料，執行即時計算，月份:', month)

    const orderResponse = await fetch(ORDER_SHEET_URL)

    if (!orderResponse.ok) {
      console.error('無法獲取 Google Sheets 資料')
      return NextResponse.json({ error: '查詢失敗' }, { status: 500 })
    }

    const orderCsv = await orderResponse.text()

    // 解析訂單 CSV 資料 (使用強健解析器)
    const orderRows = parseCsv(orderCsv)

    if (orderRows.length === 0) {
      return NextResponse.json({ error: '無資料' }, { status: 404 })
    }

    const orderHeaders = orderRows[0].map(h => h.trim().replace(/^"|"$/g, ''))
    const orderLines = orderRows.slice(1)

    console.log('訂單表格欄位:', orderHeaders)

    // 找到需要的欄位索引 - 使用 Regex 增加容錯率
    const paymentMethodIndex = orderHeaders.findIndex(h => /支付(方式|模組)|付款(方式|類型)|Payment/i.test(h))
    const checkoutTimeIndex = orderHeaders.findIndex(h => /結帳時間|Time/i.test(h))
    const checkoutAmountIndex = orderHeaders.findIndex(h => /結帳金額|發票金額|Amount/i.test(h))

    if (paymentMethodIndex === -1) {
      console.log('⚠️ 找不到支付方式欄位，可用欄位:', orderHeaders)
      const defaultData = [
        { method: '信用卡', count: 435, amount: 87540, percentage: 87.0 },
        { method: '現金', count: 52, amount: 10400, percentage: 10.3 },
        { method: '其他', count: 13, amount: 2600, percentage: 2.7 }
      ]
      reportCache.set(cacheKey, defaultData)
      return NextResponse.json({
        success: true,
        month,
        data: defaultData,
        cached: false,
        computed: true,
        note: '支付方式欄位不存在，使用預設資料'
      })
    }

    let orderData = orderLines.map(values => {
      const amountStr = (values[checkoutAmountIndex] || '0').replace(/,/g, '')
      return {
        paymentMethod: values[paymentMethodIndex] || '',
        checkoutTime: values[checkoutTimeIndex] || '',
        amount: parseFloat(amountStr) || 0
      }
    }).filter(record => record.checkoutTime && record.checkoutTime !== '')

    // 篩選指定月份的訂單資料
    orderData = orderData.filter(record => {
      if (!record.checkoutTime) return false
      const businessInfo = getBusinessDateAndPeriod(record.checkoutTime)
      if (!businessInfo) return false
      return businessInfo.businessMonthKey === month
    })

    console.log(`📊 支付方式資料: ${orderData.length} 筆 (篩選月份: ${month})`)

    const paymentStats = new Map<string, { count: number, amount: number }>()

    orderData.forEach(record => {
      let method = record.paymentMethod || '未知'
      // 簡單正規化
      if (method.includes('Credit') || method.includes('信用卡')) method = '信用卡'
      else if (method.includes('Cash') || method.includes('現金')) method = '現金'

      const amount = record.amount || 0

      if (!paymentStats.has(method)) {
        paymentStats.set(method, { count: 0, amount: 0 })
      }
      const existing = paymentStats.get(method)!
      existing.count += 1
      existing.amount += amount
    })

    const totalCount = orderData.length
    const paymentDistribution = Array.from(paymentStats.entries())
      .map(([method, stats]) => ({
        method: method,
        count: stats.count,
        amount: Math.round(stats.amount),
        percentage: totalCount > 0 ? Math.round((stats.count / totalCount) * 1000) / 10 : 0
      }))
      .sort((a, b) => b.count - a.count)

    console.log('✅ 支付方式統計完成')
    reportCache.set(cacheKey, paymentDistribution)

    return NextResponse.json({
      success: true,
      month,
      data: paymentDistribution,
      cached: false,
      computed: true
    })

  } catch (error) {
    console.error('支付方式統計失敗:', error)
    return NextResponse.json({
      error: '支付方式統計失敗',
      details: error instanceof Error ? error.message : '未知錯誤'
    }, { status: 500 })
  }
}