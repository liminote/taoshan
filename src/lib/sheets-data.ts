import { getGoogleSheetsClient } from './google-sheets'

// Google Sheets 文件 ID 配置
const SHEET_IDS = {
  PRODUCT_SALES: '1GeRbtCX_oHJBooYvZeRbREaSxJ4r8P8QoL-vHiSz2eo', // 商品銷售報表
  ORDER_SALES: '1EWPECWQp_Ehz43Lfks_I8lcvEig8gV9DjyjEIzC5EO4',   // 訂單銷售列表  
  PRODUCT_MASTER: '18iWZVRT8LB7I_WBNXGPl3WI8S3zEVq5ANq5yTj8Nzd8'  // 商品主檔
}

interface SheetRow {
  [key: string]: string | number | null
}

interface SheetData {
  headers: string[]
  rows: SheetRow[]
  totalRows: number
}

export async function getSheetData(
  spreadsheetId: string,
  sheetName: string = 'Sheet1',
  range?: string
): Promise<SheetData> {
  try {
    const sheets = await getGoogleSheetsClient()
    const fullRange = range || `${sheetName}!A:Z`
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: fullRange
    })

    const values = response.data.values || []
    if (values.length === 0) {
      return { headers: [], rows: [], totalRows: 0 }
    }

    const headers = values[0] as string[]
    const dataRows = values.slice(1)
    
    const rows: SheetRow[] = dataRows.map((row: any[]) => {
      const rowData: SheetRow = {}
      headers.forEach((header, index) => {
        rowData[header] = row[index] || null
      })
      return rowData
    })

    return {
      headers,
      rows,
      totalRows: rows.length
    }
  } catch (error) {
    console.error(`獲取 Google Sheets 數據失敗 (${spreadsheetId}):`, error)
    throw new Error(`無法獲取 Google Sheets 數據: ${error.message}`)
  }
}

// 商品銷售報表數據
export async function getProductSalesData(sheetName: string = 'Sheet1'): Promise<SheetData> {
  return getSheetData(SHEET_IDS.PRODUCT_SALES, sheetName)
}

// 訂單銷售列表數據
export async function getOrderSalesData(sheetName: string = 'Sheet1'): Promise<SheetData> {
  return getSheetData(SHEET_IDS.ORDER_SALES, sheetName)
}

// 商品主檔數據
export async function getProductMasterData(sheetName: string = 'Sheet1'): Promise<SheetData> {
  return getSheetData(SHEET_IDS.PRODUCT_MASTER, sheetName)
}

// 組合商品分類分析數據（商品銷售報表 + 商品主檔）
export async function getCategoryAnalysisData(sheetName: string = 'Sheet1'): Promise<{
  productSales: SheetData
  productMaster: SheetData
  combinedSummary: {
    totalProducts: number
    totalSalesRecords: number
    availableCategories: string[]
  }
}> {
  try {
    const [productSales, productMaster] = await Promise.all([
      getProductSalesData(sheetName),
      getProductMasterData(sheetName)
    ])

    // 提取可用的商品分類
    const categories = new Set<string>()
    productMaster.rows.forEach(row => {
      const category = row['大分類'] || row['category'] || row['分類']
      if (category && typeof category === 'string') {
        categories.add(category.toString())
      }
    })

    return {
      productSales,
      productMaster,
      combinedSummary: {
        totalProducts: productMaster.totalRows,
        totalSalesRecords: productSales.totalRows,
        availableCategories: Array.from(categories)
      }
    }
  } catch (error) {
    console.error('獲取商品分類分析數據失敗:', error)
    throw new Error(`無法獲取分類分析數據: ${error.message}`)
  }
}

// 格式化數據為 AI 可讀的摘要
export function formatDataForAI(data: SheetData, maxRows: number = 50): string {
  const { headers, rows, totalRows } = data
  
  if (totalRows === 0) {
    return '無可用數據'
  }

  let summary = `數據摘要：總共 ${totalRows} 筆記錄\n`
  summary += `欄位：${headers.join(', ')}\n\n`
  
  if (totalRows <= maxRows) {
    summary += '完整數據：\n'
    rows.forEach((row, index) => {
      const rowStr = headers.map(h => `${h}: ${row[h] || 'N/A'}`).join(', ')
      summary += `${index + 1}. ${rowStr}\n`
    })
  } else {
    summary += `前 ${maxRows} 筆數據樣本：\n`
    rows.slice(0, maxRows).forEach((row, index) => {
      const rowStr = headers.map(h => `${h}: ${row[h] || 'N/A'}`).join(', ')
      summary += `${index + 1}. ${rowStr}\n`
    })
    summary += `\n... 還有 ${totalRows - maxRows} 筆數據未顯示`
  }

  return summary
}

// 數據統計分析
export function analyzeSheetData(data: SheetData): {
  numericColumns: string[]
  textColumns: string[]
  statistics: { [column: string]: { min?: number, max?: number, avg?: number, count: number } }
} {
  const { headers, rows } = data
  const numericColumns: string[] = []
  const textColumns: string[] = []
  const statistics: { [column: string]: { min?: number, max?: number, avg?: number, count: number } } = {}

  headers.forEach(header => {
    const values = rows.map(row => row[header]).filter(val => val !== null && val !== '')
    const numericValues = values.map(val => parseFloat(val as string)).filter(val => !isNaN(val))
    
    if (numericValues.length > values.length * 0.7) {
      // 如果70%以上的值是數字，視為數字欄位
      numericColumns.push(header)
      statistics[header] = {
        min: Math.min(...numericValues),
        max: Math.max(...numericValues),
        avg: numericValues.reduce((a, b) => a + b, 0) / numericValues.length,
        count: numericValues.length
      }
    } else {
      textColumns.push(header)
      statistics[header] = {
        count: values.length
      }
    }
  })

  return { numericColumns, textColumns, statistics }
}