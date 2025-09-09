import { NextResponse, NextRequest } from 'next/server'
import { reportCache, CACHE_KEYS } from '@/lib/cache'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '0', 10)
    const month = searchParams.get('month') // 可選的月份篩選

    // 生成快取鍵
    const cacheKey = `${CACHE_KEYS.PRODUCT_SALES}_${month || 'all'}_${limit || 'all'}`
    
    // 先檢查快取
    const cachedData = reportCache.get(cacheKey)
    if (cachedData) {
      console.log('📋 使用快取的商品銷售資料')
      return NextResponse.json({
        success: true,
        data: cachedData.products,
        summary: cachedData.summary,
        cached: true,
        cacheTimestamp: reportCache.getTimestamp(cacheKey)
      })
    }

    console.log('⚠️ 無快取資料，執行即時計算...')
    
    // 使用 Google Sheets 商品銷售資料來源
    const productSheetUrl = 'https://docs.google.com/spreadsheets/d/1GeRbtCX_oHJBooYvZeRbREaSxJ4r8P8QoL-vHiSz2eo/export?format=csv&gid=0'
    
    const productResponse = await fetch(productSheetUrl)
    if (!productResponse.ok) {
      console.error('無法獲取 Google Sheets 商品銷售資料')
      return NextResponse.json({ error: '查詢失敗' }, { status: 500 })
    }

    const productCsv = await productResponse.text()
    
    // 解析商品銷售 CSV 資料
    const productLines = productCsv.split('\n').filter(line => line.trim())
    const productHeaders = productLines[0].split(',').map(h => h.replace(/"/g, '').trim())
    
    console.log('📊 商品銷售表格欄位:', productHeaders)
    
    // 動態找出所有欄位索引
    const headerIndexMap: { [key: string]: number } = {}
    productHeaders.forEach((header, index) => {
      headerIndexMap[header] = index
    })
    
    const products = productLines.slice(1).map((line, lineIndex) => {
      const values = line.split(',').map(v => v.replace(/"/g, '').trim())
      
      // 動態建立產品對象，包含所有欄位
      const product: any = {}
      
      productHeaders.forEach((header, index) => {
        let value = values[index] || ''
        
        // 特殊處理數值欄位
        if (header.includes('金額') || header.includes('價格') || header.includes('結帳金額')) {
          value = parseFloat(value) || 0
        }
        
        // 處理時間欄位
        if (header.includes('時間')) {
          if (value && value !== '') {
            try {
              const dateStr = value.replace(/\//g, '-')
              const dateObj = new Date(dateStr)
              
              if (!isNaN(dateObj.getTime())) {
                product[`${header}_parsed`] = dateObj.toISOString()
                product[`${header}_year`] = dateObj.getFullYear()
                product[`${header}_month`] = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`
                product[`${header}_date`] = dateObj.toISOString().split('T')[0]
                product[`${header}_hour`] = dateObj.getHours()
                product[`${header}_day_name`] = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dateObj.getDay()]
              }
            } catch (error) {
              console.warn(`無法解析時間 ${header}:`, value)
            }
          }
        }
        
        // 設定原始值
        product[header] = value
      })
      
      // 添加行號用於除錯
      product['_rowNumber'] = lineIndex + 2 // +2 因為第一行是標題，且從1開始計算
      
      return product
    }).filter(product => {
      // 基本過濾：必須有商品名稱和非零金額
      const productName = product['商品名稱'] || product['品項名稱'] || ''
      const amount = product['結帳金額'] || product['金額'] || product['價格'] || 0
      return productName && productName !== '' && amount > 0
    })

    // 如果指定了月份，進行月份篩選
    let filteredProducts = products
    if (month) {
      filteredProducts = products.filter(product => {
        const checkoutTime = product['結帳時間'] || product['時間'] || ''
        if (!checkoutTime) return false
        
        const monthKey = product['結帳時間_month'] || product['時間_month']
        return monthKey === month
      })
      console.log(`📊 月份篩選 (${month}): ${filteredProducts.length} / ${products.length}`)
    }

    // 如果指定了限制數量
    if (limit > 0) {
      filteredProducts = filteredProducts.slice(0, limit)
    }

    console.log(`📊 處理完成，共 ${filteredProducts.length} 筆有效商品銷售記錄`)
    
    // 計算統計摘要
    const summary = {
      totalProducts: filteredProducts.length,
      totalAmount: Math.round(filteredProducts.reduce((sum, product) => {
        const amount = product['結帳金額'] || product['金額'] || product['價格'] || 0
        return sum + amount
      }, 0) * 100) / 100,
      
      // 商品統計
      uniqueProducts: [...new Set(filteredProducts.map(p => p['商品名稱'] || p['品項名稱']))].length,
      
      // 日期範圍
      dateRange: (() => {
        const dates = filteredProducts
          .map(p => p['結帳時間'] || p['時間'])
          .filter(d => d && d !== '')
          .sort()
        
        return dates.length > 0 ? {
          earliest: dates[0],
          latest: dates[dates.length - 1]
        } : null
      })(),
      
      // 月份統計
      monthStats: filteredProducts.reduce((acc, product) => {
        const month = product['結帳時間_month'] || product['時間_month']
        if (month) {
          const amount = product['結帳金額'] || product['金額'] || product['價格'] || 0
          if (!acc[month]) acc[month] = { count: 0, amount: 0 }
          acc[month].count += 1
          acc[month].amount += amount
        }
        return acc
      }, {} as Record<string, {count: number, amount: number}>),
      
      // 商品熱銷排行
      productRanking: (() => {
        const productStats = filteredProducts.reduce((acc, product) => {
          const name = product['商品名稱'] || product['品項名稱'] || '未知商品'
          const amount = product['結帳金額'] || product['金額'] || product['價格'] || 0
          if (!acc[name]) acc[name] = { count: 0, amount: 0 }
          acc[name].count += 1
          acc[name].amount += amount
          return acc
        }, {} as Record<string, {count: number, amount: number}>)
        
        return Object.entries(productStats)
          .map(([name, stats]) => ({ name, ...stats }))
          .sort((a, b) => b.amount - a.amount)
          .slice(0, 20)
      })(),
      
      // 可用欄位
      availableFields: productHeaders,
      
      // 篩選參數
      filters: {
        month: month || null,
        limit: limit || null
      }
    }
    
    const result = {
      products: filteredProducts,
      summary: summary
    }
    
    // 儲存到快取
    reportCache.set(cacheKey, result)
    
    console.log(`✅ 商品銷售資料處理完成，快取已更新`)
    
    return NextResponse.json({
      success: true,
      data: filteredProducts,
      summary: summary,
      cached: false,
      computed: true
    })

  } catch (error) {
    console.error('處理商品銷售資料時發生錯誤:', error)
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 })
  }
}