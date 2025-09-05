# Google Sheets API 設置指南

## 步驟 1: 建立 Google Cloud Project

1. 前往 [Google Cloud Console](https://console.cloud.google.com/)
2. 建立新專案或選擇現有專案
3. 記錄專案 ID

## 步驟 2: 啟用 Google Sheets API

1. 在 Google Cloud Console 中，導航到「API 和服務」> 「程式庫」
2. 搜尋「Google Sheets API」
3. 點擊啟用

## 步驟 3: 建立服務帳號

1. 導航到「API 和服務」> 「憑證」
2. 點擊「建立憑證」> 「服務帳號」
3. 填寫服務帳號詳細資訊
4. 在角色中選擇「編輯者」或「Google Sheets 編輯者」
5. 完成建立

## 步驟 4: 下載 JSON 金鑰

1. 在憑證頁面，找到您剛建立的服務帳號
2. 點擊服務帳號 Email
3. 切換到「金鑰」標籤
4. 點擊「新增金鑰」>「建立新金鑰」
5. 選擇 JSON 格式
6. 下載 JSON 檔案

## 步驟 5: 設定環境變數

1. 將下載的 JSON 檔案內容複製
2. 建立 `.env.local` 檔案（根據 `.env.example`）
3. 將 JSON 內容設置為 `GOOGLE_SHEETS_CREDENTIALS` 環境變數

```bash
# 建立 .env.local 檔案
cp .env.example .env.local
```

## 步驟 6: 給服務帳號權限

1. 開啟您的 Google Sheets
2. 點擊「共用」
3. 將服務帳號的 Email 地址新增為編輯者
4. 服務帳號 Email 格式通常是：`服務帳號名稱@專案ID.iam.gserviceaccount.com`

## 測試設置

當環境變數設置完成後，在您的商品主檔管理頁面中：

1. 訪問 `http://localhost:3000/products-master-sheets`
2. 點擊「未分類商品顯示」查看未分類商品
3. 為未分類商品設定分類並儲存
4. 檢查 Google Sheets 是否有新增/更新的資料

## 故障排除

### 常見錯誤

1. **認證失敗**: 檢查 JSON 格式是否正確，環境變數是否正確設置
2. **權限不足**: 確認服務帳號已被加入到 Google Sheets 的編輯權限
3. **Spreadsheet ID 錯誤**: 從 Google Sheets URL 中取得正確的 ID

### 除錯技巧

1. 檢查 console 日誌中的錯誤訊息
2. 確認環境變數是否正確載入：
   ```javascript
   console.log('GOOGLE_SHEETS_CREDENTIALS:', process.env.GOOGLE_SHEETS_CREDENTIALS ? '已設置' : '未設置')
   ```

## Sheet 結構假設

目前 API 假設 Google Sheets 的欄位順序為：
1. 商品名稱 (A欄)
2. 新商品名稱 (B欄) 
3. 大分類 (C欄)
4. 小分類 (D欄)
5. 更新日期 (E欄)

如果您的 Sheet 結構不同，請修改 `src/lib/google-sheets.ts` 中的對應邏輯。