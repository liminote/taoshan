import { NextResponse } from 'next/server'
import { parseCsv } from '@/lib/csv'
import { getBusinessDateAndPeriod } from '@/lib/dateUtils'

export async function GET(request: Request) {
  try {
    // 獲取月份參數
    const { searchParams } = new URL(request.url)
    const selectedMonth = searchParams.get('month')

    // 讀取商品銷售資料和商品主檔
    const productSheetUrl = 'https://docs.google.com/spreadsheets/d/1GeRbtCX_oHJBooYvZeRbREaSxJ4r8P8QoL-vHiSz2eo/export?format=csv&gid=0'
    const masterSheetUrl = 'https://docs.google.com/spreadsheets/d/18iWZVRT8LB7I_WBNXGPl3WI8S3zEVq5ANq5yTj8Nzd8/export?format=csv&gid=909084406'

    const [productResponse, masterResponse] = await Promise.all([
      fetch(productSheetUrl, { cache: 'no-store' }),
      fetch(masterSheetUrl, { cache: 'no-store' })
    ])

    if (!productResponse.ok || !masterResponse.ok) {
      console.error('無法獲取 Google Sheets 資料')
      return NextResponse.json({ error: '查詢失敗' }, { status: 500 })
    }

    const productCsv = await productResponse.text()
    const masterCsv = await masterResponse.text()

    // 解析商品銷售資料 (使用強健解析器)
    const productRows = parseCsv(productCsv)
    if (productRows.length < 2) {
      return NextResponse.json({ error: '無商品資料' }, { status: 404 })
    }
    const productHeaders = productRows[0].map(h => h.trim().replace(/^"|"$/g, ''))
    const productLines = productRows.slice(1)

    const productNameIndex = productHeaders.findIndex(h => /商品名稱|品項名稱|Product/i.test(h))
    const amountIndex = productHeaders.findIndex(h => /金額|價格|Amount/i.test(h) && !/折扣/i.test(h)) // 避免誤判折扣金額
    const checkoutTimeIndex = productHeaders.findIndex(h => /結帳時間|Time/i.test(h))

    let productSales = productLines.map(values => {
      // 移除金額中的逗號
      const amountStr = (values[amountIndex] || '0').replace(/,/g, '')
      return {
        productName: values[productNameIndex] || '',
        amount: parseFloat(amountStr) || 0,
        checkoutTime: values[checkoutTimeIndex] || ''
      }
    }).filter(record => record.productName && record.amount > 0)

    // 如果有月份參數，篩選該月份的商品銷售資料
    if (selectedMonth) {
      productSales = productSales.filter(record => {
        if (!record.checkoutTime) return false

        const businessInfo = getBusinessDateAndPeriod(record.checkoutTime)
        if (!businessInfo) return false

        return businessInfo.businessMonthKey === selectedMonth
      })
    }

    // 解析商品主檔
    const masterRows = parseCsv(masterCsv)
    const masterHeaders = masterRows.length > 0 ? masterRows[0].map(h => h.trim().replace(/^"|"$/g, '')) : []
    const masterLines = masterRows.slice(1)

    const masterNameIndex = masterHeaders.findIndex(h => /商品名稱|Name/i.test(h) && !/新/i.test(h))
    const newNameIndex = masterHeaders.findIndex(h => /新商品名稱|New/i.test(h))
    const categoryIndex = masterHeaders.findIndex(h => /大分類|Category/i.test(h))

    // 建立商品名稱對應表（同時支援原始名稱和新商品名稱）
    const productMapping: { [key: string]: string } = {}

    if (masterNameIndex !== -1 && categoryIndex !== -1) {
      masterLines.forEach(values => {
        const productName = (values[masterNameIndex] || '').trim()
        const newProductName = (values[newNameIndex] || '').trim()
        let category = (values[categoryIndex] || '').trim()

        if (!category) category = '未分類'

        if (productName) productMapping[productName] = category
        if (newProductName && newProductName !== productName) productMapping[newProductName] = category
      })
    }

    console.log(`建立 ${Object.keys(productMapping).length} 個商品對應關係`)
    console.log(`處理 ${productSales.length} 筆商品銷售資料${selectedMonth ? `（篩選月份：${selectedMonth}）` : ''}`)

    // 按大分類統計金額
    const categoryStats: { [key: string]: number } = {}
    let totalAmount = 0
    let matchedCount = 0
    const unmatchedProducts: string[] = []

    productSales.forEach((record) => {
      // 嘗試去除括號後的名稱比對 (有的商品會有 (熱) (冷))
      let cleanName = record.productName.trim()
      let category = productMapping[cleanName]

      if (!category) {
        // 如果完全比對不到，試試看去除括號
        const baseName = cleanName.replace(/\(.*\)/g, '').trim()
        category = productMapping[baseName]
      }

      if (!category) category = '未分類'
      else matchedCount++

      if (category === '未分類' && !productMapping[cleanName]) {
        unmatchedProducts.push(cleanName)
      }

      if (!categoryStats[category]) {
        categoryStats[category] = 0
      }

      categoryStats[category] += record.amount
      totalAmount += record.amount
    })

    console.log(`成功比對: ${matchedCount} 筆，未比對: ${unmatchedProducts.length} 筆`)

    // 轉換為陣列格式並計算百分比
    const result = Object.entries(categoryStats)
      .map(([category, amount]) => ({
        category: category,
        amount: Math.round(amount),
        percentage: totalAmount > 0 ? Math.round((amount / totalAmount) * 1000) / 10 : 0
      }))
      .sort((a, b) => b.amount - a.amount) // 按金額排序，最高在前

    return NextResponse.json({
      success: true,
      data: result
    })

  } catch (error) {
    console.error('處理分類分布報表時發生錯誤:', error)
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 })
  }
}