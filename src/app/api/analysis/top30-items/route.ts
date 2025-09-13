import { NextResponse } from 'next/server'

// CSV 解析函數
function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  
  result.push(current.trim())
  return result
}

export async function GET() {
  try {
    console.log('🎯 分析2024/9-2025/9期間TOP30客戶的品項偏好...')
    
    // 讀取原始訂單資料
    console.log('📥 讀取原始訂單資料...')
    const orderSheetUrl = 'https://docs.google.com/spreadsheets/d/1EWPECWQp_Ehz43Lfks_I8lcvEig8gV9DjyjEIzC5EO4/export?format=csv&gid=0'
    const orderResponse = await fetch(orderSheetUrl)
    
    if (!orderResponse.ok) {
      throw new Error('無法獲取訂單資料')
    }

    const orderCsv = await orderResponse.text()
    const orderLines = orderCsv.split('\n').filter(line => line.trim())
    const orderHeaders = orderLines[0].split(',').map(h => h.replace(/"/g, '').trim())
    
    console.log('📋 找到欄位:', orderHeaders)
    
    // 找欄位索引
    const phoneIndex = orderHeaders.findIndex(h => h.includes('顧客電話'))
    const nameIndex = orderHeaders.findIndex(h => h.includes('顧客姓名'))
    const itemsIndex = orderHeaders.findIndex(h => h.includes('品項'))
    const amountIndex = orderHeaders.findIndex(h => h.includes('結帳金額'))
    const timeIndex = orderHeaders.findIndex(h => h.includes('結帳時間'))
    
    console.log('🏷️ 欄位索引:', { phoneIndex, nameIndex, itemsIndex, amountIndex, timeIndex })
    
    if (phoneIndex === -1 || itemsIndex === -1 || amountIndex === -1) {
      throw new Error('找不到必要的欄位')
    }
    
    // 第一步：收集2024/9-2025/9期間的所有訂單並計算客戶總消費
    console.log('📊 計算客戶消費排行...')
    const customerTotals: { [key: string]: { 
      totalAmount: number, 
      orderCount: number, 
      name: string,
      phone: string,
      orders: Array<{
        amount: number,
        items: string,
        date: string
      }>
    }} = {}
    
    orderLines.slice(1).forEach((line, index) => {
      if (index % 5000 === 0) {
        console.log(`處理第 ${index} 筆訂單...`)
      }
      
      const values = parseCSVLine(line).map(v => v.replace(/^"|"$/g, '').trim())
      const phone = values[phoneIndex] || ''
      const name = values[nameIndex] || ''
      const items = values[itemsIndex] || ''
      const amount = parseFloat(values[amountIndex]) || 0
      const orderTime = values[timeIndex] || ''
      
      if (!phone || !name || amount <= 0) return
      
      // 檢查時間是否在2024/9-2025/9期間
      let isInTargetPeriod = false
      if (orderTime) {
        const dateMatch = orderTime.match(/(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/)
        if (dateMatch) {
          const year = parseInt(dateMatch[1])
          const month = parseInt(dateMatch[2])
          
          if ((year === 2024 && month >= 9) || (year === 2025 && month <= 9)) {
            isInTargetPeriod = true
          }
        }
      }
      
      if (!isInTargetPeriod) return
      
      const customerKey = phone || name
      
      if (!customerTotals[customerKey]) {
        customerTotals[customerKey] = {
          totalAmount: 0,
          orderCount: 0,
          name: name,
          phone: phone,
          orders: []
        }
      }
      
      customerTotals[customerKey].totalAmount += amount
      customerTotals[customerKey].orderCount += 1
      customerTotals[customerKey].orders.push({
        amount: amount,
        items: items,
        date: orderTime
      })
    })
    
    // 取得TOP30客戶
    const top30Customers = Object.entries(customerTotals)
      .sort(([,a], [,b]) => b.totalAmount - a.totalAmount)
      .slice(0, 30)
    
    console.log(`💰 找到TOP30客戶，總消費範圍: $${Math.round(top30Customers[29][1].totalAmount)} - $${Math.round(top30Customers[0][1].totalAmount)}`)
    
    // 第二步：分析新客和新回客（使用簡化邏輯）
    // 檢查每個TOP30客戶的首次訂單時間和後續訂單
    const newCustomers: Array<{ key: string, data: typeof customerTotals[''] }> = []
    const returningCustomers: Array<{ key: string, data: typeof customerTotals[''] }> = []
    
    top30Customers.forEach(([customerKey, customerData]) => {
      // 按日期排序訂單
      const sortedOrders = customerData.orders.sort((a, b) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      )
      
      if (sortedOrders.length === 0) return
      
      const firstOrderDate = new Date(sortedOrders[0].date)
      const firstOrderMonth = `${firstOrderDate.getFullYear()}-${String(firstOrderDate.getMonth() + 1).padStart(2, '0')}`
      
      // 檢查首次訂單是否在2024/9-2025/9期間（定義為新客）
      const year = firstOrderDate.getFullYear()
      const month = firstOrderDate.getMonth() + 1
      const isNewInTargetPeriod = (year === 2024 && month >= 9) || (year === 2025 && month <= 9)
      
      if (isNewInTargetPeriod) {
        // 檢查是否有在首次訂單月份之後的訂單
        const hasLaterOrders = sortedOrders.some(order => {
          const orderDate = new Date(order.date)
          const orderMonth = `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, '0')}`
          return orderMonth > firstOrderMonth
        })
        
        if (hasLaterOrders) {
          returningCustomers.push({ key: customerKey, data: customerData })
        } else {
          newCustomers.push({ key: customerKey, data: customerData })
        }
      }
    })
    
    console.log(`👥 TOP30中找到: ${newCustomers.length} 個新客，${returningCustomers.length} 個新回客`)
    
    // 第三步：分析品項偏好
    const analyzeItems = (customers: Array<{ key: string, data: typeof customerTotals[''] }>) => {
      const itemStats: { [item: string]: { quantity: number, totalAmount: number } } = {}
      
      customers.forEach(({ data }) => {
        data.orders.forEach(order => {
          if (!order.items) return
          
          const itemList = order.items.split(',').map(item => item.trim()).filter(Boolean)
          
          itemList.forEach(item => {
            const match = item.match(/^(.+?)\s*\$(\d+(?:\.\d+)?)$/)
            if (match) {
              const itemName = match[1].trim()
              const itemPrice = parseFloat(match[2])
              
              if (!itemStats[itemName]) {
                itemStats[itemName] = { quantity: 0, totalAmount: 0 }
              }
              
              itemStats[itemName].quantity += 1
              itemStats[itemName].totalAmount += itemPrice
            }
          })
        })
      })
      
      return Object.entries(itemStats)
        .map(([item, stats]) => ({
          品項名稱: item,
          數量: stats.quantity,
          總金額: Math.round(stats.totalAmount)
        }))
        .sort((a, b) => b.總金額 - a.總金額)
    }
    
    const newCustomerItems = analyzeItems(newCustomers)
    const returningCustomerItems = analyzeItems(returningCustomers)
    
    console.log(`🍽️ 新客品項種類: ${newCustomerItems.length}`)
    console.log(`🍽️ 新回客品項種類: ${returningCustomerItems.length}`)
    
    return NextResponse.json({
      success: true,
      period: '2024年9月至2025年9月',
      analysisScope: 'TOP30消費客戶中的新客與新回客',
      summary: {
        TOP30客戶總數: 30,
        新客人數: newCustomers.length,
        新回客人數: returningCustomers.length,
        新客品項種類: newCustomerItems.length,
        新回客品項種類: returningCustomerItems.length
      },
      客戶詳情: {
        新客: newCustomers.map(c => ({
          姓名: c.data.name,
          電話: c.data.phone,
          總消費: Math.round(c.data.totalAmount),
          訂單數: c.data.orderCount
        })),
        新回客: returningCustomers.map(c => ({
          姓名: c.data.name,
          電話: c.data.phone,
          總消費: Math.round(c.data.totalAmount),
          訂單數: c.data.orderCount
        }))
      },
      品項分析: {
        新客喜愛品項: newCustomerItems,
        新回客喜愛品項: returningCustomerItems
      }
    })
    
  } catch (error) {
    console.error('❌ 分析TOP30客戶品項時發生錯誤:', error)
    return NextResponse.json({ 
      error: '分析失敗', 
      details: error instanceof Error ? error.message : '未知錯誤' 
    }, { status: 500 })
  }
}