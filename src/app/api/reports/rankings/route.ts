import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const month = searchParams.get('month') || new Date().toISOString().slice(0, 7) // 默認當月 YYYY-MM

    console.log('🔍 獲取排名資料，月份:', month)

    // 使用 Google Sheets 資料來源
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

    // 解析商品銷售資料 CSV
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

    // 篩選指定月份的商品銷售資料
    productSales = productSales.filter(record => {
      if (!record.checkoutTime) return false
      
      const dateStr = record.checkoutTime.replace(/\//g, '-')
      const date = new Date(dateStr)
      
      if (isNaN(date.getTime())) return false
      
      const recordMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      return recordMonth === month
    })

    // 解析商品主檔 CSV
    const masterLines = masterCsv.split('\n').filter(line => line.trim())
    const masterHeaders = masterLines[0].split(',').map(h => h.replace(/"/g, '').trim())
    
    const masterNameIndex = masterHeaders.findIndex(h => h.includes('商品名稱'))
    const newNameIndex = masterHeaders.findIndex(h => h.includes('新商品名稱'))
    const categoryIndex = masterHeaders.findIndex(h => h.includes('大分類'))
    const smallCategoryIndex = masterHeaders.findIndex(h => h.includes('小分類'))
    
    // 建立商品名稱對應表（同時支援原始名稱和新商品名稱）
    const productMapping: { [key: string]: { category: string; smallCategory: string } } = {}
    masterLines.slice(1).forEach(line => {
      const values = line.split(',').map(v => v.replace(/"/g, '').trim())
      const productName = values[masterNameIndex] || ''
      const newProductName = values[newNameIndex] || ''
      const category = values[categoryIndex] || '未分類'
      const smallCategory = values[smallCategoryIndex] || '未分類'
      
      // 原始商品名稱對應
      if (productName) {
        productMapping[productName] = { category, smallCategory }
      }
      
      // 新商品名稱對應（如果存在且不同於原始名稱）
      if (newProductName && newProductName !== productName) {
        productMapping[newProductName] = { category, smallCategory }
      }
    })

    console.log(`📊 商品銷售資料: ${productSales.length} 筆`)
    console.log(`📊 建立了 ${Object.keys(productMapping).length} 個商品對應關係`)

    // 3. 彙總商品銷售資料（使用訂單次數作為銷量）
    const productSummary = new Map()
    
    productSales.forEach((sale: { productName: string; amount: number }) => {
      const productName = sale.productName
      const amount = sale.amount || 0
      
      if (!productSummary.has(productName)) {
        const masterInfo = productMapping[productName]
        productSummary.set(productName, {
          name: productName,
          quantity: 0, // 訂單次數（銷量）
          amount: 0,   // 總金額
          category: masterInfo?.category || '未分類',
          smallCategory: masterInfo?.smallCategory || '未分類'
        })
      }
      
      const existing = productSummary.get(productName)
      existing.quantity += 1  // 每筆訂單記錄計算為1次銷量
      existing.amount += amount
    })

    // 轉換為陣列並排序
    const allProducts = Array.from(productSummary.values())
    
    // 銷量排名 (前20名)
    const quantityRanking = [...allProducts]
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 20)
      .map((item, index) => ({
        rank: index + 1,
        name: item.name,
        quantity: item.quantity,
        amount: item.amount,
        category: item.category
      }))

    // 銷額排名 (前20名) 
    const amountRanking = [...allProducts]
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 20)
      .map((item, index) => ({
        rank: index + 1,
        name: item.name,
        quantity: item.quantity,
        amount: item.amount,
        category: item.category
      }))

    // 6酒水分類排名 (前20名)
    const alcoholRanking = allProducts
      .filter(item => item.category === '6酒水')
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 20)
      .map((item, index) => ({
        rank: index + 1,
        name: item.name,
        quantity: item.quantity,
        amount: item.amount,
        category: item.category
      }))

    // 總計資料
    const totals = {
      totalQuantity: allProducts.reduce((sum, item) => sum + item.quantity, 0),
      totalAmount: allProducts.reduce((sum, item) => sum + item.amount, 0),
      totalProducts: allProducts.length
    }

    console.log('✅ 排名統計完成')
    console.log(`- 銷量排名: ${quantityRanking.length} 項`)
    console.log(`- 銷額排名: ${amountRanking.length} 項`) 
    console.log(`- 酒水排名: ${alcoholRanking.length} 項`)

    return NextResponse.json({
      success: true,
      month,
      data: {
        quantityRanking,
        amountRanking,
        alcoholRanking,
        totals
      }
    })

  } catch (error) {
    console.error('排名統計失敗:', error)
    return NextResponse.json({ 
      error: '排名統計失敗',
      details: error instanceof Error ? error.message : '未知錯誤'
    }, { status: 500 })
  }
}