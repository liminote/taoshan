import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50000') // 增加默認限制以獲取更多歷史數據
    
    // 使用與其他 API 相同的訂單銷售列表 Google Sheets 數據來源
    const orderSheetUrl = 'https://docs.google.com/spreadsheets/d/1EWPECWQp_Ehz43Lfks_I8lcvEig8gV9DjyjEIzC5EO4/export?format=csv&gid=0'
    
    console.log('🔍 獲取完整訂單數據...')
    
    const orderResponse = await fetch(orderSheetUrl)

    if (!orderResponse.ok) {
      console.error('無法獲取訂單 Google Sheets 資料')
      return NextResponse.json({ error: '無法獲取訂單數據' }, { status: 500 })
    }

    const orderCsv = await orderResponse.text()

    // 解析訂單資料 CSV
    const orderLines = orderCsv.split('\n').filter(line => line.trim())
    const orderHeaders = orderLines[0].split(',').map(h => h.replace(/"/g, '').trim())
    
    console.log('📊 訂單表欄位:', orderHeaders)
    console.log('📊 總共有', orderLines.length - 1, '行數據（不包括標題行）')
    
    // 找到關鍵欄位索引 - 嘗試各種可能的欄位名稱
    const orderNumberIndex = orderHeaders.findIndex(h => 
      h.includes('訂單編號') || 
      h.includes('發票號碼') || 
      h.includes('編號') ||
      h.includes('ID')
    )
    const checkoutTimeIndex = orderHeaders.findIndex(h => 
      h.includes('結帳時間') || 
      h.includes('訂單時間') || 
      h.includes('時間') ||
      h.includes('日期')
    )
    const amountIndex = orderHeaders.findIndex(h => 
      h === '結帳金額' || 
      h.includes('總金額') || 
      (h.includes('金額') && !h.includes('折扣')) ||
      h.includes('價格') ||
      h.includes('Amount')
    )
    const paymentIndex = orderHeaders.findIndex(h => 
      h.includes('支付方式') || 
      h.includes('付款') || 
      h.includes('Payment')
    )
    const orderTypeIndex = orderHeaders.findIndex(h => 
      h.includes('訂單類型') || 
      h.includes('訂單種類') || 
      h.includes('類型') ||
      h.includes('Type')
    )
    const customerIndex = orderHeaders.findIndex(h => 
      h.includes('客戶') || 
      h.includes('顧客') || 
      h.includes('Customer') ||
      h.includes('姓名')
    )
    const sourceIndex = orderHeaders.findIndex(h => 
      h.includes('來源') || 
      h.includes('渠道') || 
      h.includes('Source')
    )
    
    console.log('📍 欄位索引對應:')
    console.log(`  - 訂單編號: ${orderNumberIndex} (${orderHeaders[orderNumberIndex]})`)
    console.log(`  - 結帳時間: ${checkoutTimeIndex} (${orderHeaders[checkoutTimeIndex]})`)
    console.log(`  - 金額: ${amountIndex} (${orderHeaders[amountIndex]})`)
    console.log(`  - 支付方式: ${paymentIndex} (${orderHeaders[paymentIndex]})`)
    console.log(`  - 訂單類型: ${orderTypeIndex} (${orderHeaders[orderTypeIndex]})`)
    console.log(`  - 顧客姓名: ${customerIndex} (${orderHeaders[customerIndex]})`)
    console.log(`  - 來源: ${sourceIndex} (${orderHeaders[sourceIndex]})`)
    
    // 解析每一行數據
    let allOrdersData = orderLines.slice(1).map((line, index) => {
      const values = line.split(',').map(v => v.replace(/"/g, '').trim())
      
      const orderNumber = values[orderNumberIndex] || `ORDER-${index + 1}`
      const checkoutTime = values[checkoutTimeIndex] || ''
      const amount = parseFloat(values[amountIndex]?.replace(/[^\d.-]/g, '') || '0') || 0
      const paymentMethod = values[paymentIndex] || '未知'
      const orderType = values[orderTypeIndex] || '未分類'
      const customerName = values[customerIndex] || ''
      const orderSource = values[sourceIndex] || '未知'
      
      // 解析結帳時間並添加有用的時間字段
      let dateInfo = {}
      if (checkoutTime) {
        try {
          // 處理多種日期格式
          let dateStr = checkoutTime
          
          // 處理 YYYY/MM/DD 格式
          if (dateStr.includes('/')) {
            dateStr = dateStr.replace(/\//g, '-')
          }
          
          const date = new Date(dateStr)
          if (!isNaN(date.getTime())) {
            dateInfo = {
              checkout_date: date.toISOString().split('T')[0],
              checkout_hour: date.getHours(),
              day_of_week: date.getDay(), // 0=Sunday, 1=Monday, ...
              day_name: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][date.getDay()],
              month: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
              year: date.getFullYear(),
              is_weekend: date.getDay() === 0 || date.getDay() === 6,
              time_period: getTimePeriod(date.getHours())
            }
          } else {
            console.warn('無法解析時間:', checkoutTime)
          }
        } catch (e) {
          console.warn('時間解析錯誤:', checkoutTime, e.message)
        }
      }
      
      return {
        row_index: index + 1,
        order_number: orderNumber,
        checkout_time: checkoutTime,
        invoice_amount: amount,
        payment_method: paymentMethod,
        order_type: orderType,
        customer_name: customerName,
        order_source: orderSource,
        ...dateInfo,
        raw_data: values // 保留原始數據以防需要
      }
    }).filter(item => item.checkout_time) // 只保留有時間資料的記錄
    
    console.log(`📊 解析後有效數據: ${allOrdersData.length} 筆`)
    if (allOrdersData.length > 0) {
      console.log('📊 數據時間範圍示例:')
      console.log('  - 最新:', allOrdersData[0]?.checkout_date, allOrdersData[0]?.checkout_time)
      console.log('  - 最舊:', allOrdersData[allOrdersData.length - 1]?.checkout_date, allOrdersData[allOrdersData.length - 1]?.checkout_time)
    }

    // 限制返回的記錄數
    if (allOrdersData.length > limit) {
      allOrdersData = allOrdersData.slice(0, limit)
    }

    // 計算統計摘要
    const totalRecords = allOrdersData.length
    const totalAmount = allOrdersData.reduce((sum, item) => sum + item.invoice_amount, 0)
    const uniqueCustomers = [...new Set(allOrdersData.filter(item => item.customer_name).map(item => item.customer_name))].length
    const paymentMethodStats = allOrdersData.reduce((acc: Record<string, number>, item) => {
      acc[item.payment_method] = (acc[item.payment_method] || 0) + 1
      return acc
    }, {})
    const orderTypeStats = allOrdersData.reduce((acc: Record<string, number>, item) => {
      acc[item.order_type] = (acc[item.order_type] || 0) + 1
      return acc
    }, {})
    const dateRange = totalRecords > 0 ? {
      earliest: allOrdersData[totalRecords - 1]?.checkout_date,
      latest: allOrdersData[0]?.checkout_date
    } : null

    console.log(`✅ 成功獲取 ${totalRecords} 筆完整訂單記錄`)

    return NextResponse.json({
      success: true,
      summary: {
        totalRecords,
        totalAmount: Math.round(totalAmount * 100) / 100,
        averageOrderValue: totalRecords > 0 ? Math.round((totalAmount / totalRecords) * 100) / 100 : 0,
        uniqueCustomers,
        paymentMethodStats,
        orderTypeStats,
        dateRange,
        dataSource: '訂單銷售列表 (Google Sheets CSV)',
        headers: orderHeaders
      },
      ordersData: allOrdersData,
      message: `已獲取完整訂單明細，共 ${totalRecords} 筆記錄，可進行任意條件分析`
    })

  } catch (error) {
    console.error('獲取完整訂單數據時發生錯誤:', error)
    return NextResponse.json({ 
      error: '無法獲取完整訂單數據',
      details: error.message 
    }, { status: 500 })
  }
}

// 根據小時判斷時段
function getTimePeriod(hour: number): string {
  if (hour >= 6 && hour < 11) return '早餐時段'
  if (hour >= 11 && hour < 14) return '午餐時段'
  if (hour >= 14 && hour < 17) return '下午茶時段'
  if (hour >= 17 && hour < 21) return '晚餐時段'
  if (hour >= 21 && hour < 24) return '宵夜時段'
  return '深夜時段'
}