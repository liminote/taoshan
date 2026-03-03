import { NextRequest, NextResponse } from 'next/server'
import { reportCache, CACHE_KEYS } from '@/lib/cache'
import { getBusinessDateAndPeriod } from '@/lib/dateUtils'
import { normalizePhone } from '@/lib/phoneUtils'

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

    const oldNameIndex = headers.findIndex(h => h.includes('商品名稱') && !h.includes('新'))
    const newNameIndex = headers.findIndex(h => h.includes('新商品名稱'))
    const largeCategoryIndex = headers.findIndex(h => h === '大分類')
    const smallCategoryIndex = headers.findIndex(h => h === '小分類')

    console.log(`📋 商品主檔欄位索引: 商品名稱=${oldNameIndex}, 新商品名稱=${newNameIndex}, 大分類=${largeCategoryIndex}, 小分類=${smallCategoryIndex}`)

    const categoryMap = new Map<string, { large: string, small: string }>()

    if ((oldNameIndex !== -1 || newNameIndex !== -1) && largeCategoryIndex !== -1 && smallCategoryIndex !== -1) {
      lines.slice(1).forEach((line, index) => {
        const values = line.split(',').map(v => v.replace(/"/g, '').trim())
        const oldProductName = oldNameIndex !== -1 ? values[oldNameIndex] : ''
        const newProductName = newNameIndex !== -1 ? values[newNameIndex] : ''
        const largeCategory = values[largeCategoryIndex]
        const smallCategory = values[smallCategoryIndex]

        // 使用舊商品名稱和新商品名稱都建立映射
        if (oldProductName && largeCategory && smallCategory) {
          categoryMap.set(oldProductName, {
            large: largeCategory,
            small: smallCategory
          })
        }

        if (newProductName && newProductName !== oldProductName && largeCategory && smallCategory) {
          categoryMap.set(newProductName, {
            large: largeCategory,
            small: smallCategory
          })
        }

        // 記錄啤酒類商品用於調試
        if (smallCategory === '啤酒') {
          console.log(`🍺 發現啤酒商品 #${index}: 舊名="${oldProductName}", 新名="${newProductName}", 分類=${largeCategory}/${smallCategory}`)
        }
      })
    }

    productCategoryCache = categoryMap
    categoryCacheTime = now
    console.log(`📋 載入 ${categoryMap.size} 個商品分類映射`)

    // 調試：檢查特定酒類商品是否在映射中
    const debugProducts = ['Asahi生啤酒機', '神息 櫻木桶 威士忌', '雪梅 純米吟釀']
    debugProducts.forEach(product => {
      const mapping = categoryMap.get(product)
      if (mapping) {
        console.log(`🍺 調試 - 找到商品映射: "${product}" → 大分類:${mapping.large}, 小分類:${mapping.small}`)
      } else {
        console.log(`❌ 調試 - 未找到商品映射: "${product}"`)
      }
    })

    return categoryMap
  } catch (error) {
    console.error('載入商品分類映射失敗:', error)
    return new Map()
  }
}

// 檢查商品是否為酒類
function isAlcoholProduct(productName: string, categoryMap: Map<string, { large: string, small: string }>): boolean {
  console.log(`🔍 檢查商品是否為酒類: "${productName}"`)

  // 直接匹配
  const exactMatch = categoryMap.get(productName)
  if (exactMatch) {
    const isAlcohol = exactMatch.large === '6酒水' && (
      exactMatch.small === '東洋酒' ||
      exactMatch.small === '西洋酒' ||
      exactMatch.small === '啤酒'
    )
    console.log(`✅ 直接匹配成功: ${productName} → 大分類:${exactMatch.large}, 小分類:${exactMatch.small}, 是酒類:${isAlcohol}`)
    return isAlcohol
  }

  // 部分匹配（處理商品名稱略有差異的情況）
  for (const [masterProductName, category] of categoryMap.entries()) {
    const hasPartialMatch = productName.includes(masterProductName) || masterProductName.includes(productName)
    const isAlcoholCategory = category.large === '6酒水' && (
      category.small === '東洋酒' ||
      category.small === '西洋酒' ||
      category.small === '啤酒'
    )

    if (hasPartialMatch && isAlcoholCategory) {
      console.log(`✅ 部分匹配成功: "${productName}" ↔ "${masterProductName}" → 大分類:${category.large}, 小分類:${category.small}`)
      return true
    }
  }

  console.log(`❌ 無匹配: "${productName}" 不是酒類商品`)
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

    // 獲取商品分類映射
    const productCategoryMap = await getProductCategoryMap()

    // 獲取訂單資料
    console.log('📥 載入訂單資料...')
    const orderSheetUrl = 'https://docs.google.com/spreadsheets/d/1EWPECWQp_Ehz43Lfks_I8lcvEig8gV9DjyjEIzC5EO4/export?format=csv&gid=0'
    const response = await fetch(orderSheetUrl, { cache: 'no-store' })
    if (!response.ok) throw new Error('無法獲取訂單資料')

    const orderCsv = await response.text()
    const orderLines = orderCsv.split('\n').filter(line => line.trim())
    const orderHeaders = orderLines[0].split(',').map(h => h.replace(/"/g, '').trim())

    // 找到正確的欄位索引
    const checkoutTimeIndex = orderHeaders.findIndex(h => h.includes('結帳時間'))
    const checkoutAmountIndex = orderHeaders.findIndex(h => h.includes('結帳金額') || h.includes('發票金額'))
    const customerNameIndex = orderHeaders.findIndex(h => h.includes('顧客姓名'))
    const customerPhoneIndex = orderHeaders.findIndex(h => h.includes('顧客電話'))
    const itemsIndex = orderHeaders.findIndex(h => h.includes('品項'))

    if (checkoutTimeIndex === -1 || checkoutAmountIndex === -1 || customerNameIndex === -1 || customerPhoneIndex === -1) {
      throw new Error('找不到必要的欄位')
    }

    // 正確的 CSV 解析函數，處理引號內的逗號
    function parseCSVLine(line: string): string[] {
      const result: string[] = []
      let current = ''
      let inQuotes = false

      for (let i = 0; i < line.length; i++) {
        const char = line[i]

        if (char === '"') {
          inQuotes = !inQuotes
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim())
          current = ''
        } else {
          current += char
        }
      }

      result.push(current.trim()) // 添加最後一個字段
      return result
    }

    const orderData = orderLines.slice(1).map(line => {
      const values = parseCSVLine(line).map(v => v.replace(/^"|"$/g, '').trim()) // 移除首尾引號

      const amountStr = (values[checkoutAmountIndex] || '0').replace(/,/g, '').replace(/"/g, '')
      const amt = parseFloat(amountStr)

      return {
        結帳時間: values[checkoutTimeIndex] || '',
        結帳金額: isNaN(amt) ? 0 : amt,
        顧客姓名: values[customerNameIndex] || '',
        顧客電話: normalizePhone(values[customerPhoneIndex]),
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
    const customerStats: {
      [phone: string]: {
        name: string;
        phone: string;
        orderCount: number;
        totalAmount: number;
        lastOrderTime: Date;
        hasAlcohol: boolean;
        alcoholProducts: Set<string>;
        isNewCustomer: boolean;
        hasReturnedAfterNew: boolean; // 新增：新客回訪標記
        hasReturnedAfterOld: boolean; // 新增：舊客回訪標記
      }
    } = {}

    // 篩選指定月份的訂單並統計
    validOrderData.forEach(record => {
      const businessInfo = getBusinessDateAndPeriod(record.結帳時間)

      if (businessInfo) {
        const orderMonth = businessInfo.businessMonthKey
        const date = businessInfo.businessDate

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
                isNewCustomer: false, // 預設為 false，稍後會重新計算
                hasReturnedAfterNew: false, // 預設為 false，稍後會重新計算
                hasReturnedAfterOld: false // 預設為 false，稍後會重新計算
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

              // 檢查每個品項是否為酒類 - 必須檢查所有品項，不要break
              console.log(`📝 檢查訂單品項 (${itemNames.length}個): ${itemNames.join(', ')}`)
              for (const itemName of itemNames) {
                if (isAlcoholProduct(itemName, productCategoryMap)) {
                  customerStats[phone].hasAlcohol = true
                  customerStats[phone].alcoholProducts.add(itemName)
                  console.log(`🍺 客戶 ${phone} 發現酒類商品: ${itemName}`)
                  // ❌ 移除 break - 要繼續檢查其他品項
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

    console.log(`🍺 使用 ${productCategoryMap.size} 個商品分類映射進行酒類檢測`)

    // 計算當月所有訂單總金額（不管有沒有電話號碼）
    const monthlyTotalAmount = orderData
      .filter(record => {
        const businessInfo = getBusinessDateAndPeriod(record.結帳時間)
        if (businessInfo) {
          return businessInfo.businessMonthKey === month
        }
        return false
      })
      .reduce((sum, record) => sum + record.結帳金額, 0)

    console.log(`📊 當月總訂單金額: ${monthlyTotalAmount.toLocaleString()}`)

    // 計算新客判斷
    console.log(`📝 開始計算新客判斷`)
    Object.keys(customerStats).forEach(phone => {
      // 找出該客戶所有的訂單日期
      const customerOrders = validOrderData
        .filter(order => order.顧客電話 === phone)
        .map(order => {
          const businessInfo = getBusinessDateAndPeriod(order.結帳時間)
          return businessInfo ? businessInfo.businessDate : new Date(NaN)
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

    // 計算新客回訪判斷
    console.log(`📝 開始計算新客回訪判斷`)
    Object.keys(customerStats).forEach(phone => {
      const customer = customerStats[phone]

      // 只對新客進行回訪判斷
      if (customer.isNewCustomer) {
        // 找出該客戶在查詢月份之後的所有訂單
        const futureOrders = validOrderData
          .filter(order => order.顧客電話 === phone)
          .map(order => {
            const businessInfo = getBusinessDateAndPeriod(order.結帳時間)
            if (businessInfo) {
              return { date: businessInfo.businessDate, month: businessInfo.businessMonthKey }
            }
            return null
          })
          .filter(order => order !== null)
          .filter(order => order!.month > month) // 只取查詢月份之後的訂單

        // 如果在查詢月份之後有訂單，則標記為已回訪
        customer.hasReturnedAfterNew = futureOrders.length > 0

        if (customer.hasReturnedAfterNew) {
          console.log(`🔄 新客回訪: ${phone} (${customer.name}) 在 ${month} 後有 ${futureOrders.length} 筆訂單`)
        }
      } else {
        // 非新客不需要回訪標記
        customer.hasReturnedAfterNew = false
      }
    })

    const returnedNewCustomerCount = Object.values(customerStats).filter(c => c.isNewCustomer && c.hasReturnedAfterNew).length
    console.log(`📝 新客回訪判斷完成: 共 ${newCustomerCount} 位新客，其中 ${returnedNewCustomerCount} 位有回訪`)

    // 計算舊客回訪判斷（舊回）
    console.log(`📝 開始計算舊客回訪判斷`)
    const oldCustomers = Object.entries(customerStats).filter(([phone, customer]) => !customer.isNewCustomer)

    oldCustomers.forEach(([phone, customer]) => {
      // 查找該客戶在查詢月份之後的所有訂單
      const futureOrders = validOrderData.filter(record => {
        if (record.顧客電話 !== phone) return false
        const businessInfo = getBusinessDateAndPeriod(record.結帳時間)
        if (!businessInfo) return false
        // 檢查是否為查詢月份之後的訂單
        return businessInfo.businessMonthKey > month
      })

      customer.hasReturnedAfterOld = futureOrders.length > 0

      if (customer.hasReturnedAfterOld) {
        console.log(`🔄 舊客回訪: ${phone} (${customer.name}) 在 ${month} 後有 ${futureOrders.length} 筆訂單`)
      }
    })

    const oldCustomerCount = oldCustomers.length
    const returnedOldCustomerCount = Object.values(customerStats).filter(c => !c.isNewCustomer && c.hasReturnedAfterOld).length
    console.log(`📝 舊客回訪判斷完成: 共 ${oldCustomerCount} 位舊客，其中 ${returnedOldCustomerCount} 位有回訪`)

    // 轉換為陣列並按訂單數量排序
    const customerArray = Object.values(customerStats)
      .filter(customer => customer.orderCount > 0)
      .map(customer => ({
        rank: 0, // 將在排序後設定
        customerName: customer.name,
        customerPhone: customer.phone,
        orderCount: customer.orderCount,
        averageOrderAmount: Math.round(customer.totalAmount / customer.orderCount),
        totalOrderAmount: Math.round(customer.totalAmount),
        amountPercentage: Math.round((customer.totalAmount / monthlyTotalAmount) * 100 * 10) / 10, // 計算到小數點後一位
        cumulativePercentage: 0, // 將在後面計算
        hasAlcohol: customer.hasAlcohol,
        isNewCustomer: customer.isNewCustomer,
        hasReturnedAfterNew: customer.hasReturnedAfterNew,
        hasReturnedAfterOld: customer.hasReturnedAfterOld
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

    // 取前 30 名
    const result = customerArray.slice(0, 30)

    console.log(`計算完成，共 ${customerArray.length} 位客戶，取前 30 名`)

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