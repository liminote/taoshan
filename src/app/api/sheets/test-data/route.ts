import { NextRequest, NextResponse } from 'next/server'

// 測試用的模擬Google Sheets數據
const MOCK_DATA = {
  product: {
    dataSource: '商品銷售報表 (Google Sheets) - 測試數據',
    aiSummary: `數據摘要：總共 150 筆記錄
欄位：商品名稱, 銷售數量, 銷售金額, 銷售日期, 分類

完整數據：
1. 商品名稱: 黑板料理, 銷售數量: 85, 銷售金額: 25500, 銷售日期: 2025-08-15, 分類: 創意料理
2. 商品名稱: 米布丁, 銷售數量: 120, 銷售金額: 7200, 銷售日期: 2025-08-14, 分類: 甜點
3. 商品名稱: 炸雞腿, 銷售數量: 95, 銷售金額: 14250, 銷售日期: 2025-08-13, 分類: 主食
4. 商品名稱: 奶昔, 銷售數量: 67, 銷售金額: 10050, 銷售日期: 2025-08-12, 分類: 飲品
5. 商品名稱: 海鮮義大利麵, 銷售數量: 43, 銷售金額: 12900, 銷售日期: 2025-08-11, 分類: 主食
... 還有 145 筆數據未顯示`,
    totalRows: 150,
    headers: ['商品名稱', '銷售數量', '銷售金額', '銷售日期', '分類']
  },
  order: {
    dataSource: '訂單銷售列表 (Google Sheets) - 測試數據',
    aiSummary: `數據摘要：總共 320 筆記錄
欄位：訂單編號, 訂單時間, 總金額, 支付方式, 訂單類型, 客戶ID

完整數據：
1. 訂單編號: ORD-2025-0001, 訂單時間: 2025-08-15 19:30:00, 總金額: 1250, 支付方式: 信用卡, 訂單類型: 內用, 客戶ID: C001
2. 訂單編號: ORD-2025-0002, 訂單時間: 2025-08-15 20:15:00, 總金額: 890, 支付方式: 現金, 訂單類型: 外帶, 客戶ID: C002
3. 訂單編號: ORD-2025-0003, 訂單時間: 2025-08-15 21:45:00, 總金額: 2100, 支付方式: 電子支付, 訂單類型: 外送, 客戶ID: C003
4. 訂單編號: ORD-2025-0004, 訂單時間: 2025-08-14 18:00:00, 總金額: 750, 支付方式: 信用卡, 訂單類型: 內用, 客戶ID: C004
5. 訂單編號: ORD-2025-0005, 訂單時間: 2025-08-14 19:30:00, 總金額: 1450, 支付方式: 現金, 訂單類型: 內用, 客戶ID: C005
... 還有 315 筆數據未顯示`,
    totalRows: 320,
    headers: ['訂單編號', '訂單時間', '總金額', '支付方式', '訂單類型', '客戶ID']
  },
  category: {
    dataSource: '商品銷售報表 + 商品主檔 (Google Sheets) - 測試數據',
    aiSummary: `
商品分類分析數據摘要：

【商品銷售報表部分】
數據摘要：總共 150 筆記錄
欄位：商品名稱, 銷售數量, 銷售金額, 銷售日期, 分類

完整數據：
1. 商品名稱: 壽司刺身套餐, 銷售數量: 78, 銷售金額: 31200, 銷售日期: 2025-08-15, 分類: 日式料理
2. 商品名稱: 義大利麵, 銷售數量: 92, 銷售金額: 18400, 銷售日期: 2025-08-14, 分類: 西式料理  
3. 商品名稱: 酒水套餐, 銷售數量: 45, 銷售金額: 22500, 銷售日期: 2025-08-13, 分類: 酒水

【商品主檔部分】  
數據摘要：總共 85 筆記錄
欄位：商品ID, 商品名稱, 大分類, 小分類, 單價, 成本

完整數據：
1. 商品ID: P001, 商品名稱: 壽司刺身套餐, 大分類: 日式料理, 小分類: 壽司刺身, 單價: 400, 成本: 250
2. 商品ID: P002, 商品名稱: 義大利麵, 大分類: 西式料理, 小分類: 麵食, 單價: 200, 成本: 120
3. 商品ID: P003, 商品名稱: 酒水套餐, 大分類: 酒水, 小分類: 套餐, 單價: 500, 成本: 200

【整合統計】
- 商品總數：85 項
- 銷售記錄總數：150 筆  
- 可用分類：日式料理, 西式料理, 酒水, 甜點, 飲品, 創意料理
`,
    combinedSummary: {
      totalProducts: 85,
      totalSalesRecords: 150,
      availableCategories: ['日式料理', '西式料理', '酒水', '甜點', '飲品', '創意料理']
    }
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category') || 'product'
    const format = searchParams.get('format') || 'ai-summary'

    if (!['product', 'order', 'category'].includes(category)) {
      return NextResponse.json({
        success: false,
        error: '不支援的分類類型'
      }, { status: 400 })
    }

    const mockData = MOCK_DATA[category as keyof typeof MOCK_DATA]

    if (format === 'ai-summary') {
      return NextResponse.json({
        success: true,
        ...mockData
      })
    }

    return NextResponse.json({
      success: true,
      message: '測試數據端點',
      category,
      format,
      note: '這是用於展示UI改進的測試數據端點'
    })

  } catch (error) {
    console.error('測試數據 API 錯誤:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: '獲取測試數據失敗'
      },
      { status: 500 }
    )
  }
}