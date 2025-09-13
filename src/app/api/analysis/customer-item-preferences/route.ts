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
    console.log('🎯 分析2025年1-6月新客與新回客品項偏好...')
    
    // 先收集各月份的新客和新回客電話號碼
    const months = ['2025-01', '2025-02', '2025-03', '2025-04', '2025-05', '2025-06']
    const newCustomerPhones = new Set<string>()
    const returningCustomerPhones = new Set<string>()
    const customerInfo: { [phone: string]: { name: string, type: string, month: string } } = {}
    
    for (const month of months) {
      try {
        console.log(`📅 收集 ${month} 客戶資訊...`)
        const response = await fetch(`https://restaurant-management-pi.vercel.app/api/reports/customer-spending-ranking?month=${month}`)
        
        if (!response.ok) continue
        
        const data = await response.json()
        if (!data.success || !data.data) continue
        
        // 分離新客和新回客
        data.data.forEach((customer: any) => {
          if (customer.isNewCustomer) {
            const phone = customer.customerPhone
            const name = customer.customerName
            
            if (customer.hasReturnedAfterNew) {
              // 新回客
              if (!returningCustomerPhones.has(phone)) {
                returningCustomerPhones.add(phone)
                customerInfo[phone] = { name, type: '新回客', month }
              }
            } else {
              // 純新客
              if (!newCustomerPhones.has(phone)) {
                newCustomerPhones.add(phone)
                customerInfo[phone] = { name, type: '新客', month }
              }
            }
          }
        })
      } catch (error) {
        console.log(`❌ ${month} 處理失敗:`, error)
      }
    }
    
    console.log(`👥 收集到 ${newCustomerPhones.size} 位新客，${returningCustomerPhones.size} 位新回客`)
    
    if (newCustomerPhones.size === 0 && returningCustomerPhones.size === 0) {
      return NextResponse.json({
        error: '沒有找到符合條件的客戶資料',
        period: '2025年1-6月'
      }, { status: 404 })
    }
    
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
    
    // 找欄位索引
    const phoneIndex = orderHeaders.findIndex(h => h.includes('顧客電話'))
    const nameIndex = orderHeaders.findIndex(h => h.includes('顧客姓名'))
    const itemsIndex = orderHeaders.findIndex(h => h.includes('品項'))
    const amountIndex = orderHeaders.findIndex(h => h.includes('結帳金額'))
    const timeIndex = orderHeaders.findIndex(h => h.includes('結帳時間'))
    
    if (phoneIndex === -1 || itemsIndex === -1 || timeIndex === -1) {
      throw new Error('找不到必要的欄位')
    }
    
    // 分析品項偏好
    const newCustomerItems: { [item: string]: { count: number, totalAmount: number } } = {}
    const returningCustomerItems: { [item: string]: { count: number, totalAmount: number } } = {}
    
    let newCustomerOrders = 0
    let returningCustomerOrders = 0
    
    console.log('🔍 分析訂單品項...')
    
    orderLines.slice(1).forEach((line) => {
      const values = parseCSVLine(line).map(v => v.replace(/^"|"$/g, '').trim())
      const phone = values[phoneIndex] || ''
      const items = values[itemsIndex] || ''
      const orderTime = values[timeIndex] || ''
      
      if (!phone || !items || !orderTime) return
      
      // 檢查是否為目標客戶
      const isNewCustomer = newCustomerPhones.has(phone)
      const isReturningCustomer = returningCustomerPhones.has(phone)
      
      if (!isNewCustomer && !isReturningCustomer) return
      
      // 檢查時間是否在2025年1-6月
      const dateMatch = orderTime.match(/(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/)
      if (dateMatch) {
        const year = parseInt(dateMatch[1])
        const month = parseInt(dateMatch[2])
        
        if (!(year === 2025 && month >= 1 && month <= 6)) {
          return // 不在目標期間
        }
      } else {
        return // 日期格式錯誤
      }
      
      // 統計訂單數
      if (isNewCustomer) newCustomerOrders++
      if (isReturningCustomer) returningCustomerOrders++
      
      // 解析品項
      const itemList = items.split(',').map(item => item.trim()).filter(Boolean)
      
      itemList.forEach(item => {
        // 提取品項名稱和價格
        const match = item.match(/^(.+?)\s*\$(\d+(?:\.\d+)?)$/)
        if (match) {
          const itemName = match[1].trim()
          const itemPrice = parseFloat(match[2])
          
          if (isNewCustomer) {
            if (!newCustomerItems[itemName]) {
              newCustomerItems[itemName] = { count: 0, totalAmount: 0 }
            }
            newCustomerItems[itemName].count += 1
            newCustomerItems[itemName].totalAmount += itemPrice
          }
          
          if (isReturningCustomer) {
            if (!returningCustomerItems[itemName]) {
              returningCustomerItems[itemName] = { count: 0, totalAmount: 0 }
            }
            returningCustomerItems[itemName].count += 1
            returningCustomerItems[itemName].totalAmount += itemPrice
          }
        }
      })
    })
    
    // 格式化結果
    const formatItems = (itemStats: typeof newCustomerItems, limit = 20) => {
      return Object.entries(itemStats)
        .map(([item, stats]) => ({
          品項名稱: item,
          點餐次數: stats.count,
          總金額: Math.round(stats.totalAmount),
          平均單價: Math.round(stats.totalAmount / stats.count)
        }))
        .sort((a, b) => b.總金額 - a.總金額)
        .slice(0, limit)
    }
    
    const newCustomerTop20 = formatItems(newCustomerItems, 20)
    const returningCustomerTop20 = formatItems(returningCustomerItems, 20)
    
    console.log(`📊 分析完成: 新客訂單 ${newCustomerOrders} 筆，新回客訂單 ${returningCustomerOrders} 筆`)
    console.log(`🍽️ 新客品項 ${newCustomerTop20.length} 種，新回客品項 ${returningCustomerTop20.length} 種`)
    
    return NextResponse.json({
      success: true,
      period: '2025年1-6月',
      summary: {
        分析期間: '2025年1月至6月',
        新客人數: newCustomerPhones.size,
        新回客人數: returningCustomerPhones.size,
        新客訂單數: newCustomerOrders,
        新回客訂單數: returningCustomerOrders,
        新客喜愛品項數: newCustomerTop20.length,
        新回客喜愛品項數: returningCustomerTop20.length
      },
      品項偏好分析: {
        新客最愛TOP20: newCustomerTop20,
        新回客最愛TOP20: returningCustomerTop20
      },
      客戶資訊統計: {
        新客戶: Array.from(newCustomerPhones).slice(0, 10).map(phone => ({
          姓名: customerInfo[phone]?.name || '未知',
          電話: phone,
          類型: customerInfo[phone]?.type || '新客',
          首次出現月份: customerInfo[phone]?.month || '未知'
        })),
        新回客戶: Array.from(returningCustomerPhones).slice(0, 10).map(phone => ({
          姓名: customerInfo[phone]?.name || '未知',
          電話: phone,
          類型: customerInfo[phone]?.type || '新回客',
          首次出現月份: customerInfo[phone]?.month || '未知'
        }))
      }
    })
    
  } catch (error) {
    console.error('❌ 分析客戶品項偏好失敗:', error)
    return NextResponse.json({ 
      error: '分析失敗', 
      details: error instanceof Error ? error.message : '未知錯誤',
      period: '2025年1-6月'
    }, { status: 500 })
  }
}