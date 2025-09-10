import { NextRequest, NextResponse } from 'next/server'
import { reportCache, CACHE_KEYS } from '@/lib/cache'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const month = searchParams.get('month')
    
    if (!month) {
      return NextResponse.json({ error: '請提供月份參數' }, { status: 400 })
    }

    // 檢查快取
    const cacheKey = `${CACHE_KEYS.CUSTOMER_SPENDING_RANKING}_${month}`
    const cachedData = reportCache.get(cacheKey)
    if (cachedData) {
      console.log(`📋 使用快取的客戶消費金額排行資料 (${month})`)
      return NextResponse.json({
        success: true,
        data: cachedData,
        cached: true,
        cacheTimestamp: reportCache.getTimestamp(cacheKey)
      })
    }

    console.log(`⚠️ 無快取資料，計算客戶消費金額排行 (${month})...`)

    // 獲取商品主檔資料，建立商品名稱到子分類的映射
    const productMasterResponse = await fetch('http://localhost:3000/api/products-master?limit=10000')
    const productMasterData = await productMasterResponse.json()
    
    // 建立商品名稱到子分類 ID 的映射
    const productToSubcategoryMap: { [productName: string]: number } = {}
    if (productMasterData.products) {
      productMasterData.products.forEach((product: any) => {
        if (product.original_name && product.subcategory_id) {
          productToSubcategoryMap[product.original_name] = product.subcategory_id
        }
      })
    }
    
    // 定義酒類子分類 ID
    const alcoholSubcategoryIds = [22, 23, 26] // 西洋酒、東洋酒、啤酒

    // Google Sheets 訂單資料
    const orderSheetUrl = 'https://docs.google.com/spreadsheets/d/1EWPECWQp_Ehz43Lfks_I8lcvEig8gV9DjyjEIzC5EO4/export?format=csv&gid=0'
    const productSheetUrl = 'https://docs.google.com/spreadsheets/d/1GeRbtCX_oHJBooYvZeRbREaSxJ4r8P8QoL-vHiSz2eo/export?format=csv&gid=0'
    
    const [orderResponse, productResponse] = await Promise.all([
      fetch(orderSheetUrl),
      fetch(productSheetUrl)
    ])

    if (!orderResponse.ok || !productResponse.ok) {
      console.error('無法獲取 Google Sheets 資料')
      return NextResponse.json({ error: '查詢失敗' }, { status: 500 })
    }

    const orderCsv = await orderResponse.text()
    const productCsv = await productResponse.text()

    // 解析訂單 CSV 資料
    const orderLines = orderCsv.split('\n').filter(line => line.trim())
    const orderHeaders = orderLines[0].split(',').map(h => h.replace(/"/g, '').trim())
    
    // 找到需要的欄位索引
    const checkoutTimeIndex = orderHeaders.findIndex(h => h.includes('結帳時間'))
    const checkoutAmountIndex = orderHeaders.findIndex(h => h.includes('結帳金額'))
    const customerNameIndex = orderHeaders.findIndex(h => h.includes('顧客姓名'))
    const customerPhoneIndex = orderHeaders.findIndex(h => h.includes('顧客電話'))
    
    const orderData = orderLines.slice(1).map(line => {
      const values = line.split(',').map(v => v.replace(/"/g, '').trim())
      return {
        checkout_time: values[checkoutTimeIndex],
        invoice_amount: parseFloat(values[checkoutAmountIndex]) || 0,
        customer_name: values[customerNameIndex] || '',
        customer_phone: values[customerPhoneIndex] || ''
      }
    }).filter(record => 
      record.checkout_time && 
      record.checkout_time !== '' && 
      record.customer_phone && 
      record.customer_phone !== '' &&
      record.customer_phone !== '--' &&
      record.customer_phone.trim() !== ''
    )

    // 解析商品 CSV 資料
    const productLines = productCsv.split('\n').filter(line => line.trim())
    const productHeaders = productLines[0].split(',').map(h => h.replace(/"/g, '').trim())
    
    const productData = productLines.slice(1).map(line => {
      const values = line.split(',').map(v => v.replace(/"/g, '').trim())
      const record: Record<string, string> = {}
      productHeaders.forEach((header, index) => {
        record[header] = values[index] || ''
      })
      return record
    }).filter(record => record['結帳時間'] && record['結帳時間'] !== '')

    // 按電話號碼分組客戶數據
    const customerStats: { [phone: string]: {
      name: string;
      phone: string;
      orderCount: number;
      totalAmount: number;
      lastOrderTime: Date;
      hasAlcohol: boolean;
      alcoholProducts: Set<string>;
      isNewCustomer: boolean;
    } } = {}

    // 篩選指定月份的訂單並統計
    orderData.forEach(record => {
      const dateStr = record.checkout_time.replace(/\//g, '-')
      const date = new Date(dateStr)
      
      if (!isNaN(date.getTime())) {
        const orderMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        
        // 只統計指定月份的數據
        if (orderMonth === month) {
          const phone = record.customer_phone
          
          // 確保電話號碼有效（與過濾條件一致）
          if (phone && phone !== '' && phone !== '--' && phone.trim() !== '') {
            if (!customerStats[phone]) {
            customerStats[phone] = {
              name: record.customer_name,
              phone: phone,
              orderCount: 0,
              totalAmount: 0,
              lastOrderTime: date,
              hasAlcohol: false,
              alcoholProducts: new Set(),
              isNewCustomer: false // 預設為 false，稍後會重新計算
            }
          }
          
          customerStats[phone].orderCount += 1
          customerStats[phone].totalAmount += record.invoice_amount
          
            // 更新最新訂單時間和姓名
            if (date > customerStats[phone].lastOrderTime) {
              customerStats[phone].lastOrderTime = date
              customerStats[phone].name = record.customer_name
            }
          }
        }
      }
    })

    // 計算當月所有訂單總金額（不管有沒有電話號碼）
    const allOrderData = orderLines.slice(1).map(line => {
      const values = line.split(',').map(v => v.replace(/"/g, '').trim())
      return {
        checkout_time: values[checkoutTimeIndex],
        invoice_amount: parseFloat(values[checkoutAmountIndex]) || 0
      }
    }).filter(record => record.checkout_time && record.checkout_time !== '')

    const monthlyTotalAmount = allOrderData
      .filter(record => {
        const dateStr = record.checkout_time.replace(/\//g, '-')
        const date = new Date(dateStr)
        
        if (!isNaN(date.getTime())) {
          const orderMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
          return orderMonth === month
        }
        return false
      })
      .reduce((sum, record) => sum + (record.invoice_amount || 0), 0)

    console.log(`📊 當月總訂單金額: ${monthlyTotalAmount.toLocaleString()}`)

    // 檢查客戶是否有酒類消費
    // 邏輯：透過結帳時間關聯 orderData(有客戶電話) + productData(有品項)
    console.log(`🔍 開始檢查酒類消費`)
    console.log(`🔍 酒類子分類: 東洋酒(23), 西洋酒(22), 啤酒(26)`)
    console.log(`🔍 商品分類映射總數: ${Object.keys(productToSubcategoryMap).length}`)
    
    // 建立結帳時間到客戶電話的映射
    const checkoutTimeToCustomerMap: { [checkoutTime: string]: string } = {}
    orderData.forEach(order => {
      if (order.checkout_time && order.customer_phone && 
          order.customer_phone !== '' && order.customer_phone !== '--' && 
          order.customer_phone.trim() !== '') {
        checkoutTimeToCustomerMap[order.checkout_time] = order.customer_phone
      }
    })
    
    console.log(`🔗 建立了 ${Object.keys(checkoutTimeToCustomerMap).length} 個結帳時間-客戶映射`)
    
    let alcoholFoundCount = 0
    let checkedProductCount = 0
    
    // 檢查商品資料中的每個品項
    productData.forEach(record => {
      const checkoutTime = record['結帳時間']
      const productName = record['商品名稱'] || ''
      
      if (checkoutTime && productName) {
        // 通過結帳時間找到客戶電話
        const customerPhone = checkoutTimeToCustomerMap[checkoutTime]
        
        if (customerPhone) {
          const dateStr = checkoutTime.replace(/\//g, '-')
          const date = new Date(dateStr)
          
          if (!isNaN(date.getTime())) {
            const orderMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
            
            // 只檢查指定月份且客戶存在於統計中
            if (orderMonth === month && customerStats[customerPhone]) {
              checkedProductCount++
              
              // 檢查品項是否為酒類
              const subcategoryId = productToSubcategoryMap[productName]
              if (subcategoryId && alcoholSubcategoryIds.includes(subcategoryId)) {
                customerStats[customerPhone].hasAlcohol = true
                customerStats[customerPhone].alcoholProducts.add(productName)
                alcoholFoundCount++
              }
            }
          }
        }
      }
    })
    
    console.log(`🔍 檢查完成: 已檢查 ${checkedProductCount} 個品項，發現 ${alcoholFoundCount} 個酒類商品`)

    // 計算新客判斷
    console.log(`📝 開始計算新客判斷`)
    Object.keys(customerStats).forEach(phone => {
      // 找出該客戶所有的訂單日期
      const customerOrders = orderData
        .filter(order => order.customer_phone === phone)
        .map(order => {
          const dateStr = order.checkout_time.replace(/\//g, '-')
          return new Date(dateStr)
        })
        .filter(date => !isNaN(date.getTime()))
        .sort((a, b) => a.getTime() - b.getTime()) // 按日期排序，最早在前

      if (customerOrders.length > 0) {
        const earliestOrderDate = customerOrders[0]
        const earliestOrderMonth = `${earliestOrderDate.getFullYear()}-${String(earliestOrderDate.getMonth() + 1).padStart(2, '0')}`
        
        // 如果最早訂單就在查詢月份，則為新客
        customerStats[phone].isNewCustomer = (earliestOrderMonth === month)
      }
    })

    const newCustomerCount = Object.values(customerStats).filter(c => c.isNewCustomer).length
    console.log(`📝 新客判斷完成: 共 ${Object.keys(customerStats).length} 位客戶，其中 ${newCustomerCount} 位為新客`)

    // 轉換為陣列並按總金額排序
    const customerArray = Object.values(customerStats)
      .filter(customer => customer.totalAmount > 0)
      .map(customer => ({
        rank: 0, // 將在排序後設定
        customerName: customer.name,
        customerPhone: customer.phone,
        orderCount: customer.orderCount,
        averageOrderAmount: Math.round(customer.totalAmount / customer.orderCount),
        totalOrderAmount: Math.round(customer.totalAmount * 100) / 100,
        amountPercentage: Math.round((customer.totalAmount / monthlyTotalAmount) * 100 * 10) / 10, // 計算到小數點後一位
        cumulativePercentage: 0, // 將在後面計算
        hasAlcohol: customer.hasAlcohol,
        isNewCustomer: customer.isNewCustomer
      }))
      .sort((a, b) => b.totalOrderAmount - a.totalOrderAmount)

    // 設定排名和累計佔比
    let cumulativeSum = 0
    customerArray.forEach((customer, index) => {
      customer.rank = index + 1
      cumulativeSum += customer.amountPercentage
      customer.cumulativePercentage = Math.round(cumulativeSum * 10) / 10 // 計算到小數點後一位
    })

    // 取前 20 名
    const result = customerArray.slice(0, 20)

    console.log(`計算完成，共 ${customerArray.length} 位客戶，取前 20 名`)

    // 儲存到快取
    reportCache.set(cacheKey, result)
    
    return NextResponse.json({
      success: true,
      data: result,
      cached: false,
      computed: true
    })

  } catch (error) {
    console.error('處理客戶消費金額排行時發生錯誤:', error)
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 })
  }
}