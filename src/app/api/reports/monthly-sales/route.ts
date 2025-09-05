import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // 生成包含所有實際資料的月份，然後取最近13個月
    const allMonths = []
    // 生成從2023-09到2025-08的所有月份
    for (let year = 2023; year <= 2025; year++) {
      const startMonth = year === 2023 ? 9 : 1
      const endMonth = year === 2025 ? 8 : 12
      for (let month = startMonth; month <= endMonth; month++) {
        const monthKey = `${year}-${String(month).padStart(2, '0')}`
        allMonths.push(monthKey)
      }
    }
    // 取最新13個月（從最新往前推）
    const recentMonths = allMonths.slice(-13)

    // 使用 Google Sheets 訂單資料
    const orderSheetUrl = 'https://docs.google.com/spreadsheets/d/1EWPECWQp_Ehz43Lfks_I8lcvEig8gV9DjyjEIzC5EO4/export?format=csv&gid=0'
    const productSheetUrl = 'https://docs.google.com/spreadsheets/d/1GeRbtCX_oHJBooYvZeRbREaSxJ4r8P8QoL-vHiSz2eo/export?format=csv&gid=0'
    
    const [orderResponse, productResponse] = await Promise.all([
      fetch(orderSheetUrl),
      fetch(productSheetUrl)
    ])

    if (!orderResponse.ok || !productResponse.ok) {
      console.error('無法獲取 Google Sheets 資料')
      return NextResponse.json({ error: '查詢失敗' }, { status: 500 })
    }

    const orderCsv = await orderResponse.text()
    const productCsv = await productResponse.text()

    // 解析訂單 CSV 資料
    const orderLines = orderCsv.split('\n').filter(line => line.trim())
    const orderHeaders = orderLines[0].split(',').map(h => h.replace(/"/g, '').trim())
    
    // 找到需要的欄位索引
    const checkoutTimeIndex = orderHeaders.findIndex(h => h.includes('結帳時間'))
    const checkoutAmountIndex = orderHeaders.findIndex(h => h.includes('結帳金額'))
    const discountIndex = orderHeaders.findIndex(h => h.includes('折扣金額'))
    
    const orderData = orderLines.slice(1).map(line => {
      const values = line.split(',').map(v => v.replace(/"/g, '').trim())
      return {
        checkout_time: values[checkoutTimeIndex],
        invoice_amount: parseFloat(values[checkoutAmountIndex]) || 0,
        discount_amount: parseFloat(values[discountIndex]) || 0
      }
    }).filter(record => record.checkout_time && record.checkout_time !== '')

    // 解析商品 CSV 資料
    const productLines = productCsv.split('\n').filter(line => line.trim())
    const productHeaders = productLines[0].split(',').map(h => h.replace(/"/g, '').trim())
    
    const productData = productLines.slice(1).map(line => {
      const values = line.split(',').map(v => v.replace(/"/g, '').trim())
      const record: Record<string, string> = {}
      productHeaders.forEach((header, index) => {
        record[header] = values[index] || ''
      })
      return record
    }).filter(record => record['結帳時間'] && record['結帳時間'] !== '')

    // 初始化所有月份的統計數據
    const monthlyStats: { [key: string]: { 
      amount: number; 
      orderCount: number; 
      avgOrderValue: number;
      productItems: Set<string>;
      productItemCount: number;
    } } = {}

    recentMonths.forEach(month => {
      monthlyStats[month] = { 
        amount: 0, 
        orderCount: 0, 
        avgOrderValue: 0,
        productItems: new Set(),
        productItemCount: 0
      }
    })

    // 處理訂單資料
    if (orderData && orderData.length > 0) {
      console.log(`取得 ${orderData.length} 筆訂單資料`)
      let processedCount = 0
      const sampleDates = []
      
      orderData.forEach((record, index) => {
        if (record.checkout_time) {
          // 處理日期格式 YYYY-MM-DD HH:MM:SS 或 YYYY/MM/DD HH:MM:SS
          const dateStr = record.checkout_time.replace(/\//g, '-')
          const date = new Date(dateStr)
          
          if (!isNaN(date.getTime())) {
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
            
            if (index < 5) {
              sampleDates.push(`${record.checkout_time} -> ${monthKey}`)
            }
            
            if (monthlyStats[monthKey]) {
              monthlyStats[monthKey].orderCount += 1
              monthlyStats[monthKey].amount += record.invoice_amount || 0
              processedCount++
            }
          }
        }
      })
      
      console.log('樣本日期:', sampleDates)
      console.log(`處理了 ${processedCount} 筆有效資料`)
      console.log('目標月份範圍:', recentMonths)
    }

    // 處理商品資料來計算商品品項數
    if (productData && productData.length > 0) {
      console.log(`取得 ${productData.length} 筆商品資料`)
      
      productData.forEach((record) => {
        const checkoutTime = record['結帳時間']
        const productName = record['商品名稱'] || record['品項名稱'] || ''
        
        if (checkoutTime && productName) {
          const dateStr = checkoutTime.replace(/\//g, '-')
          const date = new Date(dateStr)
          
          if (!isNaN(date.getTime())) {
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
            
            if (monthlyStats[monthKey]) {
              monthlyStats[monthKey].productItems.add(productName)
            }
          }
        }
      })
    }

    // 計算平均單價和商品品項數
    Object.keys(monthlyStats).forEach(month => {
      const stats = monthlyStats[month]
      stats.avgOrderValue = stats.orderCount > 0 ? Math.round((stats.amount / stats.orderCount) * 100) / 100 : 0
      stats.productItemCount = stats.productItems.size
    })

    // 轉換為陣列格式並按時間排序（最新在前）
    const result = recentMonths.map(month => ({
      month: month,
      monthDisplay: month.replace('-', '年') + '月',
      amount: Math.round(monthlyStats[month].amount * 100) / 100,
      orderCount: monthlyStats[month].orderCount,
      avgOrderValue: monthlyStats[month].avgOrderValue,
      productItemCount: monthlyStats[month].productItemCount
    }))

    return NextResponse.json(result)

  } catch (error) {
    console.error('處理月銷售報表時發生錯誤:', error)
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 })
  }
}