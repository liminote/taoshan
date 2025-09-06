import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    // 獲取月份參數
    const { searchParams } = new URL(request.url)
    const selectedMonth = searchParams.get('month')
    
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
    const smallCategoryIndex = masterHeaders.findIndex(h => h.includes('小分類'))
    
    // 建立商品名稱對應表（小分類，同時支援原始名稱和新商品名稱）
    const productMapping: { [key: string]: string } = {}
    masterLines.slice(1).forEach(line => {
      const values = line.split(',').map(v => v.replace(/"/g, '').trim())
      const productName = values[masterNameIndex] || ''
      const newProductName = values[newNameIndex] || ''
      const smallCategory = values[smallCategoryIndex] || '未分類'
      
      // 原始商品名稱對應
      if (productName) {
        productMapping[productName] = smallCategory
      }
      
      // 新商品名稱對應（如果存在且不同於原始名稱）
      if (newProductName && newProductName !== productName) {
        productMapping[newProductName] = smallCategory
      }
    })

    console.log(`建立了 ${Object.keys(productMapping).length} 個商品對應關係（小分類）`)
    console.log(`處理 ${productSales.length} 筆商品銷售資料${selectedMonth ? `（篩選月份：${selectedMonth}）` : ''}`)

    // 按小分類統計金額
    const categoryStats: { [key: string]: number } = {}
    let totalAmount = 0
    let matchedCount = 0
    const unmatchedProducts: string[] = []

    productSales.forEach((record) => {
      const smallCategory = productMapping[record.productName] || '未分類'
      
      if (productMapping[record.productName]) {
        matchedCount++
      } else {
        unmatchedProducts.push(record.productName)
      }
      
      if (!categoryStats[smallCategory]) {
        categoryStats[smallCategory] = 0
      }
      
      categoryStats[smallCategory] += record.amount
      totalAmount += record.amount
    })

    console.log(`成功比對: ${matchedCount} 筆，未比對: ${unmatchedProducts.length} 筆`)
    if (unmatchedProducts.length > 0) {
      console.log('未比對商品前10項:', unmatchedProducts.slice(0, 10))
    }

    // 轉換為陣列格式並計算百分比
    const result = Object.entries(categoryStats)
      .map(([category, amount]) => ({
        category: category,
        amount: Math.round(amount),
        percentage: totalAmount > 0 ? Math.round((amount / totalAmount) * 1000) / 10 : 0
      }))
      .sort((a, b) => b.amount - a.amount) // 按金額排序，最高在前

    // 月份篩選已在資料處理階段完成，這裡不需要額外處理

    return NextResponse.json({
      success: true,
      data: result
    })

  } catch (error) {
    console.error('處理小分類分布報表時發生錯誤:', error)
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 })
  }
}