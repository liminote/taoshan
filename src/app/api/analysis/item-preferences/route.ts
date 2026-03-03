import { NextResponse } from 'next/server'
import { normalizePhone } from '@/lib/phoneUtils'

// CSV 解析函數
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

  result.push(current.trim())
  return result
}

export async function GET() {
  try {
    console.log('🍽️ 開始分析新客與新回客的品項偏好...')

    // 先獲取多個月份的客戶分類資訊，涵蓋2024年9月到2025年9月
    console.log('📊 獲取2024/9-2025/9期間的客戶分類資訊...')

    // 需要涵蓋的月份
    const months = [
      '2024-09', '2024-10', '2024-11', '2024-12',
      '2025-01', '2025-02', '2025-03', '2025-04',
      '2025-05', '2025-06', '2025-07', '2025-08', '2025-09'
    ]

    const allCustomers = new Map()

    // 獲取最近一個月的客戶分類作為基準
    const customerRankingResponse = await fetch('https://restaurant-management-pi.vercel.app/api/reports/customer-spending-ranking?month=2024-12')

    if (!customerRankingResponse.ok) {
      throw new Error('無法獲取客戶排行榜資料')
    }

    const customerData = await customerRankingResponse.json()

    if (!customerData.success || !customerData.data?.customers) {
      throw new Error('客戶資料格式錯誤')
    }

    // 識別新客和新回客（從Top30中選取）
    const top30Customers = customerData.data.customers.slice(0, 30)
    const newCustomers = top30Customers.filter((c: any) => c.isNewCustomer && !c.hasReturnedAfterNew)
    const returningCustomers = top30Customers.filter((c: any) => c.isNewCustomer && c.hasReturnedAfterNew)

    console.log(`👥 找到 ${newCustomers.length} 個新客，${returningCustomers.length} 個新回客`)

    // 建立客戶電話號碼對應表
    const newCustomerPhones = new Set(newCustomers.map((c: any) => normalizePhone(c.phone)))
    const returningCustomerPhones = new Set(returningCustomers.map((c: any) => normalizePhone(c.phone)))

    // 讀取原始訂單資料
    console.log('📥 讀取原始訂單資料...')
    const orderSheetUrl = 'https://docs.google.com/spreadsheets/d/1EWPECWQp_Ehz43Lfks_I8lcvEig8gV9DjyjEIzC5EO4/export?format=csv&gid=0'
    const orderResponse = await fetch(orderSheetUrl)

    if (!orderResponse.ok) {
      throw new Error('無法獲取訂單資料')
    }

    const orderCsv = await orderResponse.text()
    const orderLines = orderCsv.split('\n').filter(line => line.trim())
    const orderHeaders = orderLines[0].split(',').map(h => h.replace(/"/g, '').trim())

    // 找欄位索引
    const phoneIndex = orderHeaders.findIndex(h => h.includes('顧客電話'))
    const nameIndex = orderHeaders.findIndex(h => h.includes('顧客姓名'))
    const itemsIndex = orderHeaders.findIndex(h => h.includes('品項'))
    const amountIndex = orderHeaders.findIndex(h => h.includes('結帳金額'))
    const timeIndex = orderHeaders.findIndex(h => h.includes('結帳時間'))

    console.log('🏷️ 欄位索引:', { phoneIndex, nameIndex, itemsIndex, amountIndex, timeIndex })

    if (phoneIndex === -1 || itemsIndex === -1) {
      throw new Error('找不到必要的欄位')
    }

    // 分析品項偏好
    const newCustomerItems: Record<string, { quantity: number; totalAmount: number }> = {}
    const returningCustomerItems: Record<string, { quantity: number; totalAmount: number }> = {}

    console.log('🔍 開始分析訂單品項...')

    orderLines.slice(1).forEach((line, index) => {
      if (index % 1000 === 0) {
        console.log(`處理第 ${index} 筆訂單...`)
      }

      const values = parseCSVLine(line).map(v => v.replace(/^"|"$/g, '').trim())
      const phone = normalizePhone(values[phoneIndex])
      const items = values[itemsIndex] || ''
      const orderTime = values[timeIndex] || ''

      if (!phone || !items) return

      // 檢查是否為目標客戶
      const isNewCustomer = newCustomerPhones.has(phone)
      const isReturningCustomer = returningCustomerPhones.has(phone)

      if (!isNewCustomer && !isReturningCustomer) return

      // 檢查訂單時間是否在2024/9-2025/9期間
      if (orderTime) {
        let isInTargetPeriod = false

        // 解析日期
        const dateMatch = orderTime.match(/(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/)
        if (dateMatch) {
          const year = parseInt(dateMatch[1])
          const month = parseInt(dateMatch[2])

          // 檢查是否在目標期間
          if (year === 2024 && month >= 9) {
            isInTargetPeriod = true
          } else if (year === 2025 && month <= 9) {
            isInTargetPeriod = true
          }
        }

        if (!isInTargetPeriod) return
      }

      // 解析品項
      const itemList = items.split(',').map(item => item.trim()).filter(Boolean)

      itemList.forEach(item => {
        // 提取商品名稱和價格 (格式: "商品名 $價格")
        const match = item.match(/^(.+?)\s*\$(\d+(?:\.\d+)?)$/)
        if (match) {
          const itemName = match[1].trim()
          const itemPrice = parseFloat(match[2])

          if (isNewCustomer) {
            if (!newCustomerItems[itemName]) {
              newCustomerItems[itemName] = { quantity: 0, totalAmount: 0 }
            }
            newCustomerItems[itemName].quantity += 1
            newCustomerItems[itemName].totalAmount += itemPrice
          }

          if (isReturningCustomer) {
            if (!returningCustomerItems[itemName]) {
              returningCustomerItems[itemName] = { quantity: 0, totalAmount: 0 }
            }
            returningCustomerItems[itemName].quantity += 1
            returningCustomerItems[itemName].totalAmount += itemPrice
          }
        }
      })
    })

    // 轉換為排序陣列
    const formatItems = (itemStats: Record<string, { quantity: number; totalAmount: number }>) => {
      return Object.entries(itemStats)
        .map(([item, stats]) => ({
          品項名稱: item,
          數量: stats.quantity,
          總金額: Math.round(stats.totalAmount)
        }))
        .sort((a, b) => b.總金額 - a.總金額)
    }

    const newCustomerItemsSorted = formatItems(newCustomerItems)
    const returningCustomerItemsSorted = formatItems(returningCustomerItems)

    console.log(`🍽️ 新客品項種類: ${newCustomerItemsSorted.length}`)
    console.log(`🍽️ 新回客品項種類: ${returningCustomerItemsSorted.length}`)

    return NextResponse.json({
      success: true,
      period: '2024年9月至2025年9月',
      summary: {
        新客人數: newCustomers.length,
        新回客人數: returningCustomers.length,
        新客品項種類: newCustomerItemsSorted.length,
        新回客品項種類: returningCustomerItemsSorted.length
      },
      新客品項偏好: newCustomerItemsSorted.slice(0, 30), // 前30項
      新回客品項偏好: returningCustomerItemsSorted.slice(0, 30), // 前30項

      // 提供完整清單供下載
      完整資料: {
        新客所有品項: newCustomerItemsSorted,
        新回客所有品項: returningCustomerItemsSorted
      }
    })

  } catch (error) {
    console.error('❌ 分析品項偏好時發生錯誤:', error)
    return NextResponse.json({
      error: '分析失敗',
      details: error instanceof Error ? error.message : '未知錯誤'
    }, { status: 500 })
  }
}