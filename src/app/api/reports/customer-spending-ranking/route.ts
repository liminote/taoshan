import { NextRequest, NextResponse } from 'next/server'
import { reportCache, CACHE_KEYS } from '@/lib/cache'

// 商品分類映射快取
let productCategoryCache: Map<string, { large: string, small: string }> | null = null
let categoryCacheTime = 0
const CATEGORY_CACHE_TTL = 3600000 // 1小時

// 獲取商品分類映射
async function getProductCategoryMap(): Promise<Map<string, { large: string, small: string }>> {
  const now = Date.now()
  if (productCategoryCache && (now - categoryCacheTime) < CATEGORY_CACHE_TTL) {
    return productCategoryCache
  }

  console.log('📋 載入商品分類映射...')
  const masterSheetUrl = 'https://docs.google.com/spreadsheets/d/18iWZVRT8LB7I_WBNXGPl3WI8S3zEVq5ANq5yTj8Nzd8/export?format=csv&gid=909084406'
  
  try {
    const response = await fetch(masterSheetUrl)
    if (!response.ok) throw new Error('無法獲取商品主檔')
    
    const csv = await response.text()
    const lines = csv.split('\n').filter(line => line.trim())
    const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim())
    
    const nameIndex = headers.findIndex(h => h.includes('商品名稱') || h.includes('品項'))
    const largeCategoryIndex = headers.findIndex(h => h === '大分類')
    const smallCategoryIndex = headers.findIndex(h => h === '小分類')
    
    const categoryMap = new Map<string, { large: string, small: string }>()
    
    if (nameIndex !== -1 && largeCategoryIndex !== -1 && smallCategoryIndex !== -1) {
      lines.slice(1).forEach(line => {
        const values = line.split(',').map(v => v.replace(/"/g, '').trim())
        const productName = values[nameIndex]
        const largeCategory = values[largeCategoryIndex]
        const smallCategory = values[smallCategoryIndex]
        
        if (productName && largeCategory && smallCategory) {
          categoryMap.set(productName, {
            large: largeCategory,
            small: smallCategory
          })
        }
      })
    }
    
    productCategoryCache = categoryMap
    categoryCacheTime = now
    console.log(`📋 載入 ${categoryMap.size} 個商品分類映射`)
    return categoryMap
  } catch (error) {
    console.error('載入商品分類映射失敗:', error)
    return new Map()
  }
}

// 檢查商品是否為酒類
function isAlcoholProduct(productName: string, categoryMap: Map<string, { large: string, small: string }>): boolean {
  // 直接匹配
  const exactMatch = categoryMap.get(productName)
  if (exactMatch) {
    return exactMatch.large === '6酒水' && (
      exactMatch.small === '東洋酒' || 
      exactMatch.small === '西洋酒' || 
      exactMatch.small === '啤酒'
    )
  }
  
  // 部分匹配（處理商品名稱略有差異的情況）
  for (const [masterProductName, category] of categoryMap.entries()) {
    if ((productName.includes(masterProductName) || masterProductName.includes(productName)) &&
        category.large === '6酒水' && (
          category.small === '東洋酒' || 
          category.small === '西洋酒' || 
          category.small === '啤酒'
        )) {
      return true
    }
  }
  
  return false
}

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

    // 獲取商品分類映射
    const productCategoryMap = await getProductCategoryMap()

    // 獲取訂單資料
    console.log('📥 載入訂單資料...')
    const orderSheetUrl = 'https://docs.google.com/spreadsheets/d/1EWPECWQp_Ehz43Lfks_I8lcvEig8gV9DjyjEIzC5EO4/export?format=csv&gid=0'
    const response = await fetch(orderSheetUrl)
    if (!response.ok) throw new Error('無法獲取訂單資料')
    
    const orderCsv = await response.text()
    const orderLines = orderCsv.split('\n').filter(line => line.trim())
    const orderHeaders = orderLines[0].split(',').map(h => h.replace(/"/g, '').trim())
    
    // 找到正確的欄位索引
    const checkoutTimeIndex = orderHeaders.findIndex(h => h.includes('結帳時間'))
    const checkoutAmountIndex = orderHeaders.findIndex(h => h.includes('結帳金額'))
    const customerNameIndex = orderHeaders.findIndex(h => h.includes('顧客姓名'))
    const customerPhoneIndex = orderHeaders.findIndex(h => h.includes('顧客電話'))
    const itemsIndex = orderHeaders.findIndex(h => h.includes('品項'))
    
    if (checkoutTimeIndex === -1 || checkoutAmountIndex === -1 || customerNameIndex === -1 || customerPhoneIndex === -1) {
      throw new Error('找不到必要的欄位')
    }
    
    const orderData = orderLines.slice(1).map(line => {
      const values = line.split(',').map(v => v.replace(/"/g, '').trim())
      return {
        結帳時間: values[checkoutTimeIndex] || '',
        結帳金額: parseFloat(values[checkoutAmountIndex]) || 0,
        顧客姓名: values[customerNameIndex] || '',
        顧客電話: values[customerPhoneIndex] || '',
        品項: values[itemsIndex] || ''
      }
    })

    // 篩選有效的訂單資料
    const validOrderData = orderData.filter(record => 
      record.結帳時間 && 
      record.結帳時間 !== '' && 
      record.顧客電話 && 
      record.顧客電話 !== '' &&
      record.顧客電話 !== '--' &&
      record.顧客電話.trim() !== ''
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
      const dateStr = record.結帳時間.replace(/\//g, '-')
      const date = new Date(dateStr)
      
      if (!isNaN(date.getTime())) {
        const orderMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        
        // 只統計指定月份的數據
        if (orderMonth === month) {
          const phone = record.顧客電話
          
          // 確保電話號碼有效（與過濾條件一致）
          if (phone && phone !== '' && phone !== '--' && phone.trim() !== '') {
            if (!customerStats[phone]) {
              customerStats[phone] = {
                name: record.顧客姓名,
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
            customerStats[phone].totalAmount += record.結帳金額
            
            // 檢查是否有酒類商品
            if (record.品項) {
              // 解析品項字串，提取商品名稱（去除價格部分）
              const itemNames = record.品項.split(',').map(item => {
                const trimmed = item.trim()
                const priceIndex = trimmed.lastIndexOf(' $')
                return priceIndex !== -1 ? trimmed.substring(0, priceIndex).trim() : trimmed
              })
              
              // 檢查每個品項是否為酒類
              for (const itemName of itemNames) {
                if (isAlcoholProduct(itemName, productCategoryMap)) {
                  customerStats[phone].hasAlcohol = true
                  customerStats[phone].alcoholProducts.add(itemName)
                  break
                }
              }
            }
            
            // 更新最新訂單時間和姓名
            if (date > customerStats[phone].lastOrderTime) {
              customerStats[phone].lastOrderTime = date
              customerStats[phone].name = record.顧客姓名
            }
          }
        }
      }
    })

    // 計算當月所有訂單總金額（不管有沒有電話號碼）
    const monthlyTotalAmount = orderData
      .filter(record => {
        const dateStr = record.結帳時間.replace(/\//g, '-')
        const date = new Date(dateStr)
        
        if (!isNaN(date.getTime())) {
          const orderMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
          return orderMonth === month
        }
        return false
      })
      .reduce((sum, record) => sum + record.結帳金額, 0)

    console.log(`📊 當月總訂單金額: ${monthlyTotalAmount.toLocaleString()}`)
    console.log(`🍺 使用 ${productCategoryMap.size} 個商品分類映射進行酒類檢測`)

    // 計算新客判斷
    console.log(`📝 開始計算新客判斷`)
    Object.keys(customerStats).forEach(phone => {
      // 找出該客戶所有的訂單日期
      const customerOrders = validOrderData
        .filter(order => order.顧客電話 === phone)
        .map(order => {
          const dateStr = order.結帳時間.replace(/\//g, '-')
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

    // 取前 30 名
    const result = customerArray.slice(0, 30)

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