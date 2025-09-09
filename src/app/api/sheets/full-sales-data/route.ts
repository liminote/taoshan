import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50000') // 增加默認限制以獲取更多歷史數據
    
    // 使用與 rankings API 相同的 Google Sheets 數據來源
    const productSheetUrl = 'https://docs.google.com/spreadsheets/d/1GeRbtCX_oHJBooYvZeRbREaSxJ4r8P8QoL-vHiSz2eo/export?format=csv&gid=0'
    const masterSheetUrl = 'https://docs.google.com/spreadsheets/d/18iWZVRT8LB7I_WBNXGPl3WI8S3zEVq5ANq5yTj8Nzd8/export?format=csv&gid=909084406'
    
    console.log('🔍 獲取完整銷售數據...')
    
    const [productResponse, masterResponse] = await Promise.all([
      fetch(productSheetUrl, { 
        redirect: 'follow',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      }),
      fetch(masterSheetUrl, { 
        redirect: 'follow',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      })
    ])

    if (!productResponse.ok || !masterResponse.ok) {
      console.error('無法獲取 Google Sheets 資料', productResponse.status, masterResponse.status)
      return NextResponse.json({ error: '無法獲取銷售數據' }, { status: 500 })
    }

    const productCsv = await productResponse.text()
    const masterCsv = await masterResponse.text()

    // 檢查是否收到 HTML 重定向頁面而不是 CSV 數據
    if (productCsv.includes('<HTML>') || productCsv.includes('Temporary Redirect')) {
      console.error('收到 Google Sheets 重定向頁面而不是 CSV 數據')
      console.log('產品表回應前100字符:', productCsv.substring(0, 100))
      return NextResponse.json({ error: 'Google Sheets 存取受限，請稍後再試' }, { status: 500 })
    }

    // 解析商品銷售資料 CSV
    const productLines = productCsv.split('\n').filter(line => line.trim())
    const productHeaders = productLines[0].split(',').map(h => h.replace(/"/g, '').trim())
    
    console.log('📊 商品銷售表欄位:', productHeaders)
    console.log('📊 總共有', productLines.length - 1, '行數據（不包括標題行）')
    
    // 找到關鍵欄位索引
    const productNameIndex = productHeaders.findIndex(h => h.includes('商品名稱') || h.includes('品項名稱'))
    const amountIndex = productHeaders.findIndex(h => h.includes('金額') || h.includes('價格'))
    const checkoutTimeIndex = productHeaders.findIndex(h => h.includes('結帳時間'))
    const quantityIndex = productHeaders.findIndex(h => h.includes('數量'))
    const invoiceIndex = productHeaders.findIndex(h => h.includes('發票號碼') || h.includes('訂單編號'))
    
    // 解析每一行數據
    let allSalesData = productLines.slice(1).map((line, index) => {
      const values = line.split(',').map(v => v.replace(/"/g, '').trim())
      
      const productName = values[productNameIndex] || ''
      const amount = parseFloat(values[amountIndex]) || 0
      const checkoutTime = values[checkoutTimeIndex] || ''
      const quantity = parseInt(values[quantityIndex]) || 1
      const invoice = values[invoiceIndex] || ''
      
      // 解析結帳時間並添加有用的時間字段
      let dateInfo = {}
      if (checkoutTime) {
        try {
          // 處理多種日期格式
          let dateStr = checkoutTime
          
          // 處理 YYYY/MM/DD 格式
          if (dateStr.includes('/')) {
            dateStr = dateStr.replace(/\//g, '-')
          }
          
          const date = new Date(dateStr)
          if (!isNaN(date.getTime())) {
            dateInfo = {
              checkout_date: date.toISOString().split('T')[0],
              checkout_hour: date.getHours(),
              day_of_week: date.getDay(), // 0=Sunday, 1=Monday, ...
              day_name: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][date.getDay()],
              month: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
              year: date.getFullYear(),
              is_weekend: date.getDay() === 0 || date.getDay() === 6
            }
          } else {
            console.warn('無法解析時間:', checkoutTime)
          }
        } catch (e) {
          console.warn('時間解析錯誤:', checkoutTime, e.message)
        }
      }
      
      return {
        row_index: index + 1,
        product_name: productName,
        invoice_amount: amount,
        quantity: quantity,
        invoice_number: invoice,
        checkout_time: checkoutTime,
        ...dateInfo,
        raw_data: values // 保留原始數據以防需要
      }
    }).filter(item => item.product_name && item.checkout_time) // 只保留有效數據
    
    console.log(`📊 解析後有效數據: ${allSalesData.length} 筆`)
    if (allSalesData.length > 0) {
      console.log('📊 數據時間範圍示例:')
      console.log('  - 最新:', allSalesData[0]?.checkout_date, allSalesData[0]?.checkout_time)
      console.log('  - 最舊:', allSalesData[allSalesData.length - 1]?.checkout_date, allSalesData[allSalesData.length - 1]?.checkout_time)
    }

    // 限制返回的記錄數
    if (allSalesData.length > limit) {
      allSalesData = allSalesData.slice(0, limit)
    }

    // 解析商品主檔
    const masterLines = masterCsv.split('\n').filter(line => line.trim())
    const masterHeaders = masterLines[0].split(',').map(h => h.replace(/"/g, '').trim())
    
    const masterData = masterLines.slice(1).map(line => {
      const values = line.split(',').map(v => v.replace(/"/g, '').trim())
      const obj = {}
      masterHeaders.forEach((header, index) => {
        obj[header] = values[index] || ''
      })
      return obj
    }).filter(item => item['商品名稱'] || item['原商品名稱'])

    // 計算統計摘要
    const totalRecords = allSalesData.length
    const totalAmount = allSalesData.reduce((sum, item) => sum + item.invoice_amount, 0)
    const uniqueProducts = [...new Set(allSalesData.map(item => item.product_name))].length
    
    // 正確計算日期範圍
    let dateRange = null
    if (totalRecords > 0) {
      const validDates = allSalesData
        .filter(item => item.checkout_date)
        .map(item => item.checkout_date)
        .sort()
      
      if (validDates.length > 0) {
        dateRange = {
          earliest: validDates[0],
          latest: validDates[validDates.length - 1]
        }
      }
    }

    console.log(`✅ 成功獲取 ${totalRecords} 筆完整銷售記錄`)

    return NextResponse.json({
      success: true,
      summary: {
        totalRecords,
        totalAmount: Math.round(totalAmount * 100) / 100,
        uniqueProducts,
        dateRange,
        dataSource: '商品銷售報表 (Google Sheets CSV)',
        headers: productHeaders
      },
      salesData: allSalesData,
      masterData: masterData,
      message: `已獲取完整銷售明細，共 ${totalRecords} 筆記錄，可進行任意條件分析`
    })

  } catch (error) {
    console.error('獲取完整銷售數據時發生錯誤:', error)
    return NextResponse.json({ 
      error: '無法獲取完整銷售數據',
      details: error.message 
    }, { status: 500 })
  }
}