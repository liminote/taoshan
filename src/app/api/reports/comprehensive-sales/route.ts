import { NextResponse, NextRequest } from 'next/server'
import { reportCache, CACHE_KEYS } from '@/lib/cache'
import { parseCsv } from '@/lib/csv'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const month = searchParams.get('month') || new Date().toISOString().slice(0, 7)

    // 檢查快取
    const cacheKey = `${CACHE_KEYS.COMPREHENSIVE_SALES}_${month}`
    const cachedData = reportCache.get(cacheKey)
    if (cachedData) {
      return NextResponse.json(cachedData)
    }

    // 獲取資料
    const orderSheetUrl = 'https://docs.google.com/spreadsheets/d/1EWPECWQp_Ehz43Lfks_I8lcvEig8gV9DjyjEIzC5EO4/export?format=csv&gid=0'
    const productSheetUrl = 'https://docs.google.com/spreadsheets/d/1GeRbtCX_oHJBooYvZeRbREaSxJ4r8P8QoL-vHiSz2eo/export?format=csv&gid=0'

    const [orderRes, productRes] = await Promise.all([
      fetch(orderSheetUrl, { cache: 'no-store' }),
      fetch(productSheetUrl, { cache: 'no-store' })
    ])

    const orderCsv = await orderRes.text()
    const productCsv = await productRes.text()

    // 1. 解析訂單 (主要數據)
    const orderRows = parseCsv(orderCsv)
    const oHeaders = orderRows[0].map(h => h.trim())
    const oTimeIdx = oHeaders.findIndex(h => /結帳時間|時間/.test(h))
    const oAmtIdx = oHeaders.findIndex(h => /發票金額|結帳金額|金額/.test(h))
    const oSourceIdx = oHeaders.findIndex(h => /訂單來源/.test(h))
    const oPaymentIdx = oHeaders.findIndex(h => /支付模組|付款資訊/.test(h))

    const filteredOrders = orderRows.slice(1).filter(row => {
      const time = row[oTimeIdx]
      if (!time) return false
      const rowMonth = time.replace(/\//g, '-').slice(0, 7)
      return rowMonth === month
    })

    // 2. 解析商品銷售 (品項數據)
    const productRows = parseCsv(productCsv)
    const pHeaders = productRows[0].map(h => h.trim())
    const pTimeIdx = pHeaders.findIndex(h => /結帳時間|時間/.test(h))
    const pNameIdx = pHeaders.findIndex(h => /商品名稱|品項名稱/.test(h))
    const pAmtIdx = pHeaders.findIndex(h => /發票金額|結帳金額|金額/.test(h))

    const filteredProducts = productRows.slice(1).filter(row => {
      const time = row[pTimeIdx]
      if (!time) return false
      const rowMonth = time.replace(/\//g, '-').slice(0, 7)
      return rowMonth === month
    })

    // 3. 計算統計
    let totalRevenue = 0
    let totalProductsSold = 0
    const productItemSet = new Set<string>()

    filteredProducts.forEach(row => {
      const rawAmt = row[pAmtIdx] || '0'
      const amt = parseFloat(rawAmt.replace(/[^-0-9.]/g, '')) || 0
      totalRevenue += amt
      totalProductsSold += 1
      if (row[pNameIdx]) productItemSet.add(row[pNameIdx])
    })

    const sourceAnalysis = filteredOrders.reduce((acc: any, row) => {
      const source = row[oSourceIdx] || '未知'
      acc[source] = (acc[source] || 0) + 1
      return acc
    }, {})

    const paymentAnalysis = filteredOrders.reduce((acc: any, row) => {
      const p = row[oPaymentIdx] || '未知'
      const key = p.split('(')[0].trim() || '未知'
      acc[key] = (acc[key] || 0) + 1
      return acc
    }, {})

    const result = {
      summary: {
        totalOrders: filteredOrders.length,
        totalProducts: totalProductsSold,
        totalRevenue: Math.round(totalRevenue),
        averageOrderValue: filteredOrders.length > 0 ? Math.round(totalRevenue / filteredOrders.length) : 0,
        distinctProductCount: productItemSet.size
      },
      analysis: {
        sourceAnalysis,
        paymentAnalysis,
        topProducts: [], // 暫時留空，或之後補上
        trendData: []
      },
      period: { month }
    }

    reportCache.set(cacheKey, result)
    return NextResponse.json(result)

  } catch (error) {
    console.error('Comprehensive Sales API Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}