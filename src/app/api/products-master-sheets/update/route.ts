import { NextResponse } from 'next/server'

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
      
      // TODO: 實作 Google Sheets API 寫入
      // 目前我們先準備資料結構，並模擬成功回應
      console.log('準備新增商品到 Google Sheets:', data)
      
      // 這裡需要呼叫 Google Sheets API 來新增一行
      // 暫時返回成功回應
      return NextResponse.json({ 
        success: true, 
        message: '商品已新增（模擬）',
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
      
      // TODO: 實作 Google Sheets API 更新特定行
      // 暫時返回成功回應
      return NextResponse.json({ 
        success: true, 
        message: '商品已更新（模擬）',
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

// 示範如何使用 Google Sheets API 的函數（需要設定認證）
/*
async function writeToGoogleSheets(spreadsheetId: string, range: string, values: unknown[][]) {
  // 這個函數需要 Google Sheets API 認證
  // const { google } = require('googleapis');
  // const sheets = google.sheets('v4');
  
  try {
    const response = await sheets.spreadsheets.values.append({
      spreadsheetId,
      range,
      valueInputOption: 'RAW',
      resource: {
        values
      }
    });
    return response;
  } catch (error) {
    console.error('Google Sheets API 錯誤:', error);
    throw error;
  }
  
  console.log('Google Sheets API 寫入功能需要認證設定')
  return null
}

async function updateGoogleSheets(spreadsheetId: string, range: string, values: unknown[][]) {
  // 同樣需要認證設定
  console.log('Google Sheets API 更新功能需要認證設定')
  return null
}
*/