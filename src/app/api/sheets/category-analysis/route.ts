import { NextRequest, NextResponse } from 'next/server'
import { getCategoryAnalysisData, formatDataForAI, analyzeSheetData } from '@/lib/sheets-data'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sheetName = searchParams.get('sheet') || 'Sheet1'
    const format = searchParams.get('format') || 'json' // json | ai-summary | analysis
    const maxRows = parseInt(searchParams.get('maxRows') || '50')

    const data = await getCategoryAnalysisData(sheetName)

    switch (format) {
      case 'ai-summary':
        const productSalesSummary = formatDataForAI(data.productSales, maxRows)
        const productMasterSummary = formatDataForAI(data.productMaster, maxRows)
        
        const aiSummary = `
商品分類分析數據摘要：

【商品銷售報表部分】
${productSalesSummary}

【商品主檔部分】  
${productMasterSummary}

【整合統計】
- 商品總數：${data.combinedSummary.totalProducts} 項
- 銷售記錄總數：${data.combinedSummary.totalSalesRecords} 筆  
- 可用分類：${data.combinedSummary.availableCategories.join(', ')}
`
        
        return NextResponse.json({
          success: true,
          dataSource: '商品銷售報表 + 商品主檔 (Google Sheets)',
          aiSummary,
          combinedSummary: data.combinedSummary
        })

      case 'analysis':
        const salesAnalysis = analyzeSheetData(data.productSales)
        const masterAnalysis = analyzeSheetData(data.productMaster)
        
        return NextResponse.json({
          success: true,
          dataSource: '商品銷售報表 + 商品主檔 (Google Sheets)', 
          productSales: {
            data: data.productSales.rows,
            headers: data.productSales.headers,
            totalRows: data.productSales.totalRows,
            analysis: salesAnalysis
          },
          productMaster: {
            data: data.productMaster.rows,
            headers: data.productMaster.headers,
            totalRows: data.productMaster.totalRows,
            analysis: masterAnalysis
          },
          combinedSummary: data.combinedSummary
        })

      default:
        return NextResponse.json({
          success: true,
          dataSource: '商品銷售報表 + 商品主檔 (Google Sheets)',
          productSales: {
            data: data.productSales.rows,
            headers: data.productSales.headers,
            totalRows: data.productSales.totalRows
          },
          productMaster: {
            data: data.productMaster.rows,
            headers: data.productMaster.headers,
            totalRows: data.productMaster.totalRows
          },
          combinedSummary: data.combinedSummary
        })
    }

  } catch (error) {
    console.error('商品分類分析 API 錯誤:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: '獲取商品分類分析數據失敗',
        details: error.message
      },
      { status: 500 }
    )
  }
}