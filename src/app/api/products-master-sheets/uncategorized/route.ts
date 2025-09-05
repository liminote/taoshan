import { NextResponse } from 'next/server'
import { cache } from '../../../../lib/cache'

async function fetchSalesData() {
  const CACHE_KEY = 'sales_data'
  
  // 嘗試從緩存獲取
  const cachedData = cache.get<Set<string>>(CACHE_KEY)
  if (cachedData) {
    console.log('從緩存讀取銷售資料')
    return cachedData
  }

  console.log('重新從 Google Sheets 讀取銷售資料...')
  
  const productSheetUrl = 'https://docs.google.com/spreadsheets/d/1GeRbtCX_oHJBooYvZeRbREaSxJ4r8P8QoL-vHiSz2eo/export?format=csv&gid=0'
  const productResponse = await fetch(productSheetUrl)
  
  if (!productResponse.ok) {
    throw new Error('無法獲取銷售資料')
  }

  const productCsv = await productResponse.text()
  
  // 解析商品銷售資料
  const productLines = productCsv.split('\n').filter(line => line.trim())
  const productHeaders = productLines[0].split(',').map(h => h.replace(/"/g, '').trim())
  
  const productNameIndex = productHeaders.findIndex(h => h.includes('商品名稱') || h.includes('品項名稱'))
  
  const salesProducts = new Set<string>()
  productLines.slice(1).forEach(line => {
    const values = line.split(',').map(v => v.replace(/"/g, '').trim())
    const productName = values[productNameIndex]
    if (productName) {
      salesProducts.add(productName)
    }
  })

  // 緩存資料 15 分鐘
  cache.set(CACHE_KEY, salesProducts, 15)
  console.log(`已緩存 ${salesProducts.size} 個銷售商品資料`)
  
  return salesProducts
}

async function fetchMasterData() {
  const CACHE_KEY = 'master_data'
  
  // 嘗試從緩存獲取
  const cachedData = cache.get<Set<string>>(CACHE_KEY)
  if (cachedData) {
    console.log('從緩存讀取商品主檔資料')
    return cachedData
  }

  console.log('重新從 Google Sheets 讀取商品主檔資料...')
  
  const masterSheetUrl = 'https://docs.google.com/spreadsheets/d/18iWZVRT8LB7I_WBNXGPl3WI8S3zEVq5ANq5yTj8Nzd8/export?format=csv&gid=909084406'
  const masterResponse = await fetch(masterSheetUrl)
  
  if (!masterResponse.ok) {
    throw new Error('無法獲取商品主檔資料')
  }

  const masterCsv = await masterResponse.text()
  
  // 解析商品主檔
  const masterLines = masterCsv.split('\n').filter(line => line.trim())
  const masterHeaders = masterLines[0].split(',').map(h => h.replace(/"/g, '').trim())
  
  const masterNameIndex = masterHeaders.findIndex(h => h.includes('商品名稱'))
  
  const masterProductNames = new Set<string>()
  
  masterLines.slice(1).forEach(line => {
    const values = line.split(',').map(v => v.replace(/"/g, '').trim())
    const productName = values[masterNameIndex] || ''
    
    if (productName) {
      masterProductNames.add(productName)
    }
  })

  // 緩存資料 15 分鐘
  cache.set(CACHE_KEY, masterProductNames, 15)
  console.log(`已緩存 ${masterProductNames.size} 個商品主檔資料`)
  
  return masterProductNames
}

export async function GET() {
  try {
    const [salesProducts, masterProductNames] = await Promise.all([
      fetchSalesData(),
      fetchMasterData()
    ])


    // 找出未分類的商品（銷售資料中存在但商品主檔中不存在的商品）
    const uncategorizedProducts: Array<{
      productName: string
      inMaster: boolean
    }> = []

    // 遍歷銷售資料中的所有商品，檢查是否在商品主檔中
    Array.from(salesProducts).forEach(productName => {
      if (!masterProductNames.has(productName)) {
        // 不在商品主檔中，視為未分類
        uncategorizedProducts.push({
          productName,
          inMaster: false
        })
      }
    })

    console.log(`銷售資料中找到 ${salesProducts.size} 個商品`)
    console.log(`商品主檔中有 ${masterProductNames.size} 個商品`)
    console.log(`未分類商品 ${uncategorizedProducts.length} 個`)

    // 按商品名稱排序
    uncategorizedProducts.sort((a, b) => a.productName.localeCompare(b.productName))

    return NextResponse.json({
      uncategorizedProducts,
      statistics: {
        totalSalesProducts: salesProducts.size,
        totalMasterProducts: masterProductNames.size,
        uncategorizedProducts: uncategorizedProducts.length
      }
    })

  } catch (error) {
    console.error('分析未分類商品時發生錯誤:', error)
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 })
  }
}