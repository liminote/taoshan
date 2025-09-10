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
    const cacheKey = `${CACHE_KEYS.CUSTOMER_FREQUENCY_RANKING}_${month}`
    const cachedData = reportCache.get(cacheKey)
    if (cachedData) {
      console.log(`📋 使用快取的客戶消費次數排行資料 (${month})`)
      return NextResponse.json({
        success: true,
        data: cachedData,
        cached: true,
        cacheTimestamp: reportCache.getTimestamp(cacheKey)
      })
    }

    console.log(`⚠️ 無快取資料，計算客戶消費次數排行 (${month})...`)

    // 獲取商品主檔資料，建立商品名稱到子分類的映射
    const { SheetsCache } = await import('@/lib/sheets-cache')
    const productMasterData = await SheetsCache.getProductsMaster()
    
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

    // 使用快取的 Google Sheets 資料
    const [orderData, productData] = await Promise.all([
      SheetsCache.getOrderData(),
      SheetsCache.getProductData()
    ])

    // 篩選有效的訂單資料
    const validOrderData = orderData.filter(record => 
      record.checkout_time && 
      record.checkout_time !== '' && 
      record.customer_phone && 
      record.customer_phone !== '' &&
      record.customer_phone !== '--' &&
      record.customer_phone.trim() !== ''
    )

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
    validOrderData.forEach(record => {
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

    // 檢查客戶是否有酒類消費
    console.log(`🔍 開始檢查酒類消費`)
    console.log(`🔍 酒類子分類: 東洋酒(23), 西洋酒(22), 啤酒(26)`)
    console.log(`🔍 商品分類映射總數: ${Object.keys(productToSubcategoryMap).length}`)
    
    // 建立結帳時間到客戶電話的映射
    const checkoutTimeToCustomerMap: { [checkoutTime: string]: string } = {}
    validOrderData.forEach(order => {
      checkoutTimeToCustomerMap[order.checkout_time] = order.customer_phone
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

    // 計算當月所有訂單總金額（不管有沒有電話號碼）
    const monthlyTotalAmount = orderData
      .filter(record => {
        const dateStr = record.checkout_time.replace(/\//g, '-')
        const date = new Date(dateStr)
        
        if (!isNaN(date.getTime())) {
          const orderMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
          return orderMonth === month
        }
        return false
      })
      .reduce((sum, record) => sum + record.invoice_amount, 0)

    console.log(`📊 當月總訂單金額: ${monthlyTotalAmount.toLocaleString()}`)

    // 計算新客判斷
    console.log(`📝 開始計算新客判斷`)
    Object.keys(customerStats).forEach(phone => {
      // 找出該客戶所有的訂單日期
      const customerOrders = validOrderData
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

    // 轉換為陣列並按訂單數量排序
    const customerArray = Object.values(customerStats)
      .filter(customer => customer.orderCount > 0)
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
      .sort((a, b) => {
        // 首先按訂單數量排序（降序）
        if (b.orderCount !== a.orderCount) {
          return b.orderCount - a.orderCount
        }
        // 如果訂單數量相同，按總金額排序（降序）
        return b.totalOrderAmount - a.totalOrderAmount
      })

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
    console.error('處理客戶消費次數排行時發生錯誤:', error)
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 })
  }
}