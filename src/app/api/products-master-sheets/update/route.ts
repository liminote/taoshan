import { NextResponse } from 'next/server'
import { cache } from '../../../../lib/cache'
import { google } from 'googleapis'
import * as fs from 'fs'
import * as path from 'path'

export async function POST(request: Request) {
  try {
    const { action, data } = await request.json()
    
    // action 可以是 'add' 或 'update'
    // data 包含商品資料
    
    if (action === 'add') {
      const { original_name, new_name, category, small_category } = data
      
      if (!original_name) {
        return NextResponse.json({ error: '商品名稱為必填' }, { status: 400 })
      }
      
      // 實際新增到 Google Sheets
      console.log('準備新增商品到 Google Sheets:', data)
      
      // 嘗試實際寫入 Google Sheets
      const writeResult = await writeToGoogleSheets([
        original_name,
        new_name || original_name + '-',
        category || '未分類',
        small_category || ''
      ])
      
      if (!writeResult.success) {
        console.warn('Google Sheets 寫入失敗:', writeResult.error)
        // 不返回錯誤，繼續使用模擬模式
      }
      
      // 這裡需要呼叫 Google Sheets API 來新增一行
      // 清除相關緩存，強制重新載入資料
      cache.delete('master_data')
      cache.delete('products_master_sheets')
      console.log('已清除商品主檔緩存')
      
      // 暫時返回成功回應
      return NextResponse.json({ 
        success: true, 
        message: writeResult?.success 
          ? '商品已成功新增至 Google Sheets'
          : '商品已新增（模擬）- 請手動到 Google Sheets 確認',
        actuallyWritten: writeResult?.success || false,
        data: {
          original_name,
          new_name: new_name || original_name + '-',
          category: category || '未分類',
          small_category: small_category || ''
        }
      })
      
    } else if (action === 'update') {
      const { rowIndex, original_name, new_name, category, small_category } = data
      
      if (!rowIndex || !original_name) {
        return NextResponse.json({ error: '缺少必要參數' }, { status: 400 })
      }
      
      console.log('準備更新商品到 Google Sheets:', data)
      
      // 嘗試實際更新 Google Sheets
      const updateResult = await updateGoogleSheets(rowIndex, [
        original_name,
        new_name,
        category,
        small_category
      ])
      
      if (!updateResult.success) {
        console.warn('Google Sheets 更新失敗:', updateResult.error)
      }
      
      // 清除相關緩存，強制重新載入資料
      cache.delete('master_data')
      cache.delete('products_master_sheets')
      console.log('已清除商品主檔緩存')
      
      // TODO: 實作 Google Sheets API 更新特定行
      // 暫時返回成功回應
      return NextResponse.json({ 
        success: true, 
        message: updateResult?.success 
          ? '商品已成功更新至 Google Sheets'
          : '商品已更新（模擬）- 請手動到 Google Sheets 確認',
        actuallyWritten: updateResult?.success || false,
        data: {
          rowIndex,
          original_name,
          new_name,
          category,
          small_category
        }
      })
    }
    
    return NextResponse.json({ error: '無效的操作類型' }, { status: 400 })
    
  } catch (error) {
    console.error('處理商品主檔更新時發生錯誤:', error)
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 })
  }
}

// 為了實作真正的 Google Sheets API 寫入，我們需要：
// 1. Google Cloud Console 專案
// 2. Google Sheets API 啟用
// 3. 服務帳戶金鑰
// 4. 試算表的寫入權限

// Google Sheets API 函數實作
async function writeToGoogleSheets(values: unknown[]): Promise<{success: boolean, error?: string}> {
  try {
    console.log('開始寫入 Google Sheets:', values)
    
    // 讀取服務帳戶金鑰
    const keyFilePath = path.join(process.cwd(), 'credentials', 'google-service-account.json')
    
    if (!fs.existsSync(keyFilePath)) {
      throw new Error(`找不到金鑰檔案: ${keyFilePath}`)
    }
    
    // 建立認證
    const auth = new google.auth.GoogleAuth({
      keyFile: keyFilePath,
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    })
    
    // 建立 Google Sheets API 客戶端
    const sheets = google.sheets({ version: 'v4', auth })
    
    // Google Sheets ID - 商品主檔
    const spreadsheetId = '18iWZVRT8LB7I_WBNXGPl3WI8S3zEVq5ANq5yTj8Nzd8'
    const range = 'A:D' // 假設商品資料在 A-D 欄
    
    // 寫入新行到表格底部
    const response = await sheets.spreadsheets.values.append({
      spreadsheetId,
      range,
      valueInputOption: 'RAW',
      resource: {
        values: [values]
      }
    })
    
    console.log('Google Sheets API 寫入成功:', response.data)
    return { success: true }
    
  } catch (error) {
    console.error('Google Sheets API 錯誤:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : '未知錯誤' 
    }
  }
}

async function updateGoogleSheets(rowIndex: number, values: unknown[]): Promise<{success: boolean, error?: string}> {
  try {
    console.log(`開始更新 Google Sheets 第 ${rowIndex} 行:`, values)
    
    // 讀取服務帳戶金鑰
    const keyFilePath = path.join(process.cwd(), 'credentials', 'google-service-account.json')
    
    if (!fs.existsSync(keyFilePath)) {
      throw new Error(`找不到金鑰檔案: ${keyFilePath}`)
    }
    
    // 建立認證
    const auth = new google.auth.GoogleAuth({
      keyFile: keyFilePath,
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    })
    
    // 建立 Google Sheets API 客戶端
    const sheets = google.sheets({ version: 'v4', auth })
    
    // Google Sheets ID - 商品主檔
    const spreadsheetId = '18iWZVRT8LB7I_WBNXGPl3WI8S3zEVq5ANq5yTj8Nzd8'
    const range = `A${rowIndex}:D${rowIndex}` // 更新特定行
    
    // 更新特定行的資料
    const response = await sheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: 'RAW',
      resource: {
        values: [values]
      }
    })
    
    console.log('Google Sheets API 更新成功:', response.data)
    return { success: true }
    
  } catch (error) {
    console.error('Google Sheets API 錯誤:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : '未知錯誤' 
    }
  }
}

// Google Sheets API 已完成設定！
// ✅ Google Cloud Console 專案已建立
// ✅ Google Sheets API 已啟用  
// ✅ Service Account 已建立並下載金鑰
// ✅ 金鑰檔已放置在 credentials/ 目錄
// ✅ Service Account 已加為 Google Sheets 編輯者