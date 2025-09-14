import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    // 獲取參數
    const { searchParams } = new URL(request.url)
    const categoryFilter = searchParams.get('category') // 大分類或小分類
    const type = searchParams.get('type') || 'small' // 'big' 或 'small'
    const selectedMonth = searchParams.get('month')

    if (!categoryFilter) {
      return NextResponse.json({ error: '請提供分類參數' }, { status: 400 })
    }

    // 讀取商品銷售資料和商品主檔
    const productSheetUrl = 'https://docs.google.com/spreadsheets/d/1GeRbtCX_oHJBooYvZeRbREaSxJ4r8P8QoL-vHiSz2eo/export?format=csv&gid=0'
    const masterSheetUrl = 'https://docs.google.com/spreadsheets/d/18iWZVRT8LB7I_WBNXGPl3WI8S3zEVq5ANq5yTj8Nzd8/export?format=csv&gid=909084406'

    const [productResponse, masterResponse] = await Promise.all([
      fetch(productSheetUrl),
      fetch(masterSheetUrl)
    ])

    if (!productResponse.ok || !masterResponse.ok) {
      console.error('無法獲取 Google Sheets 資料')
      return NextResponse.json({ error: '查詢失敗' }, { status: 500 })
    }

    const productCsv = await productResponse.text()
    const masterCsv = await masterResponse.text()

    // 解析商品銷售資料
    const productLines = productCsv.split('\n').filter(line => line.trim())
    const productHeaders = productLines[0].split(',').map(h => h.replace(/"/g, '').trim())

    const productNameIndex = productHeaders.findIndex(h => h.includes('商品名稱') || h.includes('品項名稱'))
    const amountIndex = productHeaders.findIndex(h => h.includes('金額') || h.includes('價格'))
    const checkoutTimeIndex = productHeaders.findIndex(h => h.includes('結帳時間'))

    let productSales = productLines.slice(1).map(line => {
      const values = line.split(',').map(v => v.replace(/"/g, '').trim())
      return {
        productName: values[productNameIndex] || '',
        amount: parseFloat(values[amountIndex]) || 0,
        checkoutTime: values[checkoutTimeIndex] || ''
      }
    }).filter(record => record.productName && record.amount > 0)

    // 如果有月份參數，篩選該月份的商品銷售資料
    if (selectedMonth) {
      productSales = productSales.filter(record => {
        if (!record.checkoutTime) return false

        const dateStr = record.checkoutTime.replace(/\//g, '-')
        const date = new Date(dateStr)

        if (isNaN(date.getTime())) return false

        const recordMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        return recordMonth === selectedMonth
      })
    }

    // 解析商品主檔
    const masterLines = masterCsv.split('\n').filter(line => line.trim())
    const masterHeaders = masterLines[0].split(',').map(h => h.replace(/"/g, '').trim())

    const masterNameIndex = masterHeaders.findIndex(h => h.includes('商品名稱'))
    const newNameIndex = masterHeaders.findIndex(h => h.includes('新商品名稱'))
    const categoryIndex = masterHeaders.findIndex(h => h.includes('大分類'))
    const smallCategoryIndex = masterHeaders.findIndex(h => h.includes('小分類'))

    // 建立商品名稱對應表
    const productMapping: { [key: string]: { big: string, small: string } } = {}
    masterLines.slice(1).forEach(line => {
      const values = line.split(',').map(v => v.replace(/"/g, '').trim())
      const productName = values[masterNameIndex] || ''
      const newProductName = values[newNameIndex] || ''
      const bigCategory = values[categoryIndex] || '未分類'
      const smallCategory = values[smallCategoryIndex] || '未分類'

      const categoryInfo = { big: bigCategory, small: smallCategory }

      // 原始商品名稱對應
      if (productName) {
        productMapping[productName] = categoryInfo
      }

      // 新商品名稱對應（如果存在且不同於原始名稱）
      if (newProductName && newProductName !== productName) {
        productMapping[newProductName] = categoryInfo
      }
    })

    // 按品項統計金額，並篩選指定分類
    const itemStats: { [key: string]: number } = {}
    let totalAmount = 0

    productSales.forEach((record) => {
      const categoryInfo = productMapping[record.productName]
      if (!categoryInfo) return

      const targetCategory = type === 'big' ? categoryInfo.big : categoryInfo.small

      // 檢查是否符合篩選條件
      if (targetCategory === categoryFilter) {
        if (!itemStats[record.productName]) {
          itemStats[record.productName] = 0
        }
        itemStats[record.productName] += record.amount
        totalAmount += record.amount
      }
    })

    // 轉換為陣列格式並排序
    const result = Object.entries(itemStats)
      .map(([productName, amount]) => ({
        productName: productName,
        amount: Math.round(amount),
        percentage: totalAmount > 0 ? Math.round((amount / totalAmount) * 1000) / 10 : 0,
        category: type === 'big' ? productMapping[productName]?.big : productMapping[productName]?.small,
        bigCategory: productMapping[productName]?.big,
        smallCategory: productMapping[productName]?.small
      }))
      .sort((a, b) => b.amount - a.amount)

    return NextResponse.json({
      success: true,
      data: result,
      summary: {
        totalAmount: Math.round(totalAmount),
        totalItems: result.length,
        category: categoryFilter,
        type: type,
        month: selectedMonth || 'all'
      }
    })

  } catch (error) {
    console.error('處理分類詳情時發生錯誤:', error)
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 })
  }
}