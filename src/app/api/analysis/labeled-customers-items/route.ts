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
    console.log('🎯 分析有標籤客戶的品項偏好 (2024/9-2025/9)...')
    
    // 第一步：從重點月份的客戶排行榜API獲取有標籤的客戶 (先分析幾個代表性月份)
    console.log('🏷️ 獲取代表性月份客戶標籤資訊...')
    
    const keyMonths = ['2025-01', '2025-02', '2025-03', '2025-04', '2025-05', '2025-06'] // 分析2025年1-6月
    
    const allNewCustomers: any[] = []
    const allReturningCustomers: any[] = []
    const seenNewCustomers = new Set<string>()
    const seenReturningCustomers = new Set<string>()
    
    for (const month of keyMonths) {
      try {
        console.log(`📅 處理 ${month}...`)
        const rankingResponse = await fetch(`https://restaurant-management-pi.vercel.app/api/reports/customer-spending-ranking?month=${month}`)
        
        if (!rankingResponse.ok) {
          console.log(`⚠️ ${month} 資料獲取失敗`)
          continue
        }

        const rankingData = await rankingResponse.json()
        
        if (!rankingData.success || !rankingData.data) {
          console.log(`⚠️ ${month} 資料格式錯誤`)
          continue
        }

        // 分離新客和新回客
        const monthNewCustomers = rankingData.data.filter((c: any) => c.isNewCustomer && !c.hasReturnedAfterNew)
        const monthReturningCustomers = rankingData.data.filter((c: any) => c.isNewCustomer && c.hasReturnedAfterNew)
        
        // 去重並累積
        monthNewCustomers.forEach((customer: any) => {
          if (!seenNewCustomers.has(customer.customerPhone)) {
            seenNewCustomers.add(customer.customerPhone)
            allNewCustomers.push({
              ...customer,
              month: month,
              name: customer.customerName,
              phone: customer.customerPhone,
              totalAmount: customer.totalOrderAmount,
              orderCount: customer.orderCount
            })
          }
        })
        
        monthReturningCustomers.forEach((customer: any) => {
          if (!seenReturningCustomers.has(customer.customerPhone)) {
            seenReturningCustomers.add(customer.customerPhone)
            allReturningCustomers.push({
              ...customer,
              month: month,
              name: customer.customerName,
              phone: customer.customerPhone,
              totalAmount: customer.totalOrderAmount,
              orderCount: customer.orderCount
            })
          }
        })
        
        console.log(`📊 ${month}: 新客 ${monthNewCustomers.length}，新回客 ${monthReturningCustomers.length}`)
      } catch (error) {
        console.log(`❌ ${month} 處理失敗:`, error)
      }
    }
    
    const newCustomers = allNewCustomers
    const returningCustomers = allReturningCustomers
    
    console.log(`👥 找到 ${newCustomers.length} 個新客，${returningCustomers.length} 個新回客`)
    
    if (newCustomers.length === 0 && returningCustomers.length === 0) {
      return NextResponse.json({
        error: '沒有找到有標籤的客戶',
        details: '請檢查客戶排行榜API的標籤邏輯'
      }, { status: 400 })
    }
    
    // 建立客戶電話對應表
    const newCustomerPhones = new Set(newCustomers.map(c => c.phone))
    const returningCustomerPhones = new Set(returningCustomers.map(c => c.phone))
    
    console.log('📞 新客電話:', Array.from(newCustomerPhones).slice(0, 5))
    console.log('📞 新回客電話:', Array.from(returningCustomerPhones).slice(0, 5))
    
    // 第二步：讀取原始訂單資料
    console.log('📥 讀取原始訂單資料...')
    const orderSheetUrl = 'https://docs.google.com/spreadsheets/d/1EWPECWQp_Ehz43Lfks_I8lcvEig8gV9DjyjEIzC5EO4/export?format=csv&gid=0'
    const orderResponse = await fetch(orderSheetUrl)
    
    if (!orderResponse.ok) {
      throw new Error('無法獲取訂單資料')
    }

    const orderCsv = await orderResponse.text()
    const orderLines = orderCsv.split('\n').filter(line => line.trim())
    const orderHeaders = orderLines[0].split(',').map(h => h.replace(/"/g, '').trim())
    
    // 找欄位索引
    const phoneIndex = orderHeaders.findIndex(h => h.includes('顧客電話'))
    const nameIndex = orderHeaders.findIndex(h => h.includes('顧客姓名'))
    const itemsIndex = orderHeaders.findIndex(h => h.includes('品項'))
    const amountIndex = orderHeaders.findIndex(h => h.includes('結帳金額'))
    const timeIndex = orderHeaders.findIndex(h => h.includes('結帳時間'))
    
    console.log('🏷️ 欄位索引:', { phoneIndex, nameIndex, itemsIndex, amountIndex, timeIndex })
    
    if (phoneIndex === -1 || itemsIndex === -1) {
      throw new Error('找不到必要的欄位')
    }
    
    // 第三步：分析品項偏好
    const newCustomerItems: { [item: string]: { quantity: number, totalAmount: number } } = {}
    const returningCustomerItems: { [item: string]: { quantity: number, totalAmount: number } } = {}
    
    let newCustomerOrderCount = 0
    let returningCustomerOrderCount = 0
    
    console.log('🔍 開始分析訂單品項...')
    
    orderLines.slice(1).forEach((line, index) => {
      if (index % 5000 === 0) {
        console.log(`處理第 ${index} 筆訂單...`)
      }
      
      const values = parseCSVLine(line).map(v => v.replace(/^"|"$/g, '').trim())
      const phone = values[phoneIndex] || ''
      const items = values[itemsIndex] || ''
      const orderTime = values[timeIndex] || ''
      
      if (!phone || !items) return
      
      // 檢查是否為目標客戶
      const isNewCustomer = newCustomerPhones.has(phone)
      const isReturningCustomer = returningCustomerPhones.has(phone)
      
      if (!isNewCustomer && !isReturningCustomer) return
      
      // 檢查時間是否在2025年1-6月期間
      if (orderTime) {
        let isInTargetPeriod = false
        const dateMatch = orderTime.match(/(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/)
        if (dateMatch) {
          const year = parseInt(dateMatch[1])
          const month = parseInt(dateMatch[2])
          
          if (year === 2025 && month >= 1 && month <= 6) {
            isInTargetPeriod = true
          }
        }
        
        if (!isInTargetPeriod) return
      }
      
      // 計算訂單數
      if (isNewCustomer) newCustomerOrderCount++
      if (isReturningCustomer) returningCustomerOrderCount++
      
      // 解析品項
      const itemList = items.split(',').map(item => item.trim()).filter(Boolean)
      
      itemList.forEach(item => {
        const match = item.match(/^(.+?)\s*\$(\d+(?:\.\d+)?)$/)
        if (match) {
          const itemName = match[1].trim()
          const itemPrice = parseFloat(match[2])
          
          if (isNewCustomer) {
            if (!newCustomerItems[itemName]) {
              newCustomerItems[itemName] = { quantity: 0, totalAmount: 0 }
            }
            newCustomerItems[itemName].quantity += 1
            newCustomerItems[itemName].totalAmount += itemPrice
          }
          
          if (isReturningCustomer) {
            if (!returningCustomerItems[itemName]) {
              returningCustomerItems[itemName] = { quantity: 0, totalAmount: 0 }
            }
            returningCustomerItems[itemName].quantity += 1
            returningCustomerItems[itemName].totalAmount += itemPrice
          }
        }
      })
    })
    
    console.log(`📊 新客訂單數: ${newCustomerOrderCount}, 新回客訂單數: ${returningCustomerOrderCount}`)
    
    // 轉換為排序陣列
    const formatItems = (itemStats: typeof newCustomerItems) => {
      return Object.entries(itemStats)
        .map(([item, stats]) => ({
          品項名稱: item,
          數量: stats.quantity,
          總金額: Math.round(stats.totalAmount)
        }))
        .sort((a, b) => b.總金額 - a.總金額)
    }
    
    const newCustomerItemsSorted = formatItems(newCustomerItems)
    const returningCustomerItemsSorted = formatItems(returningCustomerItems)
    
    console.log(`🍽️ 新客品項種類: ${newCustomerItemsSorted.length}`)
    console.log(`🍽️ 新回客品項種類: ${returningCustomerItemsSorted.length}`)
    
    return NextResponse.json({
      success: true,
      period: '2025年1月至6月',
      analysisScope: '有標籤的新客與新回客品項偏好分析',
      summary: {
        新客人數: newCustomers.length,
        新回客人數: returningCustomers.length,
        新客訂單數: newCustomerOrderCount,
        新回客訂單數: returningCustomerOrderCount,
        新客品項種類: newCustomerItemsSorted.length,
        新回客品項種類: returningCustomerItemsSorted.length
      },
      客戶詳情: {
        新客: newCustomers.map(c => ({
          姓名: c.name,
          電話: c.phone,
          總消費: Math.round(c.totalAmount),
          訂單數: c.orderCount
        })),
        新回客: returningCustomers.map(c => ({
          姓名: c.name,
          電話: c.phone,
          總消費: Math.round(c.totalAmount),
          訂單數: c.orderCount
        }))
      },
      品項分析: {
        新客喜愛品項: newCustomerItemsSorted,
        新回客喜愛品項: returningCustomerItemsSorted
      }
    })
    
  } catch (error) {
    console.error('❌ 分析有標籤客戶品項時發生錯誤:', error)
    return NextResponse.json({ 
      error: '分析失敗', 
      details: error instanceof Error ? error.message : '未知錯誤' 
    }, { status: 500 })
  }
}