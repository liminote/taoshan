#!/bin/bash
cd "$(dirname "$0")"

echo "============================================="
echo "   🚀 正在啟動 餐廳管理系統 Meeting Assistant   "
echo "============================================="
echo ""
echo "正在為您打開必要的視窗..."

# Get the absolute path of the current directory
PROJECT_DIR=$(pwd)

# Script 1: Launch Next.js Website
osascript -e 'tell application "Terminal" to do script "cd \"'$PROJECT_DIR'\" && echo \"\033[1;32m[網站伺服器]\033[0m 正在啟動...請等待 Ready 訊息出現\" && npm run dev"'

# Script 2: Launch Python Watcher
osascript -e 'tell application "Terminal" to do script "cd \"'$PROJECT_DIR'/skills/meeting_assistant\" && echo \"\033[1;34m[會議助理]\033[0m 正在啟動監控模式...\" && source venv/bin/activate && python3 watch.py ../../meeting_videos"'

echo ""
echo "✅ 啟動完成！"
echo "您現在應該會看到另外兩個新的黑色視窗："
echo "1. 網站伺服器 (npm run dev)"
echo "2. 會議助理 (watch.py)"
echo ""
echo "現在您可以把影片拖進 meeting_videos 資料夾了！"
echo "(此視窗將在 5 秒後自動關閉)"
sleep 5
exit
