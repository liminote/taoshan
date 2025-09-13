import { NextResponse } from 'next/server'

// CSV 解析函數（處理包含逗號的引號字段）
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
    console.log('開始分析新客與新回客的消費偏好...')
    
    // 讀取商品銷售資料
    const productSheetUrl = 'https://docs.google.com/spreadsheets/d/1GeRbtCX_oHJBooYvZeRbREaSxJ4r8P8QoL-vHiSz2eo/export?format=csv&gid=0'
    const productResponse = await fetch(productSheetUrl)
    
    if (!productResponse.ok) {
      throw new Error('無法獲取商品銷售資料')
    }

    const productCsv = await productResponse.text()
    const productLines = productCsv.split('\n').filter(line => line.trim())
    const productHeaders = productLines[0].split(',').map(h => h.replace(/"/g, '').trim())
    
    const customerNameIndex = productHeaders.findIndex(h => h.includes('顧客名稱'))
    const phoneIndex = productHeaders.findIndex(h => h.includes('顧客電話'))
    const amountIndex = productHeaders.findIndex(h => h.includes('金額'))
    const checkoutTimeIndex = productHeaders.findIndex(h => h.includes('結帳時間'))
    const itemsIndex = productHeaders.findIndex(h => h.includes('品項') || h.includes('商品'))
    
    console.log('欄位索引:', { customerNameIndex, phoneIndex, amountIndex, checkoutTimeIndex, itemsIndex })

    // 解析所有訂單資料
    const allOrders = productLines.slice(1).map(line => {
      const values = parseCSVLine(line)
      const checkoutTime = values[checkoutTimeIndex] || ''
      const amount = parseFloat(values[amountIndex]) || 0
      
      return {
        customerName: values[customerNameIndex] || '',
        phone: values[phoneIndex] || '',
        amount,
        checkoutTime,
        items: values[itemsIndex] || '',
        date: checkoutTime ? new Date(checkoutTime.replace(/\//g, '-')) : null
      }
    }).filter(order => 
      order.customerName && 
      order.amount > 0 && 
      order.date && 
      !isNaN(order.date.getTime())
    )

    console.log(`總訂單數: ${allOrders.length}`)

    // 篩選 2024/9 至 2025/9 的訂單
    const targetOrders = allOrders.filter(order => {
      if (!order.date) return false
      const orderDate = order.date
      const start = new Date('2024-09-01')
      const end = new Date('2025-09-30')
      return orderDate >= start && orderDate <= end
    })

    console.log(`目標期間訂單數: ${targetOrders.length}`)

    // 計算客戶消費統計
    const customerStats: { [key: string]: {
      totalAmount: number
      orders: typeof targetOrders
      firstOrderDate: Date
      hasReturnedAfterNew: boolean
    }} = {}

    targetOrders.forEach(order => {
      const key = order.phone || order.customerName
      if (!customerStats[key]) {
        customerStats[key] = {
          totalAmount: 0,
          orders: [],
          firstOrderDate: order.date!,
          hasReturnedAfterNew: false
        }
      }
      
      customerStats[key].totalAmount += order.amount
      customerStats[key].orders.push(order)
      
      if (order.date! < customerStats[key].firstOrderDate) {
        customerStats[key].firstOrderDate = order.date!
      }
    })

    // 檢查是否有回頭（使用全部訂單檢查）
    Object.keys(customerStats).forEach(customerKey => {
      const stat = customerStats[customerKey]
      const firstOrderMonth = `${stat.firstOrderDate.getFullYear()}-${String(stat.firstOrderDate.getMonth() + 1).padStart(2, '0')}`
      
      // 檢查該客戶在全部訂單中，是否在第一次消費月份之後還有訂單
      const hasLaterOrders = allOrders.some(order => {
        if (!order.date) return false
        const orderKey = order.phone || order.customerName
        if (orderKey !== customerKey) return false
        
        const orderMonth = `${order.date.getFullYear()}-${String(order.date.getMonth() + 1).padStart(2, '0')}`
        return orderMonth > firstOrderMonth
      })
      
      stat.hasReturnedAfterNew = hasLaterOrders
    })

    // 取得 Top 30 客戶
    const top30Customers = Object.entries(customerStats)
      .sort(([,a], [,b]) => b.totalAmount - a.totalAmount)
      .slice(0, 30)

    console.log(`Top 30 客戶數: ${top30Customers.length}`)

    // 分析新客與新回客的品項偏好
    const newCustomers: typeof top30Customers = []
    const returningCustomers: typeof top30Customers = []

    top30Customers.forEach(([customerKey, stats]) => {
      if (stats.hasReturnedAfterNew) {
        returningCustomers.push([customerKey, stats])
      } else {
        newCustomers.push([customerKey, stats])
      }
    })

    console.log(`新客數量: ${newCustomers.length}`)
    console.log(`新回客數量: ${returningCustomers.length}`)

    // 分析品項偏好
    const analyzeItems = (customers: typeof top30Customers) => {
      const itemStats: { [item: string]: { quantity: number, totalAmount: number } } = {}
      
      customers.forEach(([_, stats]) => {
        stats.orders.forEach(order => {
          if (!order.items) return
          
          // 解析品項字符串 (格式: "商品名 $價格,商品名 $價格,...")
          const items = order.items.split(',').map(item => item.trim()).filter(Boolean)
          
          items.forEach(item => {
            // 提取商品名稱和價格
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
          item,
          quantity: stats.quantity,
          totalAmount: Math.round(stats.totalAmount)
        }))
        .sort((a, b) => b.totalAmount - a.totalAmount)
    }

    const newCustomerItems = analyzeItems(newCustomers)
    const returningCustomerItems = analyzeItems(returningCustomers)

    console.log(`新客品項數: ${newCustomerItems.length}`)
    console.log(`新回客品項數: ${returningCustomerItems.length}`)

    return NextResponse.json({
      success: true,
      period: '2024/9 - 2025/9',
      summary: {
        totalTop30: top30Customers.length,
        newCustomers: newCustomers.length,
        returningCustomers: returningCustomers.length
      },
      newCustomerPreferences: {
        customers: newCustomers.map(([key, stats]) => ({
          customerKey: key,
          totalAmount: Math.round(stats.totalAmount),
          orderCount: stats.orders.length,
          firstOrderDate: stats.firstOrderDate.toISOString().split('T')[0]
        })),
        topItems: newCustomerItems.slice(0, 20) // 前20個最常點的品項
      },
      returningCustomerPreferences: {
        customers: returningCustomers.map(([key, stats]) => ({
          customerKey: key,
          totalAmount: Math.round(stats.totalAmount),
          orderCount: stats.orders.length,
          firstOrderDate: stats.firstOrderDate.toISOString().split('T')[0]
        })),
        topItems: returningCustomerItems.slice(0, 20) // 前20個最常點的品項
      }
    })

  } catch (error) {
    console.error('分析客戶偏好時發生錯誤:', error)
    return NextResponse.json({ 
      error: '分析失敗', 
      details: error instanceof Error ? error.message : '未知錯誤' 
    }, { status: 500 })
  }
}