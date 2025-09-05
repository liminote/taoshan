import { NextResponse } from 'next/server'
import { cache } from '../../../lib/cache'

interface MasterProduct {
  id: number
  original_name: string
  new_name: string
  category: string
  small_category: string
  rowIndex: number
}

async function fetchMasterSheetData(): Promise<MasterProduct[]> {
  const CACHE_KEY = 'master_sheet_data'
  
  // 嘗試從緩存獲取
  const cachedData = cache.get<MasterProduct[]>(CACHE_KEY)
  if (cachedData) {
    console.log('從緩存讀取商品主檔資料')
    return cachedData
  }

  console.log('重新從 Google Sheets 讀取商品主檔資料...')
  
  // 讀取商品主檔
  const masterSheetUrl = 'https://docs.google.com/spreadsheets/d/18iWZVRT8LB7I_WBNXGPl3WI8S3zEVq5ANq5yTj8Nzd8/export?format=csv&gid=909084406'
  
  const masterResponse = await fetch(masterSheetUrl)
  if (!masterResponse.ok) {
    throw new Error('無法獲取 Google Sheets 資料')
  }

  const masterCsv = await masterResponse.text()
  const masterLines = masterCsv.split('\n').filter(line => line.trim())
  const masterHeaders = masterLines[0].split(',').map(h => h.replace(/"/g, '').trim())
  
  const masterNameIndex = masterHeaders.findIndex(h => h.includes('商品名稱'))
  const newNameIndex = masterHeaders.findIndex(h => h.includes('新商品名稱'))
  const categoryIndex = masterHeaders.findIndex(h => h.includes('大分類'))
  const smallCategoryIndex = masterHeaders.findIndex(h => h.includes('小分類'))
  
  // 解析商品主檔資料
  const allProducts = masterLines.slice(1).map((line, index) => {
    const values = line.split(',').map(v => v.replace(/"/g, '').trim())
    return {
      id: index + 1,
      original_name: values[masterNameIndex] || '',
      new_name: values[newNameIndex] || '',
      category: values[categoryIndex] || '',
      small_category: values[smallCategoryIndex] || '',
      rowIndex: index + 1
    }
  }).filter(product => product.original_name)

  // 緩存資料 30 分鐘
  cache.set(CACHE_KEY, allProducts, 30)
  console.log(`已緩存 ${allProducts.length} 筆商品主檔資料`)
  
  return allProducts
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = parseInt(url.searchParams.get('limit') || '100')
    const search = url.searchParams.get('search') || ''
    const forceRefresh = url.searchParams.get('refresh') === 'true'
    
    // 如果要求強制重新整理，清除緩存
    if (forceRefresh) {
      cache.delete('master_sheet_data')
      console.log('強制重新整理：已清除緩存')
    }

    const allProducts = await fetchMasterSheetData()

    // 搜尋篩選
    let filteredProducts = allProducts
    if (search) {
      filteredProducts = allProducts.filter(product => 
        product.original_name.toLowerCase().includes(search.toLowerCase()) ||
        product.new_name.toLowerCase().includes(search.toLowerCase()) ||
        product.category.toLowerCase().includes(search.toLowerCase()) ||
        product.small_category.toLowerCase().includes(search.toLowerCase())
      )
    }

    // 分頁處理
    const total = filteredProducts.length
    const totalPages = Math.ceil(total / limit)
    const offset = (page - 1) * limit
    const paginatedProducts = filteredProducts.slice(offset, offset + limit)

    // 獲取緩存時間戳
    const cacheTimestamp = cache.getTimestamp('master_sheet_data')
    const lastUpdated = cacheTimestamp ? new Date(cacheTimestamp).toLocaleString('zh-TW') : null

    console.log(`Google Sheets 商品主檔: 總共 ${total} 筆, 當前頁 ${paginatedProducts.length} 筆`)

    return NextResponse.json({
      products: paginatedProducts,
      pagination: {
        page,
        limit,
        total,
        totalPages
      },
      meta: {
        lastUpdated,
        fromCache: cache.has('master_sheet_data')
      }
    })

  } catch (error) {
    console.error('處理商品主檔查詢時發生錯誤:', error)
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { original_name, new_name, category, small_category } = await request.json()

    if (!original_name) {
      return NextResponse.json({ error: '商品名稱為必填' }, { status: 400 })
    }

    // 檢查是否有 Google Sheets 認證
    if (!process.env.GOOGLE_SHEETS_CREDENTIALS) {
      console.log('Google Sheets 認證未設置，使用模擬模式')
      console.log('準備新增商品到 Google Sheets:', { original_name, new_name, category, small_category })
      
      return NextResponse.json({ 
        success: true, 
        message: '商品新增成功 (模擬模式 - 請設置 GOOGLE_SHEETS_CREDENTIALS 環境變數以啟用實際寫入)'
      })
    }

    // 實際寫入 Google Sheets
    const { addProductToMasterSheet } = await import('../../../lib/google-sheets')
    const spreadsheetId = '18iWZVRT8LB7I_WBNXGPl3WI8S3zEVq5ANq5yTj8Nzd8'
    const sheetName = 'Sheet1' // 根據實際情況調整

    await addProductToMasterSheet(spreadsheetId, sheetName, {
      productName: original_name,
      newProductName: new_name,
      category: category || '未分類',
      smallCategory: small_category || '未分類'
    })
    
    // 新增成功後清除緩存，強制下次重新讀取
    cache.delete('master_sheet_data')
    console.log('新增商品成功，已清除緩存')
    
    return NextResponse.json({ 
      success: true, 
      message: '商品已成功新增至 Google Sheets'
    })

  } catch (error) {
    console.error('處理商品主檔新增時發生錯誤:', error)
    
    // 如果是 Google Sheets API 錯誤，提供更具體的錯誤訊息
    const errorMessage = error instanceof Error ? error.message : '伺服器錯誤'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const { rowIndex, original_name, new_name, category, small_category } = await request.json()

    if (!rowIndex || !original_name) {
      return NextResponse.json({ error: '缺少必要參數' }, { status: 400 })
    }

    // 檢查是否有 Google Sheets 認證
    if (!process.env.GOOGLE_SHEETS_CREDENTIALS) {
      console.log('Google Sheets 認證未設置，使用模擬模式')
      console.log('準備更新商品到 Google Sheets:', { rowIndex, original_name, new_name, category, small_category })
      
      return NextResponse.json({ 
        success: true, 
        message: '商品更新成功 (模擬模式 - 請設置 GOOGLE_SHEETS_CREDENTIALS 環境變數以啟用實際寫入)'
      })
    }

    // 實際更新 Google Sheets
    const { updateProductInMasterSheet } = await import('../../../lib/google-sheets')
    const spreadsheetId = '18iWZVRT8LB7I_WBNXGPl3WI8S3zEVq5ANq5yTj8Nzd8'
    const sheetName = 'Sheet1' // 根據實際情況調整

    await updateProductInMasterSheet(spreadsheetId, sheetName, rowIndex, {
      productName: original_name,
      newProductName: new_name,
      category: category || '未分類',
      smallCategory: small_category || '未分類'
    })
    
    // 更新成功後清除緩存，強制下次重新讀取
    cache.delete('master_sheet_data')
    console.log('更新商品成功，已清除緩存')
    
    return NextResponse.json({ 
      success: true, 
      message: '商品已成功更新至 Google Sheets'
    })

  } catch (error) {
    console.error('處理商品主檔更新時發生錯誤:', error)
    
    // 如果是 Google Sheets API 錯誤，提供更具體的錯誤訊息
    const errorMessage = error instanceof Error ? error.message : '伺服器錯誤'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}