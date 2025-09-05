import { google } from 'googleapis'

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets']

export async function getGoogleSheetsClient() {
  try {
    const credentials = JSON.parse(
      process.env.GOOGLE_SHEETS_CREDENTIALS || '{}'
    )

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: SCOPES,
    })

    const sheets = google.sheets({ version: 'v4', auth })
    return sheets
  } catch (error) {
    console.error('Google Sheets 認證失敗:', error)
    throw new Error('Google Sheets API 初始化失敗')
  }
}

export async function addProductToMasterSheet(
  spreadsheetId: string,
  sheetName: string,
  productData: {
    productName: string
    newProductName?: string
    category: string
    smallCategory: string
  }
) {
  try {
    const sheets = await getGoogleSheetsClient()
    
    const range = `${sheetName}!A:Z`
    
    const newRow = [
      productData.productName,
      productData.newProductName || '',
      productData.category,
      productData.smallCategory,
      new Date().toISOString().split('T')[0]
    ]

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range,
      valueInputOption: 'RAW',
      requestBody: {
        values: [newRow]
      }
    })

    console.log(`新商品已加入: ${productData.productName}`)
    return { success: true, message: '商品已成功新增至 Google Sheets' }
    
  } catch (error) {
    console.error('新增商品至 Google Sheets 失敗:', error)
    throw new Error('新增商品失敗')
  }
}

export async function updateProductInMasterSheet(
  spreadsheetId: string, 
  sheetName: string,
  rowIndex: number,
  productData: {
    productName: string
    newProductName?: string
    category: string
    smallCategory: string
  }
) {
  try {
    const sheets = await getGoogleSheetsClient()
    
    const range = `${sheetName}!A${rowIndex + 1}:E${rowIndex + 1}`
    
    const updatedRow = [
      productData.productName,
      productData.newProductName || '',
      productData.category,
      productData.smallCategory,
      new Date().toISOString().split('T')[0]
    ]

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: 'RAW',
      requestBody: {
        values: [updatedRow]
      }
    })

    console.log(`商品已更新: ${productData.productName}`)
    return { success: true, message: '商品已成功更新至 Google Sheets' }
    
  } catch (error) {
    console.error('更新商品至 Google Sheets 失敗:', error)
    throw new Error('更新商品失敗')
  }
}

export async function getSheetHeaders(
  spreadsheetId: string,
  sheetName: string
) {
  try {
    const sheets = await getGoogleSheetsClient()
    
    const range = `${sheetName}!1:1`
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range
    })

    return response.data.values?.[0] || []
  } catch (error) {
    console.error('取得 Sheet 標題失敗:', error)
    throw new Error('無法取得 Sheet 標題')
  }
}