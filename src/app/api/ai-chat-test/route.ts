import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextRequest, NextResponse } from 'next/server'

// 初始化 Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || '')

// 系統提示詞（針對測試數據優化）
const SYSTEM_PROMPT = `
你是一個專業的餐廳數據分析助手，專門幫助分析餐廳的銷售數據。

你現在可以存取來自Google Sheets的以下測試數據來源：
1. 商品銷售列表 - 包含每個商品的銷售數量、金額、時間、分類等
2. 訂單銷售列表 - 包含每筆訂單的時間、金額、支付方式、訂單類型等  
3. 商品主檔 - 包含商品分類、名稱對應關係、成本等

當用戶提出問題時，你需要：
1. 理解問題的核心需求
2. 根據提供的測試數據進行分析
3. 提供基於數據的分析結果和見解
4. 如果數據中沒有用戶詢問的特定項目，請明確說明並建議相似項目

請用繁體中文回答，語氣要友善專業。

**重要提醒：** 
- 請明確告知用戶這是基於測試數據的分析結果
- 實際使用時需要設置正確的Google Sheets API認證
- 如果問題超出現有測試數據範圍，請誠實說明並建議如何獲取相關數據
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
    const { message, conversationHistory = [], category }: ChatRequest = await request.json()

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

    // 獲取測試數據
    const testData = await fetchTestData(category)
    
    // 生成回答
    const response = await generateTestResponse(message, conversationHistory, testData, category)

    return NextResponse.json({
      success: true,
      response: response,
      category: category,
      timestamp: new Date().toISOString(),
      note: '⚠️ 這是基於測試數據的分析結果。實際使用時需要正確的Google Sheets API設置。'
    })

  } catch (error) {
    console.error('AI Chat Test API Error:', error)
    return NextResponse.json(
      { error: '抱歉，處理您的問題時發生錯誤，請稍後再試' },
      { status: 500 }
    )
  }
}

// 獲取測試數據
async function fetchTestData(category: string) {
  const baseUrl = process.env.NODE_ENV === 'development' 
    ? 'http://localhost:3001' 
    : process.env.VERCEL_URL 
    ? `https://${process.env.VERCEL_URL}` 
    : 'http://localhost:3001'
  
  try {
    const response = await fetch(`${baseUrl}/api/sheets/test-data?category=${category}&format=ai-summary`)
    
    if (response.ok) {
      const data = await response.json()
      return data
    } else {
      throw new Error('無法獲取測試數據')
    }
  } catch (error) {
    console.error('Error fetching test data:', error)
    return {
      error: `測試數據獲取失敗: ${error.message}`,
      dataSource: '測試數據（獲取失敗）'
    }
  }
}

// 取得分類資訊
function getCategoryInfo(category: string) {
  switch (category) {
    case 'product':
      return {
        name: '商品相關分析',
        description: '基於Google Sheets「商品銷售報表」測試數據，分析個別商品的銷售表現、銷量趨勢、營收貢獻等',
        sheetSource: '商品銷售報表（測試數據）'
      }
    case 'order':
      return {
        name: '訂單相關分析', 
        description: '基於Google Sheets「訂單銷售列表」測試數據，分析訂單趨勢、支付方式、時段分佈、客戶行為等',
        sheetSource: '訂單銷售列表（測試數據）'
      }
    case 'category':
      return {
        name: '分類相關分析',
        description: '結合Google Sheets「商品銷售報表」與「商品主檔」測試數據，進行商品分類分析、類別表現比較等',
        sheetSource: '商品銷售報表 + 商品主檔（測試數據）'
      }
    default:
      return {
        name: '一般分析',
        description: '綜合數據分析',
        sheetSource: '未指定'
      }
  }
}

// 生成測試回答
async function generateTestResponse(question: string, history: ChatMessage[], data: any, category: string) {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

  const categoryInfo = getCategoryInfo(category)
  
  // 準備測試數據摘要
  let dataContext = `\n**數據來源：${data.dataSource || '測試數據'}**\n`
  
  if (data.error) {
    dataContext += `⚠️ 資料獲取錯誤：${data.error}\n`
  } else {
    // 使用AI摘要格式的數據
    if (data.aiSummary) {
      dataContext += `\n📊 Google Sheets 測試數據摘要：\n${data.aiSummary}\n`
    }
    
    // 如果有組合摘要（分類分析）
    if (data.combinedSummary) {
      dataContext += `\n🔗 整合統計摘要（測試數據）：\n`
      dataContext += `- 商品總數：${data.combinedSummary.totalProducts} 項\n`
      dataContext += `- 銷售記錄總數：${data.combinedSummary.totalSalesRecords} 筆\n`
      dataContext += `- 可用分類：${data.combinedSummary.availableCategories.join(', ')}\n`
    }
  }

  const conversationContext = history.length > 0
    ? `\n💬 對話歷史：${history.slice(-3).map(h => `${h.role}: ${h.content}`).join('\n')}`
    : ''

  const prompt = `
${SYSTEM_PROMPT}

**問題分類：${categoryInfo.name}**
**Google Sheets 來源：${categoryInfo.sheetSource}**
${dataContext}${conversationContext}

**用戶問題：**
${question}

請根據上述測試數據進行分析並回答。記得在回答開頭說明這是基於測試數據的分析結果。
`

  try {
    const result = await model.generateContent(prompt)
    const response = await result.response
    return response.text()
  } catch (error) {
    console.error('Response generation error:', error)
    return '抱歉，AI模型處理您的問題時發生錯誤。請嘗試重新表述您的問題，或稍後再試。'
  }
}