import { NextResponse } from 'next/server'
import { reportCache, CACHE_KEYS } from '@/lib/cache'

export async function GET() {
  try {
    // 先檢查快取
    const cachedData = reportCache.get(CACHE_KEYS.ORDERS_FULL)
    if (cachedData) {
      console.log('📋 使用快取的完整訂單資料')
      return NextResponse.json({
        success: true,
        data: cachedData.orders,
        summary: cachedData.summary,
        cached: true,
        cacheTimestamp: reportCache.getTimestamp(CACHE_KEYS.ORDERS_FULL)
      })
    }

    console.log('⚠️ 無快取資料，執行即時計算...')
    
    // 使用 Google Sheets 訂單資料來源
    const orderSheetUrl = 'https://docs.google.com/spreadsheets/d/1EWPECWQp_Ehz43Lfks_I8lcvEig8gV9DjyjEIzC5EO4/export?format=csv&gid=0'
    
    const orderResponse = await fetch(orderSheetUrl)
    if (!orderResponse.ok) {
      console.error('無法獲取 Google Sheets 訂單資料')
      return NextResponse.json({ error: '查詢失敗' }, { status: 500 })
    }

    const orderCsv = await orderResponse.text()
    
    // 解析訂單 CSV 資料
    const orderLines = orderCsv.split('\n').filter(line => line.trim())
    const orderHeaders = orderLines[0].split(',').map(h => h.replace(/"/g, '').trim())
    
    console.log('📊 訂單表格欄位:', orderHeaders)
    
    // 找到需要的欄位索引
    const checkoutTimeIndex = orderHeaders.findIndex(h => h.includes('結帳時間'))
    const invoiceNumberIndex = orderHeaders.findIndex(h => h.includes('發票號碼'))
    const checkoutAmountIndex = orderHeaders.findIndex(h => h.includes('結帳金額'))
    const discountIndex = orderHeaders.findIndex(h => h.includes('折扣金額'))
    const orderSourceIndex = orderHeaders.findIndex(h => h.includes('訂單來源'))
    const orderTypeIndex = orderHeaders.findIndex(h => h.includes('訂單種類'))
    const tableNumberIndex = orderHeaders.findIndex(h => h.includes('桌號'))
    const statusIndex = orderHeaders.findIndex(h => h.includes('目前概況'))
    
    const orders = orderLines.slice(1).map(line => {
      const values = line.split(',').map(v => v.replace(/"/g, '').trim())
      
      const checkoutTime = values[checkoutTimeIndex] || ''
      const invoiceAmount = parseFloat(values[checkoutAmountIndex]) || 0
      
      // 解析結帳時間
      let dateObj = null
      let month = null
      let year = null
      let hour = null
      let dayName = null
      
      if (checkoutTime) {
        try {
          const dateStr = checkoutTime.replace(/\//g, '-')
          dateObj = new Date(dateStr)
          
          if (!isNaN(dateObj.getTime())) {
            year = dateObj.getFullYear()
            month = `${year}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`
            hour = dateObj.getHours()
            
            // 計算星期幾
            const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
            dayName = days[dateObj.getDay()]
          }
        } catch (error) {
          console.warn('日期解析錯誤:', checkoutTime)
        }
      }
      
      // 時段分析
      let timePeriod = '其他時段'
      if (hour !== null) {
        if (hour >= 6 && hour < 11) timePeriod = '早餐時段(6-11)'
        else if (hour >= 11 && hour < 14) timePeriod = '午餐時段(11-14)'
        else if (hour >= 14 && hour < 17) timePeriod = '下午茶時段(14-17)'
        else if (hour >= 17 && hour < 21) timePeriod = '晚餐時段(17-21)'
        else if (hour >= 21 && hour < 24) timePeriod = '宵夜時段(21-24)'
        else if (hour >= 0 && hour < 6) timePeriod = '深夜時段(0-6)'
      }
      
      return {
        checkoutTime: checkoutTime,
        invoiceNumber: values[invoiceNumberIndex] || '',
        invoiceAmount: invoiceAmount,
        discountAmount: parseFloat(values[discountIndex]) || 0,
        orderSource: values[orderSourceIndex] || '未知',
        orderType: values[orderTypeIndex] || '未知',
        tableNumber: values[tableNumberIndex] || '',
        status: values[statusIndex] || '',
        
        // 計算欄位
        year: year,
        month: month,
        hour: hour,
        dayName: dayName,
        timePeriod: timePeriod,
        date: dateObj ? dateObj.toISOString().split('T')[0] : null
      }
    }).filter(order => order.checkoutTime && order.checkoutTime !== '' && order.invoiceAmount > 0)

    console.log(`📊 處理完成，共 ${orders.length} 筆有效訂單`)
    
    // 計算統計摘要
    const summary = {
      totalOrders: orders.length,
      totalAmount: Math.round(orders.reduce((sum, order) => sum + order.invoiceAmount, 0) * 100) / 100,
      totalDiscount: Math.round(orders.reduce((sum, order) => sum + order.discountAmount, 0) * 100) / 100,
      averageOrderValue: orders.length > 0 ? Math.round((orders.reduce((sum, order) => sum + order.invoiceAmount, 0) / orders.length) * 100) / 100 : 0,
      
      // 日期範圍
      dateRange: {
        earliest: orders.length > 0 ? orders.reduce((min, order) => order.checkoutTime < min ? order.checkoutTime : min, orders[0].checkoutTime) : null,
        latest: orders.length > 0 ? orders.reduce((max, order) => order.checkoutTime > max ? order.checkoutTime : max, orders[0].checkoutTime) : null
      },
      
      // 按年份統計
      yearStats: orders.reduce((acc, order) => {
        if (order.year) {
          const year = order.year.toString()
          if (!acc[year]) acc[year] = { count: 0, amount: 0 }
          acc[year].count += 1
          acc[year].amount += order.invoiceAmount
        }
        return acc
      }, {} as Record<string, {count: number, amount: number}>),
      
      // 按月份統計
      monthStats: orders.reduce((acc, order) => {
        if (order.month) {
          if (!acc[order.month]) acc[order.month] = { count: 0, amount: 0 }
          acc[order.month].count += 1
          acc[order.month].amount += order.invoiceAmount
        }
        return acc
      }, {} as Record<string, {count: number, amount: number}>),
      
      // 時段統計
      timePeriodStats: orders.reduce((acc, order) => {
        const period = order.timePeriod
        if (!acc[period]) acc[period] = { count: 0, amount: 0 }
        acc[period].count += 1
        acc[period].amount += order.invoiceAmount
        return acc
      }, {} as Record<string, {count: number, amount: number}>),
      
      // 訂單來源統計
      orderSourceStats: orders.reduce((acc, order) => {
        const source = order.orderSource
        if (!acc[source]) acc[source] = { count: 0, amount: 0 }
        acc[source].count += 1
        acc[source].amount += order.invoiceAmount
        return acc
      }, {} as Record<string, {count: number, amount: number}>),
      
      // 星期統計
      dayStats: orders.reduce((acc, order) => {
        if (order.dayName) {
          const day = order.dayName
          if (!acc[day]) acc[day] = { count: 0, amount: 0 }
          acc[day].count += 1
          acc[day].amount += order.invoiceAmount
        }
        return acc
      }, {} as Record<string, {count: number, amount: number}>)
    }
    
    const result = {
      orders: orders,
      summary: summary
    }
    
    // 儲存到快取
    reportCache.set(CACHE_KEYS.ORDERS_FULL, result)
    
    console.log(`✅ 完整訂單資料處理完成，快取已更新`)
    
    return NextResponse.json({
      success: true,
      data: orders,
      summary: summary,
      cached: false,
      computed: true
    })

  } catch (error) {
    console.error('處理完整訂單資料時發生錯誤:', error)
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 })
  }
}