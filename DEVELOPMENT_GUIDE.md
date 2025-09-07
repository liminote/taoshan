# 餐廳管理系統 - 開發指南

## 快速上手

### 1. 環境設置

```bash
# 複製環境變數模板
cp .env.example .env.local

# 安裝依賴
npm install

# 啟動開發服務器
npm run dev
```

### 2. 核心配置檢查清單

- [ ] Supabase 連接配置
- [ ] Google Sheets API 憑證
- [ ] 環境變數設定完成
- [ ] 開發服務器正常運行

## 開發工作流

### 新功能開發流程

1. **了解需求**
   - 查看 PROJECT_STRUCTURE.md 了解現有架構
   - 確認功能影響的模組和頁面

2. **設計規劃**
   - 遵循 DESIGN_SYSTEM.md 色彩規範
   - 考慮用戶體驗和響應式設計
   - 規劃 API 端點和資料流

3. **實作開發**
   - 前端組件開發
   - API 路由實作
   - 資料庫操作
   - 錯誤處理

4. **測試驗證**
   - 功能測試
   - 響應式測試
   - API 測試
   - 錯誤場景測試

5. **部署發布**
   - 代碼檢查 (`npm run lint`)
   - 構建測試 (`npm run build`)
   - Vercel 部署

### 常用開發命令

```bash
# 開發
npm run dev              # 啟動開發服務器
npm run build            # 構建生產版本
npm run start            # 啟動生產服務器
npm run lint             # 代碼檢查

# 檔案操作
find src -name "*.tsx" | grep page    # 查找頁面組件
find src -name "*.ts" | grep route    # 查找API路由
```

## 程式碼規範

### 檔案命名慣例

```
src/app/
├── page.tsx              # 頁面組件 (Page Component)
├── layout.tsx            # 佈局組件 (Layout Component)  
├── loading.tsx           # 載入組件 (Loading Component)
├── error.tsx             # 錯誤組件 (Error Component)
└── api/
    └── route.ts          # API路由 (Route Handler)
```

### TypeScript 介面定義

```typescript
// 統一的資料介面定義
interface MonthlySalesData {
  month: string
  monthDisplay: string
  amount: number
  orderCount: number
  avgOrderValue: number
  productItemCount: number
}

interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}
```

### React 組件規範

```typescript
'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

export default function ComponentName() {
  // 1. State 定義
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  
  // 2. Effect 和 Callback
  const fetchData = useCallback(async () => {
    // API 呼叫邏輯
  }, [])
  
  useEffect(() => {
    fetchData()
  }, [fetchData])
  
  // 3. 條件渲染
  if (loading) {
    return <LoadingComponent />
  }
  
  // 4. 主要渲染
  return (
    <div className="min-h-screen bg-gradient-to-br from-lemon_chiffon-100 via-fawn-100 to-melon-100">
      {/* 組件內容 */}
    </div>
  )
}
```

## API 開發規範

### API 路由結構

```typescript
// src/app/api/[module]/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // 業務邏輯
    const data = await fetchData()
    
    return NextResponse.json({
      success: true,
      data
    })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}
```

### 錯誤處理規範

```typescript
// 統一錯誤處理格式
try {
  // 業務邏輯
} catch (error) {
  console.error('功能名稱錯誤:', error)
  return NextResponse.json({
    success: false,
    error: '具體錯誤描述',
    details: process.env.NODE_ENV === 'development' ? error.message : undefined
  }, { status: 500 })
}
```

## 樣式開發規範

### Tailwind CSS 使用指南

```css
/* 主要背景 - 統一使用溫暖漸層 */
.page-bg {
  @apply min-h-screen bg-gradient-to-br from-lemon_chiffon-100 via-fawn-100 to-melon-100;
}

/* 卡片容器 - 統一樣式 */
.card {
  @apply bg-white/80 backdrop-blur-sm border border-fawn-200/50 rounded-2xl p-6 shadow-lg;
}

/* 主要按鈕 - 統一樣式 */
.btn-primary {
  @apply bg-gradient-to-r from-pink-400 to-orange-400 text-white rounded-xl px-6 py-3 hover:shadow-lg transition-all duration-300 hover:scale-105;
}
```

### 響應式設計原則

```jsx
{/* 手機優先，逐步增強 */}
<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
  
{/* 文字大小響應式 */}
<h1 className="text-2xl md:text-3xl lg:text-4xl font-bold">

{/* 間距響應式 */}
<div className="p-4 md:p-6 lg:p-8">
```

## 資料庫操作

### Supabase 操作範例

```typescript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
)

// 查詢資料
const { data, error } = await supabase
  .from('table_name')
  .select('*')
  .order('created_at', { ascending: false })

// 插入資料
const { data, error } = await supabase
  .from('table_name')
  .insert([{ 
    column1: 'value1',
    column2: 'value2' 
  }])

// 更新資料
const { data, error } = await supabase
  .from('table_name')
  .update({ column1: 'new_value' })
  .eq('id', id)
```

## 效能最佳化

### 前端優化

```typescript
// 使用 useCallback 避免不必要的重新渲染
const handleClick = useCallback(() => {
  // 處理邏輯
}, [dependency])

// 使用條件載入
const LazyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <LoadingSpinner />
})

// 資料緩存
const [cachedData, setCachedData] = useState({})
const CACHE_DURATION = 5 * 60 * 1000 // 5分鐘

if (cachedData.timestamp && (now - cachedData.timestamp < CACHE_DURATION)) {
  return cachedData.data
}
```

### API 優化

```typescript
// 批量處理 API 請求
const [results] = await Promise.allSettled([
  fetch('/api/endpoint1'),
  fetch('/api/endpoint2'),
  fetch('/api/endpoint3')
])

// 分頁處理
const { data, error } = await supabase
  .from('table')
  .select('*')
  .range(start, end)
  .limit(50)
```

### 資料庫查詢優化

```sql
-- 效能索引（已包含在 important_items.sql 中）
CREATE INDEX CONCURRENTLY idx_product_sales_checkout_month 
ON product_sales (date_trunc('month', checkout_time));

-- 查詢優化範例
SELECT 
  product_original_name,
  SUM(invoice_amount) as total_sales,
  COUNT(*) as order_count
FROM product_sales 
WHERE checkout_time >= NOW() - INTERVAL '30 days'
GROUP BY product_original_name 
ORDER BY total_sales DESC 
LIMIT 20;
```

## 除錯技巧

### 開發工具使用

```typescript
// 環境變數檢查
console.log('Environment:', {
  SUPABASE_URL: process.env.SUPABASE_URL ? '已設置' : '未設置',
  GOOGLE_SHEETS: process.env.GOOGLE_SHEETS_CREDENTIALS ? '已設置' : '未設置'
})

// API 請求除錯
console.log('API Request:', { method, url, body })
console.log('API Response:', { status, data })

// React 狀態除錯
useEffect(() => {
  console.log('State changed:', { loading, data, error })
}, [loading, data, error])
```

### 常見問題解決

1. **API 404 錯誤**
   - 檢查路由檔案是否存在
   - 確認檔案命名是否正確 (`route.ts`)

2. **樣式不生效**
   - 檢查 Tailwind 類名是否正確
   - 確認自定義色彩是否在 `tailwind.config.js` 中定義

3. **資料庫連接問題**
   - 檢查環境變數設置
   - 確認 Supabase URL 和 Key 是否正確

4. **Google Sheets API 問題**
   - 檢查服務帳號權限
   - 確認 Spreadsheet ID 正確

## 部署注意事項

### Vercel 部署檢查清單

- [ ] 環境變數已在 Vercel 中設置（**注意：確保沒有換行符號**）
- [ ] 構建成功 (`npm run build`)
- [ ] 無 TypeScript 錯誤
- [ ] 無 ESLint 警告
- [ ] API 端點測試正常
- [ ] Google Sheets 整合正常
- [ ] **重要事項功能測試**（增刪改查）

### 環境變數管理

```bash
# 本地開發
cp .env.example .env.local

# Vercel 部署
# 在 Vercel Dashboard 中設置以下變數：
# - NEXT_PUBLIC_SUPABASE_URL
# - NEXT_PUBLIC_SUPABASE_ANON_KEY（**確保是單行，無換行符號**）
# - GOOGLE_SHEETS_CREDENTIALS
# - GOOGLE_SHEETS_SPREADSHEET_ID
```

### 關鍵部署經驗教訓

1. **Supabase API Key 格式**：
   - ❌ **錯誤**：環境變數包含換行符號會導致 HTTP header 錯誤
   - ✅ **正確**：確保 JWT token 是完整的單行字串

2. **Serverless 限制**：
   - ❌ **錯誤**：使用 `fs.writeFileSync()` 等文件系統操作
   - ✅ **正確**：使用 Supabase 等外部資料庫

3. **Debug 端點**：
   - 開發階段可建立 `/api/debug-*` 端點幫助除錯
   - 生產部署前**必須移除**或添加認證保護

## Supabase 資料庫操作最佳實踐

### 資料遷移流程

```typescript
// 1. 建立 SQL Schema
// sql/table_name.sql
CREATE TABLE IF NOT EXISTS table_name (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

// 2. 建立遷移腳本
// migrate-data.js
const migrateData = async () => {
  const existingData = JSON.parse(fs.readFileSync('./data/old-data.json'))
  
  for (const item of existingData) {
    const { data, error } = await supabase
      .from('table_name')
      .insert([item])
  }
}
```

### 資料庫設計原則

```sql
-- 使用 UUID 作為主鍵（更安全）
id UUID PRIMARY KEY DEFAULT gen_random_uuid()

-- 自動時間戳記
created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()

-- 必要的索引
CREATE INDEX idx_table_common_query ON table_name(commonly_queried_column);
CREATE INDEX idx_table_date ON table_name(date_column);
```

---

**記住：編程時要考慮用戶體驗、代碼可維護性和系統穩定性！**