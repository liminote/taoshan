import { NextResponse } from 'next/server'

export async function GET() {
  try {
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
    
    // 取得前5筆資料作為樣本
    const sampleData = orderLines.slice(1, 6).map(line => {
      const values = line.split(',').map(v => v.replace(/"/g, '').trim())
      const record: Record<string, string> = {}
      orderHeaders.forEach((header, index) => {
        record[header] = values[index] || ''
      })
      return record
    })

    return NextResponse.json({
      success: true,
      headers: orderHeaders,
      sampleData: sampleData,
      totalLines: orderLines.length - 1
    })

  } catch (error) {
    console.error('查看訂單欄位失敗:', error)
    return NextResponse.json({ 
      error: '查看訂單欄位失敗',
      details: error instanceof Error ? error.message : '未知錯誤'
    }, { status: 500 })
  }
}