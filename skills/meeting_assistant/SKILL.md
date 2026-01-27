---
name: 會議記錄助理 Skill
description: 自動將會議影片轉換為文字記錄並上傳。
---

# 會議記錄助理 Skill

此 Skill 協助你將會議影片（MP4, MOV 等）自動轉寫為結構化的會議記錄，並上傳至網站資料庫。

## 功能
1. **影片轉音檔**：自動使用 ffmpeg 抽取影片中的音軌（減少上傳流量與時間）。
2. **AI 轉寫與摘要**：使用 Google Gemini API 分析音檔，產出：
    - 會議摘要
    - 詳細內容（Markdown 格式）
    - 待辦事項（自動同步至網站首頁的 Dashboard）
3. **自動上傳**：將結果直接寫入網站資料庫。

## 安裝步驟

### 1. 系統需求
請確保 Mac 已安裝 `ffmpeg` (這是處理影音的必要工具)。
若您的電腦找不到 `brew` 指令，請先安裝 Homebrew：
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

安裝完 Homebrew 後，再安裝 ffmpeg：
```bash
brew install ffmpeg
```

### 2. Python 環境
建議建立虛擬環境來安裝套件：
```bash
# 進入 skill 資料夾
cd skills/meeting_assistant

# 建立虛擬環境
python3 -m venv venv

# 啟動虛擬環境
source venv/bin/activate

# 安裝所需套件
pip install -r requirements.txt
```

### 3. 設定檔
請複製範例檔並填入金鑰：
```bash
cp config.json.example config.json
```
使用文字編輯器打開 `config.json`：
- `GOOGLE_API_KEY`: 填入你的 Gemini API Key。
- `API_ENDPOINT`: 網站 API 位置 (預設為 `http://localhost:3000/api/meeting-records`，若已部署至 Vercel 請填入正式網址，例如 `https://您的網址.vercel.app/api/meeting-records`)

## 使用方式

請在終端機 (Terminal) 執行：

```bash
# 1. 確保已啟動虛擬環境 (若未啟動)
source skills/meeting_assistant/venv/bin/activate

# 2. 執行轉換 (將路徑換成您的影片檔)
python3 skills/meeting_assistant/process.py /path/to/your/video.mp4
```

執行成功後，終端機顯示 Success，您即可至網站的「會議記錄」頁面查看結果。
