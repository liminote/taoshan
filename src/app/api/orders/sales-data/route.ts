import { NextResponse, NextRequest } from 'next/server'
import { reportCache, CACHE_KEYS } from '@/lib/cache'
import { parseCsv } from '@/lib/csv'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '0', 10)
    const month = searchParams.get('month') // 可選的月份篩選

    // 生成快取鍵
    const cacheKey = `${CACHE_KEYS.ORDERS_FULL}_${month || 'all'}_${limit || 'all'}`
    
    // 先檢查快取
    const cachedData = reportCache.get(cacheKey)
    if (cachedData) {
      console.log('📋 使用快取的訂單銷售資料')
      return NextResponse.json({
        success: true,
        data: cachedData.orders,
        summary: cachedData.summary,
        cached: true,
        cacheTimestamp: reportCache.getTimestamp(cacheKey)
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
    const orderRows = parseCsv(orderCsv)
    if (orderRows.length === 0) {
      console.error('訂單 CSV 無有效資料')
      return NextResponse.json({ error: '查詢失敗' }, { status: 500 })
    }

    const orderHeaders = orderRows[0].map(h => h.trim())
    const orderLines = orderRows.slice(1)
    
    console.log('📊 訂單表格欄位:', orderHeaders)
    
    // 動態找出所有欄位索引
    const headerIndexMap: { [key: string]: number } = {}
    orderHeaders.forEach((header, index) => {
      headerIndexMap[header] = index
    })
    
    const orders = orderLines.map((line, lineIndex) => {
      const values = line.map(v => v.trim())
      
      // 動態建立訂單對象，包含所有欄位
      const order: any = {}
      
      orderHeaders.forEach((header, index) => {
        let value = values[index] || ''
        
        // 特殊處理數值欄位
        if (header.includes('金額') || header.includes('價格') || header.includes('折扣')) {
          value = parseFloat(value) || 0
        }
        
        // 處理時間欄位
        if (header.includes('時間')) {
          if (value && value !== '') {
            try {
              const dateStr = value.replace(/\//g, '-')
              const dateObj = new Date(dateStr)
              
              if (!isNaN(dateObj.getTime())) {
                order[`${header}_parsed`] = dateObj.toISOString()
                order[`${header}_year`] = dateObj.getFullYear()
                order[`${header}_month`] = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`
                order[`${header}_date`] = dateObj.toISOString().split('T')[0]
                order[`${header}_hour`] = dateObj.getHours()
                order[`${header}_day_name`] = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dateObj.getDay()]
                
                // 時段分析
                const hour = dateObj.getHours()
                let timePeriod = '其他時段'
                if (hour >= 6 && hour < 11) timePeriod = '早餐時段(6-11)'
                else if (hour >= 11 && hour < 14) timePeriod = '午餐時段(11-14)'
                else if (hour >= 14 && hour < 17) timePeriod = '下午茶時段(14-17)'
                else if (hour >= 17 && hour < 21) timePeriod = '晚餐時段(17-21)'
                else if (hour >= 21 && hour < 24) timePeriod = '宵夜時段(21-24)'
                else if (hour >= 0 && hour < 6) timePeriod = '深夜時段(0-6)'
                
                order[`${header}_time_period`] = timePeriod
              }
            } catch (error) {
              console.warn(`無法解析時間 ${header}:`, value)
            }
          }
        }
        
        // 設定原始值
        order[header] = value
      })
      
      // 添加行號用於除錯
      order['_rowNumber'] = lineIndex + 2 // +2 因為第一行是標題，且從1開始計算
      
      return order
    }).filter(order => {
      // 基本過濾：必須有發票號碼和非零金額
      const invoiceNumber = order['發票號碼'] || order['Invoice Number'] || ''
      const amount = order['結帳金額'] || order['金額'] || order['Amount'] || 0
      return invoiceNumber && invoiceNumber !== '' && amount > 0
    })

    // 如果指定了月份，進行月份篩選
    let filteredOrders = orders
    if (month) {
      filteredOrders = orders.filter(order => {
        const checkoutTime = order['結帳時間'] || order['時間'] || ''
        if (!checkoutTime) return false
        
        const monthKey = order['結帳時間_month'] || order['時間_month']
        return monthKey === month
      })
      console.log(`📊 月份篩選 (${month}): ${filteredOrders.length} / ${orders.length}`)
    }

    // 如果指定了限制數量
    if (limit > 0) {
      filteredOrders = filteredOrders.slice(0, limit)
    }

    console.log(`📊 處理完成，共 ${filteredOrders.length} 筆有效訂單記錄`)
    
    // 計算統計摘要
    const summary = {
      totalOrders: filteredOrders.length,
      totalAmount: Math.round(filteredOrders.reduce((sum, order) => {
        const amount = order['結帳金額'] || order['金額'] || order['Amount'] || 0
        return sum + amount
      }, 0) * 100) / 100,
      
      totalDiscount: Math.round(filteredOrders.reduce((sum, order) => {
        const discount = order['折扣金額'] || order['Discount'] || 0
        return sum + discount
      }, 0) * 100) / 100,
      
      averageOrderValue: filteredOrders.length > 0 ? Math.round((filteredOrders.reduce((sum, order) => {
        const amount = order['結帳金額'] || order['金額'] || order['Amount'] || 0
        return sum + amount
      }, 0) / filteredOrders.length) * 100) / 100 : 0,
      
      // 日期範圍
      dateRange: (() => {
        const dates = filteredOrders
          .map(o => o['結帳時間'] || o['時間'])
          .filter(d => d && d !== '')
          .sort()
        
        return dates.length > 0 ? {
          earliest: dates[0],
          latest: dates[dates.length - 1]
        } : null
      })(),
      
      // 月份統計
      monthStats: filteredOrders.reduce((acc, order) => {
        const month = order['結帳時間_month'] || order['時間_month']
        if (month) {
          const amount = order['結帳金額'] || order['金額'] || order['Amount'] || 0
          if (!acc[month]) acc[month] = { count: 0, amount: 0 }
          acc[month].count += 1
          acc[month].amount += amount
        }
        return acc
      }, {} as Record<string, {count: number, amount: number}>),
      
      // 訂單來源統計
      orderSourceStats: filteredOrders.reduce((acc, order) => {
        const source = order['訂單來源'] || order['Order Source'] || '未知'
        if (!acc[source]) acc[source] = { count: 0, amount: 0 }
        acc[source].count += 1
        acc[source].amount += (order['結帳金額'] || order['金額'] || order['Amount'] || 0)
        return acc
      }, {} as Record<string, {count: number, amount: number}>),
      
      // 訂單種類統計
      orderTypeStats: filteredOrders.reduce((acc, order) => {
        const type = order['訂單種類'] || order['Order Type'] || '未知'
        if (!acc[type]) acc[type] = { count: 0, amount: 0 }
        acc[type].count += 1
        acc[type].amount += (order['結帳金額'] || order['金額'] || order['Amount'] || 0)
        return acc
      }, {} as Record<string, {count: number, amount: number}>),
      
      // 時段統計
      timePeriodStats: filteredOrders.reduce((acc, order) => {
        const period = order['結帳時間_time_period'] || order['時間_time_period'] || '未知時段'
        if (!acc[period]) acc[period] = { count: 0, amount: 0 }
        acc[period].count += 1
        acc[period].amount += (order['結帳金額'] || order['金額'] || order['Amount'] || 0)
        return acc
      }, {} as Record<string, {count: number, amount: number}>),
      
      // 星期統計
      dayStats: filteredOrders.reduce((acc, order) => {
        const day = order['結帳時間_day_name'] || order['時間_day_name']
        if (day) {
          if (!acc[day]) acc[day] = { count: 0, amount: 0 }
          acc[day].count += 1
          acc[day].amount += (order['結帳金額'] || order['金額'] || order['Amount'] || 0)
        }
        return acc
      }, {} as Record<string, {count: number, amount: number}>),
      
      // 桌號統計（內用訂單）
      tableStats: filteredOrders.reduce((acc, order) => {
        const table = order['桌號'] || order['Table Number'] || ''
        const orderType = order['訂單種類'] || order['Order Type'] || ''
        if (table && table !== '' && table !== '--' && orderType === '內用') {
          if (!acc[table]) acc[table] = { count: 0, amount: 0 }
          acc[table].count += 1
          acc[table].amount += (order['結帳金額'] || order['金額'] || order['Amount'] || 0)
        }
        return acc
      }, {} as Record<string, {count: number, amount: number}>),
      
      // 可用欄位
      availableFields: orderHeaders,
      
      // 篩選參數
      filters: {
        month: month || null,
        limit: limit || null
      }
    }
    
    const result = {
      orders: filteredOrders,
      summary: summary
    }
    
    // 儲存到快取
    reportCache.set(cacheKey, result)
    
    console.log(`✅ 訂單銷售資料處理完成，快取已更新`)
    
    return NextResponse.json({
      success: true,
      data: filteredOrders,
      summary: summary,
      cached: false,
      computed: true
    })

  } catch (error) {
    console.error('處理訂單銷售資料時發生錯誤:', error)
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 })
  }
}
