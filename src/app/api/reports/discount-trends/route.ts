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
    const months = allMonths.slice(-13)

    // 使用 Google Sheets 訂單資料
    const orderSheetUrl = 'https://docs.google.com/spreadsheets/d/1EWPECWQp_Ehz43Lfks_I8lcvEig8gV9DjyjEIzC5EO4/export?format=csv&gid=0'
    
    const orderResponse = await fetch(orderSheetUrl)

    if (!orderResponse.ok) {
      console.error('無法獲取 Google Sheets 資料')
      return NextResponse.json({ error: '查詢失敗' }, { status: 500 })
    }

    const orderCsv = await orderResponse.text()

    // 解析訂單 CSV 資料
    const orderLines = orderCsv.split('\n').filter(line => line.trim())
    const orderHeaders = orderLines[0].split(',').map(h => h.replace(/"/g, '').trim())
    
    // 找到需要的欄位索引
    const checkoutTimeIndex = orderHeaders.findIndex(h => h.includes('結帳時間'))
    const discountIndex = orderHeaders.findIndex(h => h.includes('折扣金額'))
    
    const orderData = orderLines.slice(1).map(line => {
      const values = line.split(',').map(v => v.replace(/"/g, '').trim())
      return {
        checkout_time: values[checkoutTimeIndex],
        discount_amount: parseFloat(values[discountIndex]) || 0
      }
    }).filter(record => record.checkout_time && record.checkout_time !== '')

    // 初始化所有月份的統計數據
    const monthlyStats: { [key: string]: number } = {}
    months.forEach(month => {
      monthlyStats[month] = 0
    })

    // 處理折扣資料
    if (orderData && orderData.length > 0) {
      console.log(`取得 ${orderData.length} 筆訂單折扣資料`)
      let processedCount = 0
      
      orderData.forEach((record) => {
        if (record.checkout_time) {
          // 處理日期格式 YYYY-MM-DD HH:MM:SS 或 YYYY/MM/DD HH:MM:SS
          const dateStr = record.checkout_time.replace(/\//g, '-')
          const date = new Date(dateStr)
          
          if (!isNaN(date.getTime())) {
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
            
            if (monthlyStats.hasOwnProperty(monthKey)) {
              monthlyStats[monthKey] += record.discount_amount || 0
              processedCount++
            }
          }
        }
      })
      
      console.log(`處理了 ${processedCount} 筆有效折扣資料`)
    }

    // 轉換為陣列格式並按時間排序（最新在前）
    const result = months.map(month => ({
      month: month,
      monthDisplay: month.replace('-', '年') + '月',
      discountAmount: Math.round(monthlyStats[month] * 100) / 100
    }))

    return NextResponse.json({
      success: true,
      data: result
    })

  } catch (error) {
    console.error('處理折扣趨勢報表時發生錯誤:', error)
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 })
  }
}