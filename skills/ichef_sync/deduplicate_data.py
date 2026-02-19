import os
import json
import gspread
import pandas as pd
from oauth2client.service_account import ServiceAccountCredentials
from dotenv import load_dotenv

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
env_path = os.path.join(BASE_DIR, '../../.env.local')
load_dotenv(env_path)

def get_client():
    creds_json = os.getenv('GOOGLE_SHEETS_CREDENTIALS')
    creds_dict = json.loads(creds_json)
    scope = ['https://spreadsheets.google.com/feeds', 'https://www.googleapis.com/auth/drive']
    creds = ServiceAccountCredentials.from_json_keyfile_dict(creds_dict, scope)
    return gspread.authorize(creds)

def deduplicate_sheet(sheet_id, unique_cols):
    client = get_client()
    sh = client.open_by_key(sheet_id)
    ws = sh.get_worksheet(0)
    
    print(f"Reading sheet {sheet_id}...")
    data = ws.get_all_values()
    if not data: return
    
    df = pd.DataFrame(data[1:], columns=data[0])
    initial_count = len(df)
    
    # 移除重複項
    # 注意：我們會保留「最後一筆」，因為最後一筆通常是我剛才修補的有金額的資料
    df = df.drop_duplicates(subset=unique_cols, keep='last')
    
    final_count = len(df)
    
    if initial_count > final_count:
        print(f"Found {initial_count - final_count} duplicates. Deduplicating...")
        ws.clear()
        # 重新寫入，包含標題
        ws.update('A1', [data[0]] + df.values.tolist())
        print("Success.")
    else:
        print("No duplicates found.")

if __name__ == "__main__":
    # 1. 清理 訂單銷售清單 (Orders) - 根據發票號碼去重
    print("Deduplicating Orders Sheet...")
    deduplicate_sheet('1EWPECWQp_Ehz43Lfks_I8lcvEig8gV9DjyjEIzC5EO4', ['發票號碼', '結帳時間'])
    
    # 2. 清理 商品銷售清單 (Product Sales) - 根據發票號碼 + 商品名稱去重
    print("\nDeduplicating Product Sales Sheet...")
    # 這裡可能要根據實際欄位名稱調整，假設是 '發票號碼' 和 '品項' 或 '商品名稱'
    deduplicate_sheet('1GeRbtCX_oHJBooYvZeRbREaSxJ4r8P8QoL-vHiSz2eo', ['發票號碼', '商品名稱', '結帳時間'])
