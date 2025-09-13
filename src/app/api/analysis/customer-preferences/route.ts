import { NextResponse } from 'next/server'

export async function GET() {
  try {
    console.log('🚀 開始分析新客與新回客的消費偏好...')
    
    // 使用現有的客戶排行榜API來獲取數據
    const apiResponse = await fetch('https://restaurant-management-pi.vercel.app/api/reports/customer-spending-ranking?month=2024-11')
    
    if (!apiResponse.ok) {
      throw new Error('無法獲取客戶排行榜資料')
    }

    const apiData = await apiResponse.json()
    
    if (!apiData.success || !apiData.data || !apiData.data.customers) {
      throw new Error('客戶排行榜資料格式錯誤')
    }

    console.log(`📊 獲取到 ${apiData.data.customers.length} 個客戶資料`)
    
    // 取前30名客戶
    const top30Customers = apiData.data.customers.slice(0, 30)
    
    // 分析新客與新回客
    const newCustomers = top30Customers.filter(customer => 
      customer.isNewCustomer && !customer.hasReturnedAfterNew
    )
    
    const returningCustomers = top30Customers.filter(customer => 
      customer.isNewCustomer && customer.hasReturnedAfterNew
    )

    console.log(`👥 新客: ${newCustomers.length} 人`)
    console.log(`🔄 新回客: ${returningCustomers.length} 人`)

    // 分析品項偏好
    const analyzeCustomerItems = (customers) => {
      const itemStats = {}
      
      customers.forEach(customer => {
        // 從客戶的詳細訂單中提取品項信息
        if (customer.orderDetails && customer.orderDetails.length > 0) {
          customer.orderDetails.forEach(order => {
            if (order.items) {
              // 解析品項列表
              const items = order.items.split(',').map(item => item.trim()).filter(Boolean)
              
              items.forEach(item => {
                // 提取商品名稱和價格 (格式: "商品名 $價格")
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
            }
          })
        }
      })
      
      return Object.entries(itemStats)
        .map(([item, stats]) => ({
          item,
          quantity: stats.quantity,
          totalAmount: Math.round(stats.totalAmount)
        }))
        .sort((a, b) => b.totalAmount - a.totalAmount)
    }

    const newCustomerItems = analyzeCustomerItems(newCustomers)
    const returningCustomerItems = analyzeCustomerItems(returningCustomers)

    console.log(`🍽️ 新客品項數: ${newCustomerItems.length}`)
    console.log(`🍽️ 新回客品項數: ${returningCustomerItems.length}`)

    // 如果沒有詳細品項數據，至少返回客戶基本信息
    const newCustomerSummary = newCustomers.map(customer => ({
      customerKey: customer.phone || customer.name,
      name: customer.name,
      phone: customer.phone,
      totalAmount: Math.round(customer.totalAmount),
      orderCount: customer.orderCount || 0
    }))

    const returningCustomerSummary = returningCustomers.map(customer => ({
      customerKey: customer.phone || customer.name,
      name: customer.name,
      phone: customer.phone,
      totalAmount: Math.round(customer.totalAmount),
      orderCount: customer.orderCount || 0
    }))

    return NextResponse.json({
      success: true,
      period: '2024年11月',
      summary: {
        totalTop30: top30Customers.length,
        newCustomers: newCustomers.length,
        returningCustomers: returningCustomers.length
      },
      newCustomerPreferences: {
        customers: newCustomerSummary,
        topItems: newCustomerItems.slice(0, 20)
      },
      returningCustomerPreferences: {
        customers: returningCustomerSummary,
        topItems: returningCustomerItems.slice(0, 20)
      },
      // 也提供客戶基本數據用於額外分析
      rawData: {
        newCustomers: newCustomers.map(c => ({
          name: c.name,
          phone: c.phone,
          totalAmount: c.totalAmount,
          orderCount: c.orderCount,
          avgOrderValue: c.totalAmount / (c.orderCount || 1)
        })),
        returningCustomers: returningCustomers.map(c => ({
          name: c.name,
          phone: c.phone,
          totalAmount: c.totalAmount,
          orderCount: c.orderCount,
          avgOrderValue: c.totalAmount / (c.orderCount || 1)
        }))
      }
    })

  } catch (error) {
    console.error('❌ 分析客戶偏好時發生錯誤:', error)
    return NextResponse.json({ 
      error: '分析失敗', 
      details: error instanceof Error ? error.message : '未知錯誤' 
    }, { status: 500 })
  }
}