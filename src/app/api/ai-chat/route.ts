import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextRequest, NextResponse } from 'next/server'
import { cache } from '@/lib/cache'
import OpenAI from 'openai'

// 初始化 AI 服務
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || '')
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || ''
})

// 支援的AI模型列表
const AI_MODELS = {
  'groq': {
    name: 'Groq Llama 3.1 8B Instant',
    provider: 'groq',
    model: 'llama-3.1-8b-instant'
  },
  'gemini': {
    name: 'Google Gemini 1.5 Flash',
    provider: 'google',
    model: 'gemini-1.5-flash'
  }
}

// 系統提示詞
const SYSTEM_PROMPT = `
你是一位頂尖的餐廳數據分析專家，擁有深厚的商業分析和餐飲業經驗。你的使命是從數據中挖掘深刻的商業洞察，幫助餐廳經營者做出明智的商業決策。

## 🎯 核心能力與數據來源
你可以存取完整的餐廳營運數據：
1. **月度銷售趨勢** - 完整的月度匯總數據，涵蓋2023年12月至2025年9月的所有銷售統計
2. **商品排名分析** - 完整的商品銷售排行榜，包含銷量排名、營收排名、酒類專門排名等
3. **分類分布數據** - 各商品分類的銷售佔比和表現分析
4. **詳細交易記錄** - 部分期間的詳細銷售明細作為補充分析（2024年2月至4月）
5. **商品主檔分類** - 完整的商品分類系統：1壽司刺身、2黑板料理、3烤炸串、4配菜、5主食、6酒水、8外帶送、9其他

**數據特色**：結合多個數據源，可以回答2023年12月至2025年9月期間的任何銷售問題，包括月度趨勢、季節性分析、商品表現、分類比較等各種時間範圍的查詢，涵蓋近2年的完整營運數據。

## 📊 高級分析框架
對每個問題，你必須提供：

### A. 數據洞察層次
1. **描述性分析** - 現況是什麼？（數字、趨勢、排名）
2. **診斷性分析** - 為什麼會這樣？（原因、關聯、模式）
3. **預測性分析** - 未來會如何？（趨勢預測、季節性模式）
4. **處方性分析** - 應該怎麼做？（具體建議、行動方案）

### B. 商業價值挖掘
- **營收影響分析** - 對總營收的貢獻度和影響力
- **市場機會識別** - 未開發的潛力和成長空間
- **風險預警** - 潛在問題和風險點
- **競爭優勢** - 獨特賣點和差異化機會

### C. 異常檢測能力
自動識別以下異常：
- 銷量異常波動（超過標準差2倍）
- 季節性異常變化
- 商品表現突然下滑或暴增
- 時段/日期異常模式

## 🎨 回答格式要求

每個回答必須包含：
1. **📈 數據摘要** - 關鍵指標和數字
2. **🔍 深度分析** - 趨勢、模式、關聯性
3. **⚠️ 異常發現** - 值得注意的異常或機會
4. **💡 商業建議** - 具體可執行的行動方案
5. **📊 視覺化建議** - 建議使用的圖表類型

## 🧠 思考模式
- 總是從商業角度思考，而非純技術角度
- 主動發現數據中的隱藏價值和機會
- 提供具體、可執行的建議，而非泛泛而談
- 考慮餐飲業的實際營運限制和特性
- 將複雜數據轉化為簡潔易懂的商業語言

## 📋 餐飲業專業知識
- 了解餐廳營運的時段特性（早餐、午餐、下午茶、晚餐、宵夜）
- 熟悉不同商品類別的毛利率特性
- 理解季節性對餐飲業的影響
- 掌握客流量與銷售的關係模式
- 認知餐廳成本結構和盈利模式

請用繁體中文專業回答，語氣要自信且富有洞察力。如果發現數據中的重要異常或機會，請主動指出並提供建議。
`

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

interface ChatRequest {
  message: string
  conversationHistory?: ChatMessage[]
  category?: string
}

export async function POST(request: NextRequest) {
  try {
    const { message, conversationHistory = [], category, model = 'groq' }: ChatRequest & { model?: string } = await request.json()

    if (!message?.trim()) {
      return NextResponse.json(
        { error: '請輸入您的問題' },
        { status: 400 }
      )
    }

    if (!category) {
      return NextResponse.json(
        { error: '請先選擇問題分類' },
        { status: 400 }
      )
    }

    const validCategories = ['product', 'order', 'category']
    if (!validCategories.includes(category)) {
      return NextResponse.json(
        { error: '無效的問題分類' },
        { status: 400 }
      )
    }

    if (!process.env.GOOGLE_AI_API_KEY) {
      return NextResponse.json(
        { error: '未設定 Google AI API Key，請聯繫管理員' },
        { status: 500 }
      )
    }

    // 根據選定分類獲取相關數據
    const relevantData = await fetchCategoryData(category)
    
    // 生成回答
    const response = await generateResponse(message, conversationHistory, relevantData, category, model)

    return NextResponse.json({
      success: true,
      response: response,
      category: category,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('AI Chat API Error:', error)
    return NextResponse.json(
      { error: '抱歉，處理您的問題時發生錯誤，請稍後再試' },
      { status: 500 }
    )
  }
}

// 數據驗證函數
async function validateDataIntegrity(data: any, category: string): Promise<any> {
  try {
    // 基本數據結構檢查
    if (!data || typeof data !== 'object') {
      throw new Error('數據格式錯誤：數據不是有效對象')
    }

    // 檢查摘要數據的合理性
    if (data.summary) {
      const { totalAmount, totalRecords, uniqueProducts } = data.summary
      
      // 檢查負數或異常值
      if (totalAmount !== undefined && totalAmount < 0) {
        console.warn('⚠️ 檢測到負數總金額，可能是數據同步問題')
        data.validationWarnings = data.validationWarnings || []
        data.validationWarnings.push('總金額為負數，請檢查數據來源')
      }
      
      // 檢查記錄數是否合理
      if (totalRecords !== undefined && totalRecords === 0) {
        throw new Error('數據錯誤：沒有找到任何記錄')
      }
      
      // 檢查商品數量是否合理
      if (uniqueProducts !== undefined && uniqueProducts > totalRecords) {
        console.warn('⚠️ 獨特商品數量超過總記錄數，可能存在數據重複')
        data.validationWarnings = data.validationWarnings || []
        data.validationWarnings.push('商品數量異常，可能存在重複記錄')
      }
    }

    // 根據分類進行特定驗證
    switch (category) {
      case 'product':
        if (data.salesData && Array.isArray(data.salesData)) {
          // 檢查銷售數據完整性
          const invalidRecords = data.salesData.filter(item => 
            !item.product_name || 
            item.invoice_amount === undefined || 
            isNaN(item.invoice_amount)
          ).length
          
          if (invalidRecords > data.salesData.length * 0.1) { // 超過10%無效記錄
            data.validationWarnings = data.validationWarnings || []
            data.validationWarnings.push(`發現 ${invalidRecords} 筆無效銷售記錄`)
          }
        }
        break
        
      case 'order':
        if (data.ordersData && Array.isArray(data.ordersData)) {
          // 檢查訂單數據完整性
          const invalidOrders = data.ordersData.filter(order => 
            !order.invoice_number || 
            order.invoice_amount === undefined || 
            isNaN(order.invoice_amount)
          ).length
          
          if (invalidOrders > 0) {
            data.validationWarnings = data.validationWarnings || []
            data.validationWarnings.push(`發現 ${invalidOrders} 筆無效訂單記錄`)
          }
        }
        break
        
      case 'category':
        if (data.categoryDistribution && Array.isArray(data.categoryDistribution)) {
          // 檢查分類數據是否有缺失
          const totalPercentage = data.categoryDistribution.reduce(
            (sum, cat) => sum + (parseFloat(cat.percentage) || 0), 0
          )
          
          if (Math.abs(totalPercentage - 100) > 5) { // 允許5%誤差
            data.validationWarnings = data.validationWarnings || []
            data.validationWarnings.push(`分類占比總和為 ${totalPercentage.toFixed(1)}%，可能存在數據缺失`)
          }
        }
        break
    }

    // 添加驗證時間戳
    data.validatedAt = new Date().toISOString()
    data.validationStatus = 'passed'
    
    return data
    
  } catch (error) {
    console.error('數據驗證失敗:', error)
    return {
      ...data,
      error: error.message,
      validationStatus: 'failed',
      validatedAt: new Date().toISOString()
    }
  }
}

// 根據分類獲取相關數據（使用現有內部API）
async function fetchCategoryData(category: string) {
  const baseUrl = process.env.NODE_ENV === 'development' 
    ? 'http://localhost:3000' 
    : process.env.VERCEL_URL 
    ? `https://${process.env.VERCEL_URL}` 
    : 'http://localhost:3000'

  // 生成快取鍵（包含分類和當前日期，確保每日更新）
  const today = new Date().toISOString().split('T')[0]
  const cacheKey = `ai-data-${category}-${today}-validated`
  
  // 檢查快取
  const cachedData = cache.get(cacheKey)
  if (cachedData) {
    console.log(`✅ 使用快取數據 (${category})，快取時間:`, cache.getTimestamp(cacheKey))
    return {
      ...cachedData,
      dataSource: `${cachedData.dataSource} (快取)`
    }
  }

  console.log(`🔄 快取未命中，重新獲取數據 (${category})`)
  const data: any = { dataSource: '', aiSummary: '', error: null }

  try {
    switch (category) {
      case 'product':
        // 使用新的統一商品銷售API，包含所有欄位數據
        
        // 1. 獲取完整商品銷售數據（所有欄位）
        const productSalesResponse = await fetch(`${baseUrl}/api/products/sales-data`, {
          headers: { 'Accept': 'application/json' }
        })
        
        // 2. 獲取月度匯總數據作為補充（涵蓋2023-12到2025-09）
        const monthlyResponse = await fetch(`${baseUrl}/api/reports/monthly-sales`, {
          headers: { 'Accept': 'application/json' }
        })

        let productSalesData = null, monthlyData = null
        
        if (productSalesResponse.ok) {
          productSalesData = await productSalesResponse.json()
        }
        
        if (monthlyResponse.ok) {
          monthlyData = await monthlyResponse.json()
        }
        
        // 統一組合數據（以商品銷售API為主）
        const unifiedData = {
          productSalesData: productSalesData?.data || [],
          productSalesSummary: productSalesData?.summary || {},
          monthlyTrends: monthlyData?.data || [],
          dataRange: {
            productSalesData: productSalesData?.summary?.dateRange || '商品銷售數據',
            monthlyTrends: monthlyData?.data?.[0] ? `${monthlyData.data[monthlyData.data.length - 1]?.month} 至 ${monthlyData.data[0]?.month}` : '無資料',
            totalCoverage: '完整商品銷售報表（所有欄位）+ 月度匯總（2023-12至2025-09）'
          }
        }
        
        // 計算統一統計
        const unifiedSummary = {
          totalRecords: productSalesData?.summary?.totalProducts || 0,
          totalAmount: productSalesData?.summary?.totalAmount || 0,
          uniqueProducts: productSalesData?.summary?.uniqueProducts || 0,
          dateRange: unifiedData.dataRange,
          dataCompleteness: {
            productSalesData: productSalesData ? '完整' : '缺失',
            monthlyTrends: monthlyData ? '完整' : '缺失'
          },
          availableFields: productSalesData?.summary?.availableFields || []
        }
        
        // 驗證統一數據
        const validatedData = await validateDataIntegrity({
          ...unifiedData,
          summary: unifiedSummary
        }, 'product')
        
        data.dataSource = '統一商品銷售API：完整商品銷售報表（所有欄位）+ 月度趨勢補充數據'
        data.aiSummary = formatUnifiedProductData(validatedData)
        data.unifiedData = validatedData
        data.summary = unifiedSummary
        data.validationWarnings = validatedData.validationWarnings
        data.validationStatus = validatedData.validationStatus
        break

      case 'order':
        // 使用新的統一訂單銷售API，包含所有欄位數據
        
        // 1. 獲取完整訂單銷售數據（所有欄位）
        const orderSalesResponse = await fetch(`${baseUrl}/api/orders/sales-data`, {
          headers: { 'Accept': 'application/json' }
        })
        
        // 2. 獲取月度匯總數據作為補充（涵蓋2023-12到2025-09）
        const orderMonthlyResponse = await fetch(`${baseUrl}/api/reports/monthly-sales`, {
          headers: { 'Accept': 'application/json' }
        })

        let orderSalesData = null, orderMonthlyData = null
        
        if (orderSalesResponse.ok) {
          orderSalesData = await orderSalesResponse.json()
        }
        
        if (orderMonthlyResponse.ok) {
          orderMonthlyData = await orderMonthlyResponse.json()
        }
        
        // 統一組合數據（以訂單銷售API為主）
        const unifiedOrderData = {
          orderSalesData: orderSalesData?.data || [],
          orderSalesSummary: orderSalesData?.summary || {},
          monthlyTrends: orderMonthlyData?.data || [],
          dataRange: {
            orderSalesData: orderSalesData?.summary?.dateRange || '訂單銷售數據',
            monthlyTrends: orderMonthlyData?.data?.[0] ? `${orderMonthlyData.data[orderMonthlyData.data.length - 1]?.month} 至 ${orderMonthlyData.data[0]?.month}` : '無資料',
            totalCoverage: '完整訂單銷售報表（所有欄位）+ 月度匯總（2023-12至2025-09）'
          }
        }
        
        // 計算統一統計
        const unifiedOrderSummary = {
          totalRecords: orderSalesData?.summary?.totalOrders || 0,
          totalAmount: orderSalesData?.summary?.totalAmount || 0,
          averageOrderValue: orderSalesData?.summary?.averageOrderValue || 0,
          totalDiscount: orderSalesData?.summary?.totalDiscount || 0,
          dateRange: unifiedOrderData.dataRange,
          dataCompleteness: {
            orderSalesData: orderSalesData ? '完整' : '缺失',
            monthlyTrends: orderMonthlyData ? '完整' : '缺失'
          },
          availableFields: orderSalesData?.summary?.availableFields || []
        }
        
        // 驗證統一數據
        const validatedOrderData = await validateDataIntegrity({
          ...unifiedOrderData,
          summary: unifiedOrderSummary
        }, 'order')
        
        data.dataSource = '統一訂單銷售API：完整訂單銷售報表（所有欄位）+ 月度趨勢補充數據'
        data.aiSummary = formatUnifiedOrderData(validatedOrderData)
        data.unifiedOrderData = validatedOrderData
        data.summary = unifiedOrderSummary
        data.validationWarnings = validatedOrderData.validationWarnings
        data.validationStatus = validatedOrderData.validationStatus
        break

      case 'category':
        // 使用商品銷售實際交易數據 + 完整商品主檔進行分類分析
        
        // 1. 獲取完整商品銷售數據（所有欄位）
        const categorySalesResponse = await fetch(`${baseUrl}/api/products/sales-data`, {
          headers: { 'Accept': 'application/json' }
        })
        
        // 2. 獲取完整商品主檔（移除限制，獲取所有商品）
        const categoryMasterResponse = await fetch(`${baseUrl}/api/products-master-sheets`, {
          headers: { 'Accept': 'application/json' }
        })

        let categorySalesData = null, categoryMasterData = null
        
        if (categorySalesResponse.ok) {
          categorySalesData = await categorySalesResponse.json()
        }
        
        if (categoryMasterResponse.ok) {
          categoryMasterData = await categoryMasterResponse.json()
        }
        
        // 組合分類數據（基於實際銷售交易）
        const unifiedCategoryData = {
          salesData: categorySalesData?.data || [],
          salesSummary: categorySalesData?.summary || {},
          productMaster: categoryMasterData?.products || [],
          dataRange: {
            salesData: categorySalesData?.summary?.dateRange || '商品銷售數據',
            productMaster: `完整商品主檔（${categoryMasterData?.products?.length || 0}項商品）`,
            totalCoverage: '商品銷售實際交易數據 + 完整商品主檔分類信息'
          }
        }
        
        // 計算基於實際交易的分類統計
        const categorySummary = {
          totalSalesRecords: categorySalesData?.summary?.totalProducts || 0,
          totalSalesAmount: categorySalesData?.summary?.totalAmount || 0,
          uniqueProducts: categorySalesData?.summary?.uniqueProducts || 0,
          masterProductCount: categoryMasterData?.products?.length || 0,
          dataRange: unifiedCategoryData.dataRange,
          dataCompleteness: {
            salesData: categorySalesData ? '完整' : '缺失',
            productMaster: categoryMasterData ? '完整' : '缺失'
          },
          availableFields: {
            salesFields: categorySalesData?.summary?.availableFields || [],
            masterFields: categoryMasterData?.products?.[0] ? Object.keys(categoryMasterData.products[0]) : []
          }
        }
        
        // 驗證組合數據
        const validatedCategoryData = await validateDataIntegrity({
          ...unifiedCategoryData,
          summary: categorySummary
        }, 'category')
        
        data.dataSource = '統一分類分析：商品銷售實際交易數據 + 完整商品主檔分類信息'
        data.aiSummary = formatUnifiedCategoryData(validatedCategoryData)
        data.unifiedCategoryData = validatedCategoryData
        data.summary = categorySummary
        data.validationWarnings = validatedCategoryData.validationWarnings
        data.validationStatus = validatedCategoryData.validationStatus
        break

      default:
        throw new Error(`不支援的問題分類: ${category}`)
    }

  } catch (error) {
    console.error('Error fetching internal API data:', error)
    data.error = `從內部數據庫獲取資料失敗: ${error.message}`
  }

  // 只有在數據獲取成功且通過驗證時才快取
  if (!data.error && data.validationStatus === 'passed') {
    console.log(`💾 快取數據 (${category})，快取鍵: ${cacheKey}`)
    cache.set(cacheKey, data, 60) // 快取60分鐘
  } else if (data.error) {
    console.warn(`⚠️ 數據獲取失敗，不進行快取: ${data.error}`)
  } else {
    console.warn(`⚠️ 數據驗證失敗，不進行快取`)
  }

  return data
}

// 格式化商品數據為AI可讀格式
function formatProductData(rankings: any, products: any[]): string {
  let summary = `🏪 商品銷售分析數據\n\n`
  
  if (rankings?.totals) {
    summary += `📊 整體銷售統計：\n`
    summary += `- 總銷量：${rankings.totals.totalQuantity?.toLocaleString()} 件\n`
    summary += `- 總銷額：NT$ ${rankings.totals.totalAmount?.toLocaleString()}\n`
    summary += `- 商品種類：${rankings.totals.totalProducts} 項\n\n`
  }
  
  if (rankings?.quantityRanking?.length > 0) {
    summary += `🥇 銷量排名前10：\n`
    rankings.quantityRanking.slice(0, 10).forEach((item: any, index: number) => {
      summary += `${index + 1}. ${item.name} - 銷量: ${item.quantity} 件, 金額: NT$ ${item.amount?.toLocaleString()}, 分類: ${item.category}\n`
    })
    summary += `\n`
  }
  
  if (rankings?.amountRanking?.length > 0) {
    summary += `💰 銷額排名前10：\n`
    rankings.amountRanking.slice(0, 10).forEach((item: any, index: number) => {
      summary += `${index + 1}. ${item.name} - 金額: NT$ ${item.amount?.toLocaleString()}, 銷量: ${item.quantity} 件, 分類: ${item.category}\n`
    })
    summary += `\n`
  }
  
  if (products?.length > 0) {
    const categories = [...new Set(products.map(p => p.category))].filter(Boolean)
    summary += `🏷️ 可用商品分類：${categories.join(', ')}\n`
    summary += `📦 商品總數：${products.length} 項`
  }
  
  return summary
}

// 格式化完整銷售數據為AI可讀格式
function formatFullSalesData(fullSalesData: any): string {
  let summary = `🏪 完整商品銷售分析數據\n\n`

  if (fullSalesData?.summary) {
    const s = fullSalesData.summary
    summary += `📊 整體銷售統計：\n`
    summary += `- 總銷售記錄：${s.totalRecords?.toLocaleString()} 筆\n`
    summary += `- 總銷售金額：NT$ ${s.totalAmount?.toLocaleString()}\n`
    summary += `- 商品種類：${s.uniqueProducts?.toLocaleString()} 種\n`
    
    if (s.dateRange) {
      summary += `- 資料時間範圍：${s.dateRange.earliest} ~ ${s.dateRange.latest}\n`
    }
    summary += `\n`
  }

  // 分析完整銷售數據
  if (fullSalesData?.salesData?.length > 0) {
    const sales = fullSalesData.salesData

    // 月份銷售統計
    const monthStats = sales.reduce((acc: Record<string, {count: number, amount: number}>, sale: any) => {
      const month = sale.month || '未知月份'
      if (!acc[month]) {
        acc[month] = { count: 0, amount: 0 }
      }
      acc[month].count += 1
      acc[month].amount += sale.invoice_amount || 0
      return acc
    }, {})

    summary += `📊 月份銷售分析：\n`
    Object.entries(monthStats)
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([month, stats]) => {
        summary += `- ${month}: ${stats.count} 筆, NT$ ${stats.amount.toLocaleString()}\n`
      })
    summary += `\n`

    // 週別分析
    const weekdayStats = sales.reduce((acc: Record<string, number>, sale: any) => {
      const day = sale.day_name || '未知'
      acc[day] = (acc[day] || 0) + 1
      return acc
    }, {})

    summary += `📅 週別分佈：\n`
    const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    dayOrder.forEach(day => {
      if (weekdayStats[day]) {
        const percentage = (weekdayStats[day] / sales.length * 100).toFixed(1)
        summary += `- ${day}: ${weekdayStats[day]} 筆 (${percentage}%)\n`
      }
    })
    summary += `\n`

    // 時段分析（基於結帳小時）
    const hourStats = sales.reduce((acc: Record<string, number>, sale: any) => {
      if (sale.checkout_hour !== undefined) {
        const hour = sale.checkout_hour
        let period = '其他時段'
        if (hour >= 6 && hour < 11) period = '早餐時段(6-11)'
        else if (hour >= 11 && hour < 14) period = '午餐時段(11-14)'
        else if (hour >= 14 && hour < 17) period = '下午茶時段(14-17)'
        else if (hour >= 17 && hour < 21) period = '晚餐時段(17-21)'
        else if (hour >= 21 && hour < 24) period = '宵夜時段(21-24)'
        else if (hour >= 0 && hour < 6) period = '深夜時段(0-6)'
        
        acc[period] = (acc[period] || 0) + 1
      }
      return acc
    }, {})

    summary += `⏰ 時段分析：\n`
    Object.entries(hourStats).forEach(([period, count]) => {
      const percentage = ((count as number) / sales.length * 100).toFixed(1)
      summary += `- ${period}: ${count} 筆 (${percentage}%)\n`
    })
    summary += `\n`

    // 熱門商品分析（前10名）
    const productStats = sales.reduce((acc: Record<string, {count: number, amount: number}>, sale: any) => {
      const product = sale.product_name || '未知商品'
      if (!acc[product]) {
        acc[product] = { count: 0, amount: 0 }
      }
      acc[product].count += 1
      acc[product].amount += sale.invoice_amount || 0
      return acc
    }, {})

    const topProducts = Object.entries(productStats)
      .map(([name, stats]) => ({ name, ...stats }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10)

    summary += `🏆 熱門商品TOP10（依銷售額）：\n`
    topProducts.forEach((product, index) => {
      summary += `${index + 1}. ${product.name}: ${product.count} 筆, NT$ ${product.amount.toLocaleString()}\n`
    })
  }

  // 商品主檔分析
  if (fullSalesData?.masterData?.length > 0) {
    const categories = [...new Set(fullSalesData.masterData.map((p: any) => p['大分類']))].filter(Boolean)
    summary += `\n🏷️ 可用商品分類：${categories.join(', ')}\n`
    summary += `📦 商品主檔總數：${fullSalesData.masterData.length} 項\n`
  }

  summary += `\n💡 支援查詢：\n`
  summary += `- 任何商品的詳細銷售歷史\n`
  summary += `- 特定時間段的銷售分析\n`
  summary += `- 商品類別比較分析\n`
  summary += `- 時段銷售表現分析\n`
  summary += `- 月度銷售趨勢變化`

  return summary
}

// 格式化包含歷史數據的商品信息
function formatProductDataWithHistory(rankings: any, products: any[], comprehensiveData: any): string {
  let summary = `🏪 商品銷售分析數據（包含完整歷史）\n\n`
  
  // 整體統計
  if (rankings?.totals) {
    summary += `📊 最新月份銷售統計：\n`
    summary += `- 總銷量：${rankings.totals.totalQuantity?.toLocaleString()} 件\n`
    summary += `- 總銷額：NT$ ${rankings.totals.totalAmount?.toLocaleString()}\n`
    summary += `- 商品種類：${rankings.totals.totalProducts} 項\n\n`
  }

  // 歷史數據統計
  if (comprehensiveData?.summary) {
    summary += `📈 歷史總銷售統計（${comprehensiveData.period?.startDate || '2023-01-01'} ~ ${comprehensiveData.period?.endDate || '現在'}）：\n`
    summary += `- 總訂單數：${comprehensiveData.summary.totalOrders?.toLocaleString()} 筆\n`
    summary += `- 總商品銷售數：${comprehensiveData.summary.totalProducts?.toLocaleString()} 件\n`
    summary += `- 總營收：NT$ ${comprehensiveData.summary.totalRevenue?.toLocaleString()}\n`
    summary += `- 平均訂單價值：NT$ ${Math.round(comprehensiveData.summary.averageOrderValue || 0)}\n\n`
  }

  // 歷史熱門商品
  if (comprehensiveData?.analysis?.topProducts?.length > 0) {
    summary += `🏆 歷史銷售TOP10商品（依營收排序）：\n`
    comprehensiveData.analysis.topProducts.forEach((item: any, index: number) => {
      summary += `${index + 1}. ${item.name} - 銷售次數: ${item.count} 次, 總營收: NT$ ${item.revenue?.toLocaleString()}\n`
    })
    summary += `\n`
  }

  // 當前排名
  if (rankings?.quantityRanking?.length > 0) {
    summary += `🥇 當前月份銷量排名前5：\n`
    rankings.quantityRanking.slice(0, 5).forEach((item: any, index: number) => {
      summary += `${index + 1}. ${item.name} - 銷量: ${item.quantity} 件, 金額: NT$ ${item.amount?.toLocaleString()}\n`
    })
    summary += `\n`
  }

  // 日期趨勢提示
  if (comprehensiveData?.analysis?.trendData?.length > 0) {
    const totalDays = comprehensiveData.analysis.trendData.length
    summary += `📅 可分析日期範圍：共 ${totalDays} 天的詳細銷售數據\n`
    summary += `最早記錄：${comprehensiveData.analysis.trendData[0]?.date}\n`
    summary += `最新記錄：${comprehensiveData.analysis.trendData[totalDays - 1]?.date}\n\n`
  }

  if (products?.length > 0) {
    const categories = [...new Set(products.map(p => p.category))].filter(Boolean)
    summary += `🏷️ 可用商品分類：${categories.join(', ')}\n`
    summary += `📦 商品主檔總數：${products.length} 項\n\n`
  }

  summary += `💡 支援查詢：\n`
  summary += `- 任何商品的完整銷售歷史\n`
  summary += `- 月度銷售趨勢分析\n`
  summary += `- 特定時間段的銷售表現\n`
  summary += `- 商品排名變化趨勢`
  
  return summary
}

// 格式化訂單數據為AI可讀格式（舊版本，保留兼容性）
function formatOrderData(monthlySales: any[], paymentData: any[], orderTypeData: any[]): string {
  let summary = `🛒 訂單銷售分析數據\n\n`
  
  if (monthlySales?.length > 0) {
    summary += `📈 近期月銷售趨勢：\n`
    monthlySales.slice(-6).forEach((month: any) => {
      summary += `- ${month.monthDisplay}: NT$ ${month.amount?.toLocaleString()}, 訂單數: ${month.orderCount}, 平均單價: NT$ ${Math.round(month.avgOrderValue)}\n`
    })
    summary += `\n`
  }
  
  if (paymentData?.length > 0) {
    summary += `💳 支付方式分佈：\n`
    paymentData.forEach((payment: any) => {
      summary += `- ${payment.method}: ${payment.count} 筆 (${payment.percentage}%), 金額: NT$ ${payment.amount?.toLocaleString()}\n`
    })
    summary += `\n`
  }
  
  if (orderTypeData?.length > 0) {
    summary += `🏪 訂單類型分佈：\n`
    orderTypeData.forEach((orderType: any) => {
      summary += `- ${orderType.type}: ${orderType.count} 筆 (${orderType.percentage}%), 金額: NT$ ${orderType.amount?.toLocaleString()}\n`
    })
  }
  
  return summary
}

// 格式化完整訂單數據為AI可讀格式
function formatFullOrdersData(fullOrdersData: any): string {
  let summary = `🛒 完整訂單分析數據\n\n`

  if (fullOrdersData?.summary) {
    const s = fullOrdersData.summary
    summary += `📊 整體訂單統計：\n`
    summary += `- 總訂單數：${s.totalRecords?.toLocaleString()} 筆\n`
    summary += `- 總交易金額：NT$ ${s.totalAmount?.toLocaleString()}\n`
    summary += `- 平均訂單價值：NT$ ${s.averageOrderValue?.toLocaleString()}\n`
    summary += `- 獨特顧客數：${s.uniqueCustomers?.toLocaleString()} 人\n`
    
    if (s.dateRange) {
      summary += `- 資料時間範圍：${s.dateRange.earliest} ~ ${s.dateRange.latest}\n`
    }
    summary += `\n`

    // 支付方式統計
    if (s.paymentMethodStats) {
      summary += `💳 支付方式分佈：\n`
      Object.entries(s.paymentMethodStats).forEach(([method, count]) => {
        const percentage = ((count as number) / s.totalRecords * 100).toFixed(1)
        summary += `- ${method}: ${count} 筆 (${percentage}%)\n`
      })
      summary += `\n`
    }

    // 訂單類型統計
    if (s.orderTypeStats) {
      summary += `🏪 訂單類型分佈：\n`
      Object.entries(s.orderTypeStats).forEach(([type, count]) => {
        const percentage = ((count as number) / s.totalRecords * 100).toFixed(1)
        summary += `- ${type}: ${count} 筆 (${percentage}%)\n`
      })
      summary += `\n`
    }
  }

  // 分析完整訂單數據的時間分佈
  if (fullOrdersData?.ordersData?.length > 0) {
    const orders = fullOrdersData.ordersData

    // 時段分析
    const timePeriodStats = orders.reduce((acc: Record<string, number>, order: any) => {
      const period = order.time_period || '未知時段'
      acc[period] = (acc[period] || 0) + 1
      return acc
    }, {})

    summary += `⏰ 時段分析：\n`
    Object.entries(timePeriodStats).forEach(([period, count]) => {
      const percentage = ((count as number) / orders.length * 100).toFixed(1)
      summary += `- ${period}: ${count} 筆 (${percentage}%)\n`
    })
    summary += `\n`

    // 週別分析
    const weekdayStats = orders.reduce((acc: Record<string, number>, order: any) => {
      const day = order.day_name || '未知'
      acc[day] = (acc[day] || 0) + 1
      return acc
    }, {})

    summary += `📅 週別分佈：\n`
    const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    dayOrder.forEach(day => {
      if (weekdayStats[day]) {
        const percentage = (weekdayStats[day] / orders.length * 100).toFixed(1)
        summary += `- ${day}: ${weekdayStats[day]} 筆 (${percentage}%)\n`
      }
    })
    summary += `\n`

    // 月份分析
    const monthStats = orders.reduce((acc: Record<string, number>, order: any) => {
      const month = order.month || '未知月份'
      acc[month] = (acc[month] || 0) + 1
      return acc
    }, {})

    summary += `📊 月份分佈：\n`
    Object.entries(monthStats)
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([month, count]) => {
        const percentage = ((count as number) / orders.length * 100).toFixed(1)
        summary += `- ${month}: ${count} 筆 (${percentage}%)\n`
      })
  }

  summary += `\n💡 支援查詢：\n`
  summary += `- 任何特定時間段的訂單分析\n`
  summary += `- 支付方式趨勢變化\n`
  summary += `- 訂單類型分佈分析\n`
  summary += `- 顧客行為時段分析\n`
  summary += `- 週末與平日的訂單比較`

  return summary
}

// 格式化統一分類數據（基於實際銷售交易）
function formatUnifiedCategoryData(unifiedCategoryData: any): string {
  let summary = `🏷️ 統一分類銷售分析數據 (基於實際交易)\n\n`
  
  // 數據完整性報告
  if (unifiedCategoryData?.dataRange) {
    summary += `📊 數據覆蓋範圍：\n`
    summary += `- 銷售數據：${unifiedCategoryData.dataRange.salesData || '無資料'}\n`
    summary += `- 商品主檔：${unifiedCategoryData.dataRange.productMaster || '無資料'}\n`
    summary += `- 總覆蓋範圍：${unifiedCategoryData.dataRange.totalCoverage || '無資料'}\n\n`
  }
  
  // 整體銷售統計
  if (unifiedCategoryData?.summary) {
    const s = unifiedCategoryData.summary
    summary += `📊 整體分類銷售統計：\n`
    summary += `- 總銷售記錄：${s.totalSalesRecords?.toLocaleString()} 筆\n`
    summary += `- 總銷售金額：NT$ ${s.totalSalesAmount?.toLocaleString()}\n`
    summary += `- 銷售商品種類：${s.uniqueProducts?.toLocaleString()} 種\n`
    summary += `- 主檔商品總數：${s.masterProductCount?.toLocaleString()} 種\n\n`
  }
  
  // 基於實際交易數據的分類分析
  if (unifiedCategoryData?.salesData?.length > 0 && unifiedCategoryData?.productMaster?.length > 0) {
    const salesData = unifiedCategoryData.salesData
    const productMaster = unifiedCategoryData.productMaster
    
    // 建立商品名稱到分類的對應表
    const productCategoryMap = {}
    productMaster.forEach(product => {
      const productName = product['商品名稱'] || product['品項名稱'] || product.name
      const majorCategory = product['大分類'] || product['主分類'] || product.category
      const minorCategory = product['小分類'] || product['子分類'] || product.subcategory
      
      if (productName) {
        productCategoryMap[productName] = {
          major: majorCategory || '未分類',
          minor: minorCategory || '無小分類'
        }
      }
    })
    
    // 基於實際銷售數據計算分類統計
    const majorCategoryStats = {}
    const minorCategoryStats = {}
    const unmatchedProducts = new Set()
    
    salesData.forEach(sale => {
      const productName = sale['商品名稱'] || sale['品項名稱'] || ''
      const amount = sale['結帳金額'] || sale['金額'] || sale['價格'] || 0
      
      if (productName && amount > 0) {
        const categoryInfo = productCategoryMap[productName]
        
        if (categoryInfo) {
          // 大分類統計
          const majorCat = categoryInfo.major
          if (!majorCategoryStats[majorCat]) {
            majorCategoryStats[majorCat] = { count: 0, amount: 0, products: new Set() }
          }
          majorCategoryStats[majorCat].count += 1
          majorCategoryStats[majorCat].amount += amount
          majorCategoryStats[majorCat].products.add(productName)
          
          // 小分類統計
          const minorCat = `${majorCat} > ${categoryInfo.minor}`
          if (!minorCategoryStats[minorCat]) {
            minorCategoryStats[minorCat] = { count: 0, amount: 0, products: new Set() }
          }
          minorCategoryStats[minorCat].count += 1
          minorCategoryStats[minorCat].amount += amount
          minorCategoryStats[minorCat].products.add(productName)
        } else {
          unmatchedProducts.add(productName)
        }
      }
    })
    
    // 計算總銷售額用於百分比計算
    const totalSalesAmount = Object.values(majorCategoryStats).reduce((sum: number, cat: any) => sum + cat.amount, 0)
    
    // 大分類銷售分析
    const sortedMajorCategories = Object.entries(majorCategoryStats)
      .map(([category, stats]: [string, any]) => ({
        category,
        count: stats.count,
        amount: stats.amount,
        uniqueProducts: stats.products.size,
        percentage: ((stats.amount / totalSalesAmount) * 100).toFixed(1)
      }))
      .sort((a, b) => b.amount - a.amount)
    
    summary += `🏆 大分類銷售排行：\n`
    sortedMajorCategories.forEach((cat, index) => {
      summary += `${index + 1}. ${cat.category}: NT$ ${cat.amount.toLocaleString()} (${cat.percentage}%, ${cat.count}筆, ${cat.uniqueProducts}種商品)\n`
    })
    summary += `\n`
    
    // 小分類銷售分析（前15名）
    const sortedMinorCategories = Object.entries(minorCategoryStats)
      .map(([category, stats]: [string, any]) => ({
        category,
        count: stats.count,
        amount: stats.amount,
        uniqueProducts: stats.products.size,
        percentage: ((stats.amount / totalSalesAmount) * 100).toFixed(1)
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 15)
    
    summary += `📋 小分類銷售排行 (前15名)：\n`
    sortedMinorCategories.forEach((cat, index) => {
      summary += `${index + 1}. ${cat.category}: NT$ ${cat.amount.toLocaleString()} (${cat.percentage}%, ${cat.count}筆)\n`
    })
    summary += `\n`
    
    // 月度分類分析
    const monthlyCategoryStats = salesData.reduce((acc, sale) => {
      const productName = sale['商品名稱'] || sale['品項名稱'] || ''
      const amount = sale['結帳金額'] || sale['金額'] || sale['價格'] || 0
      const month = sale['結帳時間_month'] || sale['時間_month'] || '未知月份'
      const categoryInfo = productCategoryMap[productName]
      
      if (categoryInfo && amount > 0) {
        const majorCat = categoryInfo.major
        if (!acc[month]) acc[month] = {}
        if (!acc[month][majorCat]) acc[month][majorCat] = { count: 0, amount: 0 }
        acc[month][majorCat].count += 1
        acc[month][majorCat].amount += amount
      }
      return acc
    }, {})
    
    summary += `📈 月度分類趨勢分析：\n`
    Object.keys(monthlyCategoryStats).sort().forEach(month => {
      const monthData = monthlyCategoryStats[month]
      const monthTotal = Object.values(monthData).reduce((sum: number, cat: any) => sum + cat.amount, 0)
      const topCategory = Object.entries(monthData)
        .sort(([,a]: [string, any], [,b]: [string, any]) => b.amount - a.amount)[0]
      
      if (topCategory) {
        summary += `- ${month}: 總額NT$ ${monthTotal.toLocaleString()}, 最佳分類: ${topCategory[0]} (NT$ ${(topCategory[1] as any).amount.toLocaleString()})\n`
      }
    })
    summary += `\n`
    
    // 數據匹配情況
    const matchRate = ((salesData.length - Array.from(unmatchedProducts).length) / salesData.length * 100).toFixed(1)
    summary += `🔍 數據匹配分析：\n`
    summary += `- 成功匹配分類：${matchRate}%\n`
    summary += `- 未匹配商品：${unmatchedProducts.size} 種\n`
    if (unmatchedProducts.size > 0) {
      const unmatchedList = Array.from(unmatchedProducts).slice(0, 5)
      summary += `- 部分未匹配商品：${unmatchedList.join(', ')}`
      if (unmatchedProducts.size > 5) {
        summary += ` 等${unmatchedProducts.size}種`
      }
      summary += `\n`
    }
    summary += `\n`
  }
  
  // 商品主檔分類結構
  if (unifiedCategoryData?.productMaster?.length > 0) {
    const products = unifiedCategoryData.productMaster
    const majorCategories = [...new Set(products.map(p => p['大分類'] || p['主分類'] || p.category))].filter(Boolean)
    const minorCategories = [...new Set(products.map(p => p['小分類'] || p['子分類'] || p.subcategory))].filter(Boolean)
    
    summary += `🗂️ 主檔分類結構：\n`
    summary += `- 大分類：${majorCategories.join(', ')}\n`
    summary += `- 小分類數量：${minorCategories.length} 種\n`
    summary += `- 商品總數：${products.length} 項\n\n`
  }
  
  // 可用欄位說明
  if (unifiedCategoryData?.summary?.availableFields) {
    const fields = unifiedCategoryData.summary.availableFields
    summary += `🏷️ 可用數據欄位：\n`
    summary += `- 銷售數據欄位：${fields.salesFields?.slice(0, 5).join(', ') || '無'}\n`
    summary += `- 主檔數據欄位：${fields.masterFields?.slice(0, 5).join(', ') || '無'}\n\n`
  }
  
  // 數據完整性檢查
  if (unifiedCategoryData?.summary?.dataCompleteness) {
    const completeness = unifiedCategoryData.summary.dataCompleteness
    summary += `✅ 數據完整性檢查：\n`
    summary += `- 銷售數據：${completeness.salesData}\n`
    summary += `- 商品主檔：${completeness.productMaster}\n\n`
  }
  
  // 總結
  summary += `💡 數據說明：\n`
  summary += `- 基於實際銷售交易數據進行分類分析\n`
  summary += `- 結合完整商品主檔的分類信息\n`
  summary += `- 支援大分類和小分類的詳細統計\n`
  summary += `- 提供月度分類趨勢分析\n`
  summary += `- 可進行任何分類相關的深入分析：類別表現比較、季節性分析、交叉分析等\n`
  summary += `- 所有統計都基於實際交易記錄，確保分類分析的準確性\n`
  
  return summary
}

// 格式化分類數據為AI可讀格式
function formatCategoryData(rankings: any, categoryDist: any[], productMaster: any[]): string {
  let summary = `🏷️ 商品分類分析數據\n\n`
  
  if (categoryDist?.length > 0) {
    summary += `📊 分類銷售佔比：\n`
    categoryDist.slice(0, 8).forEach((cat: any) => {
      summary += `- ${cat.category}: NT$ ${cat.amount?.toLocaleString()} (${cat.percentage}%)\n`
    })
    summary += `\n`
  }
  
  if (rankings?.totals) {
    summary += `📈 整體統計：\n`
    summary += `- 總銷量：${rankings.totals.totalQuantity?.toLocaleString()} 件\n`
    summary += `- 總銷額：NT$ ${rankings.totals.totalAmount?.toLocaleString()}\n`
    summary += `- 商品種類：${rankings.totals.totalProducts} 項\n\n`
  }
  
  if (productMaster?.length > 0) {
    const categories = [...new Set(productMaster.map(p => p.category))].filter(Boolean)
    const smallCategories = [...new Set(productMaster.map(p => p.small_category))].filter(Boolean)
    summary += `🗂️ 分類結構：\n`
    summary += `- 大分類：${categories.join(', ')}\n`
    summary += `- 小分類：${smallCategories.slice(0, 10).join(', ')}${smallCategories.length > 10 ? '...' : ''}\n`
  }
  
  return summary
}

// 格式化統一商品數據（新增）
function formatUnifiedProductData(unifiedData: any): string {
  let summary = `🏪 統一商品銷售分析數據 (完整欄位)\n\n`
  
  // 數據完整性報告
  if (unifiedData?.dataRange) {
    summary += `📊 數據覆蓋範圍：\n`
    summary += `- 商品銷售數據：${unifiedData.dataRange.productSalesData || '無資料'}\n`
    summary += `- 月度趨勢：${unifiedData.dataRange.monthlyTrends || '無資料'}\n`
    summary += `- 總覆蓋範圍：${unifiedData.dataRange.totalCoverage || '無資料'}\n\n`
  }
  
  // 整體商品銷售統計
  if (unifiedData?.productSalesSummary) {
    const s = unifiedData.productSalesSummary
    summary += `📊 整體商品銷售統計：\n`
    summary += `- 總商品記錄：${s.totalProducts?.toLocaleString()} 筆\n`
    summary += `- 總銷售金額：NT$ ${s.totalAmount?.toLocaleString()}\n`
    summary += `- 商品種類：${s.uniqueProducts?.toLocaleString()} 種\n`
    
    if (s.dateRange) {
      summary += `- 資料時間範圍：${s.dateRange.earliest} ~ ${s.dateRange.latest}\n`
    }
    
    if (s.filters) {
      summary += `- 篩選條件：月份=${s.filters.month || '全部'}, 限制=${s.filters.limit || '無限制'}\n`
    }
    summary += `\n`
  }

  // 商品熱銷排行（來自統一API）
  if (unifiedData?.productSalesSummary?.productRanking?.length > 0) {
    summary += `🏆 商品銷售排行TOP20（依營收排序）：\n`
    unifiedData.productSalesSummary.productRanking.forEach((product: any, index: number) => {
      summary += `${index + 1}. ${product.name}: NT$ ${product.amount.toLocaleString()} (銷售${product.count}筆)\n`
    })
    summary += `\n`
  }
  
  // 月份統計（來自統一API）
  if (unifiedData?.productSalesSummary?.monthStats) {
    const monthStats = unifiedData.productSalesSummary.monthStats
    summary += `📈 月度銷售分析：\n`
    Object.entries(monthStats)
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([month, stats]: [string, any]) => {
        summary += `- ${month}: ${stats.count}筆商品銷售, NT$ ${stats.amount.toLocaleString()}\n`
      })
    summary += `\n`
  }
  
  // 詳細商品銷售分析
  if (unifiedData?.productSalesData?.length > 0) {
    const products = unifiedData.productSalesData
    
    // 按商品統計
    const productStats = products.reduce((acc: any, product: any) => {
      const name = product['商品名稱'] || product['品項名稱'] || '未知商品'
      const amount = product['結帳金額'] || product['金額'] || product['價格'] || 0
      const month = product['結帳時間_month'] || product['時間_month'] || '未知月份'
      
      if (!acc[name]) {
        acc[name] = { count: 0, amount: 0, months: new Set() }
      }
      acc[name].count += 1
      acc[name].amount += amount
      acc[name].months.add(month)
      return acc
    }, {})
    
    const sortedProducts = Object.entries(productStats)
      .map(([name, stats]: [string, any]) => ({
        name,
        count: stats.count,
        amount: stats.amount,
        avgPrice: stats.amount / stats.count,
        activeMonths: stats.months.size
      }))
      .sort((a, b) => b.amount - a.amount)
    
    summary += `📊 詳細商品分析 (前15名)：\n`
    sortedProducts.slice(0, 15).forEach((product, index) => {
      summary += `${index + 1}. ${product.name}: NT$ ${product.amount.toLocaleString()} (${product.count}筆, 平均${Math.round(product.avgPrice)}元, ${product.activeMonths}個月有銷售)\n`
    })
    summary += `\n`
    
    // 時段分析
    const hourStats = products.reduce((acc: any, product: any) => {
      const hour = product['結帳時間_hour'] || product['時間_hour']
      if (hour !== undefined) {
        let period = '其他時段'
        if (hour >= 6 && hour < 11) period = '早餐時段(6-11)'
        else if (hour >= 11 && hour < 14) period = '午餐時段(11-14)'
        else if (hour >= 14 && hour < 17) period = '下午茶時段(14-17)'
        else if (hour >= 17 && hour < 21) period = '晚餐時段(17-21)'
        else if (hour >= 21 && hour < 24) period = '宵夜時段(21-24)'
        else if (hour >= 0 && hour < 6) period = '深夜時段(0-6)'
        
        acc[period] = (acc[period] || 0) + 1
      }
      return acc
    }, {})
    
    if (Object.keys(hourStats).length > 0) {
      summary += `⏰ 時段銷售分析：\n`
      Object.entries(hourStats).forEach(([period, count]) => {
        const percentage = ((count as number) / products.length * 100).toFixed(1)
        summary += `- ${period}: ${count}筆 (${percentage}%)\n`
      })
      summary += `\n`
    }
    
    // 星期分析
    const dayStats = products.reduce((acc: any, product: any) => {
      const day = product['結帳時間_day_name'] || product['時間_day_name']
      if (day) {
        acc[day] = (acc[day] || 0) + 1
      }
      return acc
    }, {})
    
    if (Object.keys(dayStats).length > 0) {
      summary += `📅 週別銷售分佈：\n`
      const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
      dayOrder.forEach(day => {
        if (dayStats[day]) {
          const percentage = (dayStats[day] / products.length * 100).toFixed(1)
          summary += `- ${day}: ${dayStats[day]}筆 (${percentage}%)\n`
        }
      })
      summary += `\n`
    }
  }
  
  // 月度趨勢補充分析
  if (unifiedData?.monthlyTrends?.length > 0) {
    const trends = unifiedData.monthlyTrends
    const latest = trends[0] // 數據按倒序排列，最新在前
    const earliest = trends[trends.length - 1]
    
    summary += `📈 月度趨勢補充分析 (共${trends.length}個月)：\n`
    summary += `- 最新月份：${latest.monthDisplay} - NT$ ${latest.amount?.toLocaleString()} (${latest.orderCount}筆訂單)\n`
    summary += `- 最早月份：${earliest.monthDisplay} - NT$ ${earliest.amount?.toLocaleString()} (${earliest.orderCount}筆訂單)\n`
    summary += `- 平均月銷額：NT$ ${Math.round(trends.reduce((sum, m) => sum + (m.amount || 0), 0) / trends.length).toLocaleString()}\n\n`
  }
  
  // 可用欄位說明
  if (unifiedData?.summary?.availableFields?.length > 0) {
    summary += `🏷️ 可用數據欄位：\n`
    summary += unifiedData.summary.availableFields.slice(0, 10).join(', ')
    if (unifiedData.summary.availableFields.length > 10) {
      summary += ` 等共${unifiedData.summary.availableFields.length}個欄位`
    }
    summary += `\n\n`
  }
  
  // 數據完整性檢查
  if (unifiedData?.summary?.dataCompleteness) {
    const completeness = unifiedData.summary.dataCompleteness
    summary += `✅ 數據完整性檢查：\n`
    summary += `- 商品銷售數據：${completeness.productSalesData}\n`
    summary += `- 月度趨勢數據：${completeness.monthlyTrends}\n\n`
  }
  
  // 總結
  summary += `💡 數據說明：\n`
  summary += `- 使用統一的商品銷售API，包含所有原始欄位\n`
  summary += `- 動態解析所有欄位，包括時間、金額、商品名稱等\n`
  summary += `- 支援月份篩選和數量限制\n`
  summary += `- 結合月度趨勢數據提供完整的時間範圍覆蓋\n`
  summary += `- 可進行任何商品的詳細分析：銷售歷史、價格趨勢、時段分析等\n`
  summary += `- 所有統計都基於實際交易記錄，確保數據準確性\n`
  
  return summary
}

// 格式化綜合數據（新增）
function formatComprehensiveData(comprehensiveData: any): string {
  let summary = `🏪 綜合商品分析數據 (完整時間範圍)\n\n`
  
  // 數據完整性報告
  if (comprehensiveData?.dataRange) {
    summary += `📊 數據覆蓋範圍：\n`
    summary += `- 月度趨勢：${comprehensiveData.dataRange.monthlyData || '無資料'}\n`
    summary += `- 完整銷售報表：${comprehensiveData.dataRange.fullSalesData || '無資料'}\n`
    summary += `- 綜合分析：${comprehensiveData.dataRange.comprehensiveData || '無資料'}\n`
    summary += `- 總覆蓋範圍：${comprehensiveData.dataRange.totalCoverage || '無資料'}\n\n`
  }
  
  // 檢查完整銷售數據的時間範圍
  if (comprehensiveData?.fullSalesSummary?.dateRange) {
    const dateRange = comprehensiveData.fullSalesSummary.dateRange
    summary += `⚠️ 注意：完整銷售明細數據範圍為 ${dateRange.earliest} 至 ${dateRange.latest}，\n`
    summary += `不包含2025年數據。2025年分析請主要參考月度趨勢和當前排名數據。\n\n`
  }

  // 完整銷售數據分析（僅限歷史數據）
  if (comprehensiveData?.fullSalesData?.length > 0) {
    const fullSales = comprehensiveData.fullSalesData
    
    // 按商品統計所有銷售數據
    const productStats = fullSales.reduce((acc, sale) => {
      const productName = sale.product_name || '未知商品'
      if (!acc[productName]) {
        acc[productName] = { count: 0, amount: 0, dates: new Set() }
      }
      acc[productName].count += 1
      acc[productName].amount += sale.invoice_amount || 0
      if (sale.checkout_time) {
        const date = new Date(sale.checkout_time).toISOString().split('T')[0]
        acc[productName].dates.add(date)
      }
      return acc
    }, {})
    
    const allProducts = Object.entries(productStats)
      .map(([name, stats]: [string, any]) => ({
        name,
        count: stats.count,
        amount: stats.amount,
        avgPrice: stats.amount / stats.count,
        activeDays: stats.dates.size
      }))
      .sort((a, b) => b.amount - a.amount)
    
    summary += `📊 完整商品銷售分析 (所有${allProducts.length}項商品)：\n`
    summary += `前15名商品營收排名：\n`
    allProducts.slice(0, 15).forEach((product, index) => {
      summary += `${index + 1}. ${product.name}: NT$ ${product.amount.toLocaleString()} (${product.count}次, 平均${Math.round(product.avgPrice)}元, ${product.activeDays}天有銷售)\n`
    })
    summary += `\n`
    
    // 月度銷售分析
    const monthlyProductStats = fullSales.reduce((acc, sale) => {
      if (!sale.checkout_time) return acc
      const date = new Date(sale.checkout_time)
      const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      const productName = sale.product_name || '未知商品'
      
      if (!acc[month]) acc[month] = {}
      if (!acc[month][productName]) acc[month][productName] = { count: 0, amount: 0 }
      
      acc[month][productName].count += 1
      acc[month][productName].amount += sale.invoice_amount || 0
      return acc
    }, {})
    
    summary += `📈 月度商品趨勢分析：\n`
    Object.keys(monthlyProductStats).sort().forEach(month => {
      const monthData = monthlyProductStats[month]
      const monthTotal = Object.values(monthData).reduce((sum: number, prod: any) => sum + prod.amount, 0)
      const topProduct = Object.entries(monthData)
        .sort(([,a]: [string, any], [,b]: [string, any]) => b.amount - a.amount)[0]
      
      if (topProduct) {
        summary += `- ${month}: 總額NT$ ${monthTotal.toLocaleString()}, 最佳商品: ${topProduct[0]} (NT$ ${(topProduct[1] as any).amount.toLocaleString()})\n`
      }
    })
    summary += `\n`
  }
  
  // 月度銷售趨勢
  if (comprehensiveData?.monthlyTrends?.length > 0) {
    const trends = comprehensiveData.monthlyTrends
    const latest = trends[0] // 數據按倒序排列，最新在前
    const earliest = trends[trends.length - 1]
    
    summary += `📈 月度銷售趨勢 (共${trends.length}個月)：\n`
    summary += `- 最新月份：${latest.monthDisplay} - NT$ ${latest.amount?.toLocaleString()} (${latest.orderCount}筆訂單)\n`
    summary += `- 最早月份：${earliest.monthDisplay} - NT$ ${earliest.amount?.toLocaleString()} (${earliest.orderCount}筆訂單)\n`
    summary += `- 平均月銷額：NT$ ${Math.round(trends.reduce((sum, m) => sum + (m.amount || 0), 0) / trends.length).toLocaleString()}\n`
    summary += `- 平均訂單價值：NT$ ${Math.round(trends.reduce((sum, m) => sum + (m.avgOrderValue || 0), 0) / trends.length).toLocaleString()}\n\n`
  }
  
  // 當前月份商品排名數據（最新月份：通常是2025-09）
  if (comprehensiveData?.productRankings) {
    const rankings = comprehensiveData.productRankings
    
    if (rankings.amountRanking?.length > 0) {
      summary += `💰 當前月份商品營收排名 (前10名) - 2025年9月：\n`
      rankings.amountRanking.slice(0, 10).forEach((item, index) => {
        const avgUnitPrice = item.amount / item.quantity
        summary += `${index + 1}. ${item.name}: NT$ ${item.amount?.toLocaleString()} (${item.quantity}件, 平均單價: NT$ ${Math.round(avgUnitPrice)})\n`
      })
      summary += `\n`
    }
    
    if (rankings.quantityRanking?.length > 0) {
      summary += `🏆 當前月份商品銷量排名 (前5名) - 2025年9月：\n`
      rankings.quantityRanking.slice(0, 5).forEach((item, index) => {
        const avgUnitPrice = item.amount / item.quantity
        summary += `${index + 1}. ${item.name}: ${item.quantity}件 (NT$ ${item.amount?.toLocaleString()}, 平均單價: NT$ ${Math.round(avgUnitPrice)})\n`
      })
      summary += `\n`
    }
    
    if (rankings.totals) {
      summary += `📊 當前月份統計總計 (2025年9月)：\n`
      summary += `- 總銷量：${rankings.totals.totalQuantity?.toLocaleString()} 件\n`
      summary += `- 總銷額：NT$ ${rankings.totals.totalAmount?.toLocaleString()}\n`
      summary += `- 商品種類：${rankings.totals.totalProducts} 項\n\n`
    }
  }
  
  // 類別分布
  if (comprehensiveData?.categoryDistribution?.length > 0) {
    summary += `🏷️ 商品分類表現：\n`
    comprehensiveData.categoryDistribution.slice(0, 6).forEach(cat => {
      summary += `- ${cat.category}: NT$ ${cat.amount?.toLocaleString()} (${cat.percentage}%)\n`
    })
    summary += `\n`
  }
  
  // 數據完整性警告
  if (comprehensiveData?.summary?.dataCompleteness) {
    const completeness = comprehensiveData.summary.dataCompleteness
    summary += `✅ 數據完整性檢查：\n`
    summary += `- 月度趨勢：${completeness.monthlyTrends}\n`
    summary += `- 商品排名：${completeness.productRankings}\n`
    summary += `- 類別數據：${completeness.categoryData}\n`
    summary += `- 詳細交易：${completeness.detailTransactions}\n\n`
  }
  
  // 總結
  summary += `💡 數據說明：\n`
  summary += `- 月度趨勢：2023-12至2025-09完整數據（共22個月）\n`
  summary += `- 完整商品銷售報表：所有商品的每筆交易詳細記錄，包含商品名稱、金額、結帳時間\n`
  summary += `- 商品排名：最新月份的前20名商品詳細數據，包含銷量、銷額、平均單價和分類\n`
  summary += `- 綜合分析：整體銷售統計、趨勢分析、異常檢測\n`
  summary += `- 可進行任何層面的商品分析：個別商品月度趨勢、銷售統計、價格分析、分類比較等\n`
  
  return summary
}

// 格式化統一訂單數據（新增）
function formatUnifiedOrderData(unifiedOrderData: any): string {
  let summary = `🛒 統一訂單銷售分析數據 (完整欄位)\n\n`
  
  // 數據完整性報告
  if (unifiedOrderData?.dataRange) {
    summary += `📊 數據覆蓋範圍：\n`
    summary += `- 訂單銷售數據：${unifiedOrderData.dataRange.orderSalesData || '無資料'}\n`
    summary += `- 月度趨勢：${unifiedOrderData.dataRange.monthlyTrends || '無資料'}\n`
    summary += `- 總覆蓋範圍：${unifiedOrderData.dataRange.totalCoverage || '無資料'}\n\n`
  }
  
  // 整體訂單銷售統計
  if (unifiedOrderData?.orderSalesSummary) {
    const s = unifiedOrderData.orderSalesSummary
    summary += `📊 整體訂單銷售統計：\n`
    summary += `- 總訂單數：${s.totalOrders?.toLocaleString()} 筆\n`
    summary += `- 總銷售金額：NT$ ${s.totalAmount?.toLocaleString()}\n`
    summary += `- 平均訂單價值：NT$ ${s.averageOrderValue?.toLocaleString()}\n`
    summary += `- 總折扣金額：NT$ ${s.totalDiscount?.toLocaleString()}\n`
    
    if (s.dateRange) {
      summary += `- 資料時間範圍：${s.dateRange.earliest} ~ ${s.dateRange.latest}\n`
    }
    
    if (s.filters) {
      summary += `- 篩選條件：月份=${s.filters.month || '全部'}, 限制=${s.filters.limit || '無限制'}\n`
    }
    summary += `\n`
  }

  // 訂單來源分析（來自統一API）
  if (unifiedOrderData?.orderSalesSummary?.orderSourceStats) {
    summary += `🏪 訂單來源分析：\n`
    Object.entries(unifiedOrderData.orderSalesSummary.orderSourceStats)
      .sort(([,a]: [string, any], [,b]: [string, any]) => b.amount - a.amount)
      .forEach(([source, stats]: [string, any]) => {
        const percentage = (stats.count / unifiedOrderData.orderSalesSummary.totalOrders * 100).toFixed(1)
        summary += `- ${source}: ${stats.count}筆 (${percentage}%), NT$ ${stats.amount.toLocaleString()}\n`
      })
    summary += `\n`
  }
  
  // 訂單種類分析（來自統一API）
  if (unifiedOrderData?.orderSalesSummary?.orderTypeStats) {
    summary += `📋 訂單種類分析：\n`
    Object.entries(unifiedOrderData.orderSalesSummary.orderTypeStats)
      .sort(([,a]: [string, any], [,b]: [string, any]) => b.amount - a.amount)
      .forEach(([type, stats]: [string, any]) => {
        const percentage = (stats.count / unifiedOrderData.orderSalesSummary.totalOrders * 100).toFixed(1)
        summary += `- ${type}: ${stats.count}筆 (${percentage}%), NT$ ${stats.amount.toLocaleString()}\n`
      })
    summary += `\n`
  }
  
  // 時段分析（來自統一API）
  if (unifiedOrderData?.orderSalesSummary?.timePeriodStats) {
    summary += `⏰ 時段銷售分析：\n`
    const timeOrder = ['早餐時段(6-11)', '午餐時段(11-14)', '下午茶時段(14-17)', '晚餐時段(17-21)', '宵夜時段(21-24)', '深夜時段(0-6)', '其他時段']
    timeOrder.forEach(period => {
      const stats = unifiedOrderData.orderSalesSummary.timePeriodStats[period]
      if (stats) {
        const percentage = (stats.count / unifiedOrderData.orderSalesSummary.totalOrders * 100).toFixed(1)
        summary += `- ${period}: ${stats.count}筆 (${percentage}%), NT$ ${stats.amount.toLocaleString()}\n`
      }
    })
    summary += `\n`
  }
  
  // 星期分析（來自統一API）
  if (unifiedOrderData?.orderSalesSummary?.dayStats) {
    summary += `📅 週別銷售分佈：\n`
    const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    dayOrder.forEach(day => {
      const stats = unifiedOrderData.orderSalesSummary.dayStats[day]
      if (stats) {
        const percentage = (stats.count / unifiedOrderData.orderSalesSummary.totalOrders * 100).toFixed(1)
        summary += `- ${day}: ${stats.count}筆 (${percentage}%), NT$ ${stats.amount.toLocaleString()}\n`
      }
    })
    summary += `\n`
  }
  
  // 桌號分析（僅內用訂單）
  if (unifiedOrderData?.orderSalesSummary?.tableStats) {
    const tableEntries = Object.entries(unifiedOrderData.orderSalesSummary.tableStats)
      .sort(([,a]: [string, any], [,b]: [string, any]) => b.amount - a.amount)
    
    if (tableEntries.length > 0) {
      summary += `🪑 桌號銷售分析 (內用訂單)：\n`
      tableEntries.slice(0, 10).forEach(([table, stats]: [string, any]) => {
        summary += `- ${table}: ${stats.count}筆, NT$ ${stats.amount.toLocaleString()}\n`
      })
      if (tableEntries.length > 10) {
        summary += `- 及其他${tableEntries.length - 10}個桌號...\n`
      }
      summary += `\n`
    }
  }
  
  // 詳細訂單分析
  if (unifiedOrderData?.orderSalesData?.length > 0) {
    const orders = unifiedOrderData.orderSalesData
    
    // 月度訂單分析
    const monthlyOrderStats = orders.reduce((acc: any, order: any) => {
      const month = order['結帳時間_month'] || order['時間_month'] || '未知月份'
      const amount = order['結帳金額'] || order['金額'] || order['Amount'] || 0
      
      if (!acc[month]) {
        acc[month] = { count: 0, amount: 0 }
      }
      acc[month].count += 1
      acc[month].amount += amount
      return acc
    }, {})
    
    summary += `📈 月度訂單趨勢分析：\n`
    Object.entries(monthlyOrderStats)
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([month, stats]: [string, any]) => {
        const avgOrderValue = stats.amount / stats.count
        summary += `- ${month}: ${stats.count}筆訂單, NT$ ${stats.amount.toLocaleString()}, 平均訂單價值: NT$ ${Math.round(avgOrderValue)}\n`
      })
    summary += `\n`
  }
  
  // 月度趨勢補充分析
  if (unifiedOrderData?.monthlyTrends?.length > 0) {
    const trends = unifiedOrderData.monthlyTrends
    const latest = trends[0] // 數據按倒序排列，最新在前
    const earliest = trends[trends.length - 1]
    
    summary += `📈 月度趨勢補充分析 (共${trends.length}個月)：\n`
    summary += `- 最新月份：${latest.monthDisplay} - ${latest.orderCount}筆訂單, NT$ ${latest.amount?.toLocaleString()}, 平均訂單價值NT$ ${Math.round(latest.avgOrderValue)}\n`
    summary += `- 最早月份：${earliest.monthDisplay} - ${earliest.orderCount}筆訂單, NT$ ${earliest.amount?.toLocaleString()}, 平均訂單價值NT$ ${Math.round(earliest.avgOrderValue)}\n`
    summary += `- 平均月訂單數：${Math.round(trends.reduce((sum, m) => sum + (m.orderCount || 0), 0) / trends.length)}筆\n`
    summary += `- 平均月銷額：NT$ ${Math.round(trends.reduce((sum, m) => sum + (m.amount || 0), 0) / trends.length).toLocaleString()}\n\n`
  }
  
  // 可用欄位說明
  if (unifiedOrderData?.summary?.availableFields?.length > 0) {
    summary += `🏷️ 可用數據欄位：\n`
    summary += unifiedOrderData.summary.availableFields.slice(0, 10).join(', ')
    if (unifiedOrderData.summary.availableFields.length > 10) {
      summary += ` 等共${unifiedOrderData.summary.availableFields.length}個欄位`
    }
    summary += `\n\n`
  }
  
  // 數據完整性檢查
  if (unifiedOrderData?.summary?.dataCompleteness) {
    const completeness = unifiedOrderData.summary.dataCompleteness
    summary += `✅ 數據完整性檢查：\n`
    summary += `- 訂單銷售數據：${completeness.orderSalesData}\n`
    summary += `- 月度趨勢數據：${completeness.monthlyTrends}\n\n`
  }
  
  // 總結
  summary += `💡 數據說明：\n`
  summary += `- 使用統一的訂單銷售API，包含所有原始欄位\n`
  summary += `- 動態解析所有欄位，包括時間、金額、訂單來源、種類等\n`
  summary += `- 支援月份篩選和數量限制\n`
  summary += `- 結合月度趨勢數據提供完整的時間範圍覆蓋\n`
  summary += `- 可進行任何訂單的詳細分析：時段分析、客戶行為、桌號表現、來源分析等\n`
  summary += `- 所有統計都基於實際訂單記錄，確保數據準確性\n`
  
  return summary
}

// 格式化月度訂單數據（簡化版）
function formatOrderMonthlyData(monthlyTrends: any[], summaryData: any): string {
  let summary = `🛒 月度訂單分析數據 (統一數據源)\n\n`
  
  if (summaryData?.dataRange) {
    summary += `📊 數據覆蓋範圍：${summaryData.dataRange}\n\n`
  }
  
  // 月度訂單趨勢
  if (monthlyTrends?.length > 0) {
    const trends = monthlyTrends
    const latest = trends[0] // 數據按倒序排列，最新在前
    const earliest = trends[trends.length - 1]
    
    summary += `📈 月度訂單趨勢 (共${trends.length}個月)：\n`
    summary += `- 最新月份：${latest.monthDisplay} - ${latest.orderCount}筆訂單，總額NT$ ${latest.amount?.toLocaleString()}，平均訂單價值NT$ ${Math.round(latest.avgOrderValue)}\n`
    summary += `- 最早月份：${earliest.monthDisplay} - ${earliest.orderCount}筆訂單，總額NT$ ${earliest.amount?.toLocaleString()}，平均訂單價值NT$ ${Math.round(earliest.avgOrderValue)}\n`
    
    const totalOrders = summaryData.totalRecords || 0
    const totalRevenue = summaryData.totalAmount || 0
    const avgOrdersPerMonth = Math.round(totalOrders / trends.length)
    const avgRevenuePerMonth = Math.round(totalRevenue / trends.length)
    
    summary += `- 總訂單數：${totalOrders.toLocaleString()}筆\n`
    summary += `- 總營收：NT$ ${totalRevenue.toLocaleString()}\n`
    summary += `- 月平均訂單數：${avgOrdersPerMonth}筆\n`
    summary += `- 月平均營收：NT$ ${avgRevenuePerMonth.toLocaleString()}\n`
    summary += `- 整體平均訂單價值：NT$ ${Math.round(totalRevenue / totalOrders).toLocaleString()}\n\n`
    
    // 2025年9月特別標註
    const september2025 = trends.find(m => m.month === '2025-09')
    if (september2025) {
      summary += `🎯 2025年9月訂單重點分析：\n`
      summary += `- 訂單數：${september2025.orderCount}筆\n`
      summary += `- 總營收：NT$ ${september2025.amount?.toLocaleString()}\n`
      summary += `- 平均訂單價值：NT$ ${Math.round(september2025.avgOrderValue)}\n`
      summary += `- 商品品項數：${september2025.productItemCount}項\n\n`
    }
    
    // 顯示最近6個月的詳細數據
    summary += `📊 最近6個月詳細數據：\n`
    trends.slice(0, 6).forEach(month => {
      summary += `- ${month.monthDisplay}: ${month.orderCount}筆訂單, NT$ ${month.amount?.toLocaleString()}, 平均NT$ ${Math.round(month.avgOrderValue)}\n`
    })
    summary += `\n`
  }
  
  // 總結
  summary += `💡 數據說明：\n`
  summary += `- 使用統一的月度銷售數據源，確保數據一致性\n`
  summary += `- 涵蓋2023-12至2025-09完整時間範圍（共22個月）\n`
  summary += `- 可回答任何月份的訂單數量、總金額、平均訂單價值等問題\n`
  summary += `- 支援時段分析（需結合月份和具體時間查詢）\n`
  
  return summary
}

// 取得分類資訊
function getCategoryInfo(category: string) {
  switch (category) {
    case 'product':
      return {
        name: '商品相關分析',
        description: '基於商品銷售排名與商品主檔，分析個別商品的銷售表現、銷量趨勢、營收貢獻等',
        dataSource: '商品銷售排名 + 商品主檔'
      }
    case 'order':
      return {
        name: '訂單相關分析', 
        description: '基於月銷售統計、支付方式、訂單類型數據，分析訂單趨勢、客戶行為等',
        dataSource: '月銷售統計 + 支付資料 + 訂單類型'
      }
    case 'category':
      return {
        name: '分類相關分析',
        description: '結合商品排名、分類分佈與商品主檔，進行商品分類分析、類別表現比較等',
        dataSource: '分類分佈 + 商品排名 + 商品主檔'
      }
    default:
      return {
        name: '一般分析',
        description: '綜合數據分析',
        dataSource: '未指定'
      }
  }
}

// 高級數據分析功能
function performAdvancedAnalysis(data: any, category: string) {
  const analysis = {
    trends: [],
    anomalies: [],
    insights: [],
    recommendations: []
  }

  try {
    if (category === 'product' && data.salesData) {
      // 商品趨勢分析
      const products = data.salesData.slice(0, 1000) // 分析前1000筆
      const productStats = {}
      
      products.forEach(item => {
        const name = item.product_name
        const month = item.month
        if (!productStats[name]) productStats[name] = {}
        if (!productStats[name][month]) productStats[name][month] = { count: 0, amount: 0 }
        productStats[name][month].count++
        productStats[name][month].amount += item.invoice_amount || 0
      })

      // 檢測異常波動
      Object.entries(productStats).forEach(([product, monthlyData]) => {
        const amounts = Object.values(monthlyData).map(d => d.amount)
        if (amounts.length > 1) {
          const mean = amounts.reduce((a, b) => a + b, 0) / amounts.length
          const variance = amounts.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / amounts.length
          const stdDev = Math.sqrt(variance)
          
          amounts.forEach((amount, idx) => {
            if (Math.abs(amount - mean) > stdDev * 2) {
              analysis.anomalies.push(`${product}在某月出現異常銷售（${amount > mean ? '暴增' : '急跌'}${Math.round(amount)}元）`)
            }
          })
        }
      })

      // 趨勢檢測
      analysis.trends.push('基於最新數據的月度銷售趨勢分析')
      analysis.insights.push('發現潛在的季節性銷售模式')
      analysis.recommendations.push('建議針對高波動商品制定穩定化策略')
    }

    if (category === 'order' && data.ordersData) {
      // 訂單趨勢分析
      const orders = data.ordersData.slice(0, 1000)
      const timeStats = {}
      
      orders.forEach(order => {
        const timePeriod = order.time_period
        const amount = order.invoice_amount || 0
        if (!timeStats[timePeriod]) timeStats[timePeriod] = { count: 0, total: 0 }
        timeStats[timePeriod].count++
        timeStats[timePeriod].total += amount
      })

      // 分析時段表現
      const timePerformance = Object.entries(timeStats)
        .map(([period, stats]) => ({
          period,
          avgOrder: stats.total / stats.count,
          count: stats.count
        }))
        .sort((a, b) => b.avgOrder - a.avgOrder)

      if (timePerformance.length > 0) {
        analysis.insights.push(`最高價值時段：${timePerformance[0].period}（平均訂單：${Math.round(timePerformance[0].avgOrder)}元）`)
        analysis.recommendations.push(`建議在${timePerformance[0].period}增加人力配置和菜品供應`)
      }
    }

  } catch (error) {
    console.warn('高級分析處理錯誤:', error)
    analysis.insights.push('正在進行深度數據挖掘...')
  }

  return analysis
}

// 生成回答
async function generateResponse(question: string, history: ChatMessage[], data: any, category: string, modelType: string = 'groq') {
  const selectedModel = AI_MODELS[modelType] || AI_MODELS.gemini

  const categoryInfo = getCategoryInfo(category)
  
  // 執行高級分析
  const advancedAnalysis = performAdvancedAnalysis(data, category)
  
  // 準備數據摘要
  let dataContext = `\n**數據來源：${data.dataSource || '無資料'}**\n`
  
  // 整合高級分析結果
  if (advancedAnalysis.trends.length > 0) {
    dataContext += `\n**🔍 自動趨勢檢測：**\n${advancedAnalysis.trends.join('\n- ')}\n`
  }
  
  if (advancedAnalysis.anomalies.length > 0) {
    dataContext += `\n**⚠️ 異常值檢測：**\n- ${advancedAnalysis.anomalies.join('\n- ')}\n`
  }
  
  if (advancedAnalysis.insights.length > 0) {
    dataContext += `\n**💡 自動洞察：**\n- ${advancedAnalysis.insights.join('\n- ')}\n`
  }
  
  if (advancedAnalysis.recommendations.length > 0) {
    dataContext += `\n**🎯 AI建議：**\n- ${advancedAnalysis.recommendations.join('\n- ')}\n`
  }
  
  if (data.error) {
    dataContext += `⚠️ 資料獲取錯誤：${data.error}\n\n請聯繫系統管理員檢查API連接狀況。\n`
  } else {
    // 使用AI摘要格式的數據
    if (data.aiSummary) {
      dataContext += `\n📊 餐廳數據摘要：\n${data.aiSummary}\n`
    }
  }

  const conversationContext = history.length > 0
    ? `\n💬 對話歷史：${history.slice(-3).map(h => `${h.role}: ${h.content}`).join('\n')}`
    : ''

  const enhancedSystemPrompt = `
${SYSTEM_PROMPT}

**重要說明：**
- 數據來源：您現在擁有餐廳的最新銷售數據
- 分析範圍：${categoryInfo.description}
- 資料來源：${categoryInfo.dataSource}

**數據處理指引：**
1. 請基於提供的真實餐廳銷售數據進行分析
2. 如果數據中沒有用戶詢問的特定項目，請明確指出並建議類似項目
3. 提供具體的數值和趨勢分析，特別是月度變化
4. 對於商品問題，您現在使用統一的商品銷售API，包括：
   - 完整商品銷售報表（productSalesData）：包含所有欄位的實際交易記錄
   - 商品銷售統計摘要（productSalesSummary）：包含總計、排名、月份統計等
   - 月度銷售趨勢數據（monthlyTrends）：2023-12至2025-09的補充數據
5. 對於訂單問題，您現在使用統一的訂單銷售API，包括：
   - 完整訂單銷售報表（orderSalesData）：包含所有欄位的實際訂單記錄
   - 訂單銷售統計摘要（orderSalesSummary）：包含總計、來源分析、時段統計等
   - 月度銷售趨勢數據（monthlyTrends）：2023-12至2025-09的補充數據
6. **統一數據結構**：所有數據現在來自單一API源，確保一致性：
   商品數據：
   - productSalesData：每筆交易的完整記錄，包含商品名稱、結帳金額、結帳時間等所有原始欄位
   - productSalesSummary.productRanking：商品銷售排行榜（依營收排序）
   - productSalesSummary.monthStats：按月份的銷售統計
   
   訂單數據：
   - orderSalesData：每筆訂單的完整記錄，包含發票號碼、結帳時間、訂單來源、種類、桌號等所有原始欄位
   - orderSalesSummary.orderSourceStats：訂單來源統計
   - orderSalesSummary.orderTypeStats：訂單種類統計
   - orderSalesSummary.timePeriodStats：時段統計
   - orderSalesSummary.dayStats：星期統計
   - orderSalesSummary.tableStats：桌號統計（內用訂單）
7. **重要**：使用統一API的好處：
   - 所有查詢都使用相同的數據源，避免數據不一致
   - 包含所有原始欄位，支援任何類型的分析
   - 自動解析時間欄位（年、月、日、小時、星期、時段等）
   - 支援月份篩選和數據限制參數
8. 當用戶詢問特定商品/訂單時：
   - 直接從相應的SalesData中搜尋所有相關記錄
   - 使用統計摘要提供排名和趨勢分析
   - 結合monthlyTrends提供完整的時間範圍覆蓋
9. 您可以進行詳細分析：
   商品：銷售歷史、價格趨勢、時段分析、月度變化等
   訂單：來源分析、種類分佈、時段表現、桌號效率、客戶行為等
10. 請提供表格格式的數據（如果相關）
11. 對於分類問題，您現在使用基於實際交易的分類分析，包括：
   - 完整商品銷售報表（salesData）：所有實際交易記錄
   - 完整商品主檔（productMaster）：所有商品的分類信息
   - 透過商品名稱匹配，將實際銷售數據與分類信息結合
   - 提供大分類和小分類的詳細統計分析
   - 基於實際交易計算分類表現，而非預先計算的報表
12. 如果遇到數據獲取錯誤，請向用戶說明並建議聯繫系統管理員
13. **重要**：統一API確保所有分析都基於相同的數據源，消除了之前多數據源混用造成的數據不一致問題

**回答格式要求：**
- 使用清楚的標題和段落結構
- 重要數據用**粗體**標示
- 提供具體建議和洞察
- 保持專業友善的語氣
`

  const prompt = `
${enhancedSystemPrompt}

**問題分類：${categoryInfo.name}**
**數據來源：${categoryInfo.dataSource}**
${dataContext}${conversationContext}

**用戶問題：**
${question}

請根據上述餐廳銷售數據進行詳細分析並回答。
`

  try {
    let response: string = ''
    
    switch (selectedModel.provider) {
      case 'google': {
        const model = genAI.getGenerativeModel({ 
          model: selectedModel.model,
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.9,
            maxOutputTokens: 2048,
          }
        })
        const result = await model.generateContent(prompt)
        const geminiResponse = await result.response
        response = geminiResponse.text()
        break
      }
      
      case 'openai': {
        const result = await openai.chat.completions.create({
          model: selectedModel.model,
          messages: [
            { role: 'system', content: enhancedSystemPrompt },
            { role: 'user', content: `${dataContext}${conversationContext}\n\n**用戶問題：**\n${question}\n\n請根據上述餐廳銷售數據進行詳細分析並回答。` }
          ],
          temperature: 0.7,
          max_tokens: 2048
        })
        response = result.choices[0]?.message?.content || '無法生成回答'
        break
      }
      
      case 'groq': {
        // Groq API call (same format as OpenAI)
        const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: selectedModel.model,
            messages: [
              { role: 'system', content: enhancedSystemPrompt },
              { role: 'user', content: `${dataContext}${conversationContext}\n\n**用戶問題：**\n${question}\n\n請根據上述餐廳銷售數據進行詳細分析並回答。` }
            ],
            temperature: 0.7,
            max_tokens: 2048
          })
        })
        
        if (!groqResponse.ok) {
          throw new Error(`Groq API error: ${groqResponse.status}`)
        }
        
        const groqResult = await groqResponse.json()
        response = groqResult.choices[0]?.message?.content || '無法生成回答'
        break
      }
      
      default:
        throw new Error(`不支援的模型提供商: ${selectedModel.provider}`)
    }
    
    return response
    
  } catch (error) {
    console.error('Response generation error:', error)
    
    // 如果當前模型失敗，嘗試使用 Gemini 作為備用
    if (selectedModel.provider !== 'google') {
      try {
        console.log('嘗試使用 Gemini 作為備用模型...')
        const backupModel = genAI.getGenerativeModel({ 
          model: 'gemini-1.5-flash',
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.9,
            maxOutputTokens: 2048,
          }
        })
        const result = await backupModel.generateContent(prompt)
        const backupResponse = await result.response
        return `*[使用備用模型 Gemini]*\n\n${backupResponse.text()}`
      } catch (backupError) {
        console.error('備用模型也失敗:', backupError)
      }
    }
    
    return `抱歉，${selectedModel.name} 處理您的問題時發生錯誤。請嘗試重新表述您的問題，或選擇其他AI模型後再試。\n\n錯誤信息: ${error instanceof Error ? error.message : '未知錯誤'}`
  }
}

// 新增 GET 方法來取得支援的模型列表
export async function GET() {
  return NextResponse.json({
    success: true,
    models: Object.entries(AI_MODELS).map(([key, model]) => ({
      id: key,
      name: model.name,
      provider: model.provider
    }))
  })
}