import { NextRequest, NextResponse } from 'next/server'
import { getOrderSalesData, formatDataForAI, analyzeSheetData } from '@/lib/sheets-data'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sheetName = searchParams.get('sheet') || 'Sheet1'
    const format = searchParams.get('format') || 'json' // json | ai-summary | analysis
    const maxRows = parseInt(searchParams.get('maxRows') || '100')

    const data = await getOrderSalesData(sheetName)

    switch (format) {
      case 'ai-summary':
        return NextResponse.json({
          success: true,
          dataSource: '訂單銷售列表 (Google Sheets)',
          aiSummary: formatDataForAI(data, maxRows),
          totalRows: data.totalRows,
          headers: data.headers
        })

      case 'analysis':
        const analysis = analyzeSheetData(data)
        return NextResponse.json({
          success: true,
          dataSource: '訂單銷售列表 (Google Sheets)', 
          data: data.rows,
          headers: data.headers,
          totalRows: data.totalRows,
          analysis
        })

      default:
        return NextResponse.json({
          success: true,
          dataSource: '訂單銷售列表 (Google Sheets)',
          data: data.rows,
          headers: data.headers,
          totalRows: data.totalRows
        })
    }

  } catch (error) {
    console.error('訂單銷售列表 API 錯誤:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: '獲取訂單銷售數據失敗',
        details: error.message
      },
      { status: 500 }
    )
  }
}