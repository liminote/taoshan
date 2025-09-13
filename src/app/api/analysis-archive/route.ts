import { NextRequest, NextResponse } from 'next/server'

// 模擬分析存檔資料結構
interface AnalysisArchive {
  id: string
  title: string
  content: string
  createdAt: string
}

// 暫時使用記憶體儲存，實際應用中應該使用資料庫
let analysisArchives: AnalysisArchive[] = [
  {
    id: '1',
    title: '2024年12月客戶消費分析',
    content: `## 客戶消費分析報告

### 📊 重要發現
- Top 30客戶消費分析顯示新回客的價值明顯高於純新客
- 新回客平均消費比純新客高30%
- 酒類消費是重要營收來源，特別是Asahi生啤酒機

### 🎯 客戶分類
#### 新客戶 (6人)
平均消費: $10,337
特徵: 單次消費，未回頭

#### 新回客 (5人) 
平均消費: $13,395
特徵: 消費力更強，有回頭消費

### 💡 建議
1. 加強新客戶回頭率培養
2. 維持日式高檔食材品質
3. 推廣酒類商品搭配`,
    createdAt: '2024-12-28T10:30:00Z'
  },
  {
    id: '2',
    title: '品項偏好深度分析',
    content: `## 品項偏好分析

### 🍽️ 熱門品項 TOP 5
1. **Asahi生啤酒機** - 1,251次點餐，$194,536
2. **黑鮪魚/生** - 915次點餐，$193,646  
3. **胡麻豆腐/粒** - 839次點餐，$99,156
4. **比目魚握壽司/貫** - 807次點餐，$72,012
5. **鰤魚/青甘/生** - 816次點餐，$127,688

### 📈 趨勢分析
- 日式高檔生魚片類商品受歡迎
- 酒類消費頻率最高
- 客戶偏好優質食材

### 🎯 商業洞察
建議加強：
- 生魚片品質控制
- 酒類推薦服務
- 日式料理培訓`,
    createdAt: '2024-12-27T15:45:00Z'
  },
  {
    id: '3',
    title: '月度營收趨勢分析',
    content: `## 月度營收分析報告

### 📊 營收概況
本月營收表現良好，主要驅動因素：

1. **客戶回頭率提升** - 新客轉化為回頭客的比例增加
2. **高價位商品銷售增長** - 黑鮪魚、青甘等高檔食材銷量上升
3. **酒類搭配銷售** - 餐酒搭配推廣成效顯著

### 📈 關鍵指標
- 平均客單價: 上升15%
- 客戶回頭率: 提升至65%
- 酒類搭配率: 80%

### 🎯 下月策略
1. 繼續推廣餐酒搭配
2. 新增季節性特色菜品
3. 強化會員服務體驗`,
    createdAt: '2024-12-26T09:20:00Z'
  }
]

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const id = searchParams.get('id')

    // 如果指定 ID，返回單一檔案詳情
    if (id) {
      const archive = analysisArchives.find(item => item.id === id)
      if (!archive) {
        return NextResponse.json({ error: '找不到指定的分析檔案' }, { status: 404 })
      }
      return NextResponse.json({ success: true, data: archive })
    }

    // 處理搜尋
    let filteredArchives = analysisArchives
    
    if (search) {
      const searchLower = search.toLowerCase()
      filteredArchives = analysisArchives.filter(item => 
        item.title.toLowerCase().includes(searchLower) ||
        item.content.toLowerCase().includes(searchLower)
      )
    }

    // 按建立時間排序 (最新的在前)
    filteredArchives.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    return NextResponse.json({
      success: true,
      data: filteredArchives.map(item => ({
        id: item.id,
        title: item.title,
        createdAt: item.createdAt
      }))
    })

  } catch (error) {
    console.error('獲取分析存檔失敗:', error)
    return NextResponse.json({ error: '獲取分析存檔失敗' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { title, content } = await request.json()

    if (!title || !content) {
      return NextResponse.json({ error: '標題和內容為必填欄位' }, { status: 400 })
    }

    const newArchive: AnalysisArchive = {
      id: Date.now().toString(),
      title,
      content,
      createdAt: new Date().toISOString()
    }

    analysisArchives.unshift(newArchive) // 新增到開頭

    return NextResponse.json({ 
      success: true, 
      message: '分析檔案已成功儲存',
      data: newArchive 
    })

  } catch (error) {
    console.error('儲存分析檔案失敗:', error)
    return NextResponse.json({ error: '儲存分析檔案失敗' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const { title, content } = await request.json()

    if (!id) {
      return NextResponse.json({ error: '缺少檔案 ID' }, { status: 400 })
    }

    if (!title || !content) {
      return NextResponse.json({ error: '標題和內容為必填欄位' }, { status: 400 })
    }

    const index = analysisArchives.findIndex(item => item.id === id)
    if (index === -1) {
      return NextResponse.json({ error: '找不到指定的分析檔案' }, { status: 404 })
    }

    analysisArchives[index] = {
      ...analysisArchives[index],
      title,
      content
    }

    return NextResponse.json({ 
      success: true, 
      message: '分析檔案已更新',
      data: analysisArchives[index]
    })

  } catch (error) {
    console.error('更新分析檔案失敗:', error)
    return NextResponse.json({ error: '更新分析檔案失敗' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: '缺少檔案 ID' }, { status: 400 })
    }

    const index = analysisArchives.findIndex(item => item.id === id)
    if (index === -1) {
      return NextResponse.json({ error: '找不到指定的分析檔案' }, { status: 404 })
    }

    analysisArchives.splice(index, 1)

    return NextResponse.json({ 
      success: true, 
      message: '分析檔案已刪除' 
    })

  } catch (error) {
    console.error('刪除分析檔案失敗:', error)
    return NextResponse.json({ error: '刪除分析檔案失敗' }, { status: 500 })
  }
}