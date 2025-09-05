# 餐廳管理系統 - 設計系統規範

## 概述
**版本號** - v2.0 (餐廳管理專用設計系統)

## 主色彩系統

### 主色
```css
主色 1 (天藍色): #90DBF4   /* sky_blue */
主色 2 (淺紫色): #A3C4F3   /* periwinkle */
強調色 (粉色): #FFCFD2   /* melon */
```

### 完整色彩庫
餐廳管理系統10色配色調色板

#### 暖色系 (溫暖)
```css
檸檬色: #FBF8CC   /* lemon_chiffon - 溫和/柔和 */
小鹿色: #FDE4CF   /* fawn - 溫暖溫和 */  
粉色: #FFCFD2   /* melon - 主強調/活力  */
薰衣草紅: #F1C0E8   /* lavender_blush - 溫柔/女性 */
淡紫色: #CFBAF0   /* mauve - 優雅/夢幻 */
```

#### 冷色系 (清涼)  
```css
淺紫色: #A3C4F3   /* periwinkle - 主色2 */
天藍色: #90DBF4   /* sky_blue - 主色1/清爽 */
海藍色: #8EECF5   /* aquamarine - 清涼感 */
薄荷綠: #98F5E1   /* mint_green - 清新/自然 */
茶綠色: #B9FBC0   /* tea_green - 健康綠感 */
```

### 色彩分類指南

#### 強調色
```css
成功: #8EECF5 (海藍色)
警告: #FBF8CC (檸檬色)  
錯誤: #FFCFD2 (粉色)
資訊: #90DBF4 (天藍色)
```

#### 文字色
```css
主標題: #1F2937 (gray-800)
副標題: #6B7280 (gray-500) 
說明文字: #9CA3AF (gray-400)
連結文字: #90DBF4 (天藍色)
```

#### 背景色
```css
主背景: #FFFFFF (白色)
副背景: #F9FAFB (gray-50)
卡片背景: #FFFFFF (白色) + 陰影
```

## 字體系統

### H1 - 主標題 (頁面標題)
```css
font-size: 2rem (32px)
font-weight: 700 (bold)
color: #1F2937 (gray-800)
margin-bottom: 0.5rem (8px)
```
**使用場景**: 頁面主標題、重要功能標題

### H2 - 區塊標題 (主要區塊)
```css
font-size: 1.5rem (24px)
font-weight: 600 (semibold)  
color: #1F2937 (gray-800)
margin-bottom: 1rem (16px)
```
**使用場景**: 主要內容區塊標題、表格標題

### H3 - 小標題 (次區塊)
```css
font-size: 1.25rem (20px)
font-weight: 600 (semibold)
color: #374151 (gray-700)
margin-bottom: 0.75rem (12px)
```
**使用場景**: 卡片內容小標題

### H4 - 標籤 (項目)
```css
font-size: 1rem (16px)
font-weight: 500 (medium)
color: #374151 (gray-700)
margin-bottom: 0.5rem (8px)
```
**使用場景**: 項目標籤、表單標籤

### H5 - 說明文字 (輔助文字)
```css
font-size: 0.875rem (14px)
font-weight: 500 (medium)
color: #6B7280 (gray-500)
margin-bottom: 0.25rem (4px)
```
**使用場景**: 項目說明、輔助說明文字

### H6 - 註解文字 (極小文字)
```css
font-size: 0.75rem (12px)
font-weight: 400 (normal)
color: #9CA3AF (gray-400)
margin-bottom: 0.25rem (4px)
```
**使用場景**: 時間戳記、版本號註解

## 元件-按鈕

### 按鈕系統

#### 主按鈕 (Primary Button)
```css
background: #FFCFD2 (粉色)
color: #FFFFFF
padding: 0.75rem 1.5rem (12px 24px)
border-radius: 0.5rem (8px)
font-weight: 500 (medium)
font-size: 1rem (16px)
```

#### 副按鈕 (Secondary Button)  
```css
background: #A3C4F3 (淺紫色)
color: #FFFFFF
padding: 0.75rem 1.5rem (12px 24px)
border-radius: 0.5rem (8px)
font-weight: 500 (medium)
font-size: 1rem (16px)
```

#### 三級按鈕 (Tertiary Button)
```css
background: transparent
color: #90DBF4 (天藍色)
border: 1px solid #90DBF4
padding: 0.75rem 1.5rem (12px 24px)
border-radius: 0.5rem (8px)
font-weight: 500 (medium)
font-size: 1rem (16px)
```

### 卡片樣式
```css
background: #FFFFFF
border-radius: 1rem (16px)
box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1)
padding: 1.5rem (24px)
margin-bottom: 1.5rem (24px)
```

### 輸入框樣式
```css
background: #FFFFFF
border: 1px solid #D1D5DB (gray-300)
border-radius: 0.5rem (8px)
padding: 0.75rem (12px)
font-size: 1rem (16px)
color: #1F2937 (gray-800)

/* Focus 狀態 */
border-color: #90DBF4 (天藍色)
box-shadow: 0 0 0 3px rgba(144, 219, 244, 0.1)
```

## 間距系統

### 標準間距
```css
xs: 0.25rem (4px)   /* 極小間距 */
sm: 0.5rem (8px)    /* 小間距 */
md: 1rem (16px)     /* 中等間距 */
lg: 1.5rem (24px)   /* 大間距 */
xl: 2rem (32px)     /* 超大間距 */
2xl: 3rem (48px)    /* 巨大間距 */
```

### 建議用法
- **元件內間距**: sm (8px)
- **卡片內邊距**: md (16px)
- **卡片間間距**: lg (24px)  
- **頁面邊距**: xl (32px)
- **頁面間距**: lg (24px)

## 圖示系統

### 尺寸
```css
小: 1rem × 1rem (16px × 16px)
中: 1.25rem × 1.25rem (20px × 20px)  
大: 1.5rem × 1.5rem (24px × 24px)
超大: 2rem × 2rem (32px × 32px)
```

### 顏色
- **主要**: #6B7280 (gray-500)
- **副要**: #9CA3AF (gray-400)
- **強調**: #90DBF4 (天藍色)
- **狀態**: 對應狀態色

## 資料視覺化

### 圖表色彩
使用10色主配色調色板
```css
1. #90DBF4 (天藍色)
2. #FFCFD2 (粉色)  
3. #98F5E1 (薄荷綠)
4. #A3C4F3 (淺紫色)
5. #FDE4CF (小鹿色)
6. #8EECF5 (海藍色)
7. #F1C0E8 (薰衣草紅)
8. #B9FBC0 (茶綠色)
9. #CFBAF0 (淡紫色)
10. #FBF8CC (檸檬色)
```

### 圖表樣式
- 圓角設計
- 清爽陰影
- 響應式寬高比適配
- 間距 (8px)

## 響應式設計

### 斷點設定
```css
sm: 640px   /* 手機版 */
md: 768px   /* 平板 */
lg: 1024px  /* 平板/電腦 */
xl: 1280px  /* 桌面 */
2xl: 1536px /* 大螢幕 */
```

### 容器最大寬度
```css
手機: 100% (滿版)
平板: 768px  
桌面: 1200px
大螢幕: 1200px (固定)
```

## 實用類別

### Tailwind CSS 自訂類別

#### 主要色彩類別
```css
.primary-1 { background-color: #90DBF4; } /* bg-sky_blue */
.primary-2 { background-color: #A3C4F3; } /* bg-periwinkle */  
.primary-btn { background-color: #FFCFD2; } /* bg-melon */
```

#### 標題類別
```css
.h1 { @apply text-4xl font-bold text-gray-800 mb-2; }
.h2 { @apply text-2xl font-semibold text-gray-800 mb-4; }
.h3 { @apply text-xl font-semibold text-gray-700 mb-3; }
.h4 { @apply text-base font-medium text-gray-700 mb-2; }
.h5 { @apply text-sm font-medium text-gray-500 mb-1; }
.h6 { @apply text-xs text-gray-400 mb-1; }
```

#### 按鈕類別
```css
.btn-primary { @apply bg-melon text-white px-6 py-3 rounded-lg font-medium; }
.btn-secondary { @apply bg-periwinkle text-white px-6 py-3 rounded-lg font-medium; }
.btn-tertiary { @apply border border-sky_blue text-sky_blue px-6 py-3 rounded-lg font-medium; }
```

## 開發檢查清單

待實現功能清單：

- [ ] 實現10色主配色調色板
- [ ] 按鈕組件樣式規範化
- [ ] 背景白色統一規格
- [ ] 標題字體統一規範
- [ ] 實現統一 8px 標準間距規範
- [ ] 大小色彩統一標準
- [ ] 文字色彩統一統一規範
- [ ] 響應式設計完整實現

---

**更新日期**: 2025-09-06  
**版本**: v2.0 (餐廳管理專用版)  
**負責人**: 餐廳管理系統開發團隊