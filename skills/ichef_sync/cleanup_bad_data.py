import os
import json
import gspread
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

def cleanup_february():
    client = get_client()
    # 訂單銷售清單 (Order sheet)
    sheet_id = '1EWPECWQp_Ehz43Lfks_I8lcvEig8gV9DjyjEIzC5EO4'
    sh = client.open_by_key(sheet_id)
    ws = sh.get_worksheet(0)
    
    all_values = ws.get_all_values()
    headers = all_values[0]
    checkout_time_idx = headers.index('結帳時間')
    amount_idx = headers.index('發票金額')
    
    rows_to_keep = [headers]
    delete_count = 0
    
    for row in all_values[1:]:
        # 如果日期是 2026/02 而且金額是空的，就跳過不保留 (等於刪除)
        if row[checkout_time_idx].startswith('2026/02') and (not row[amount_idx] or row[amount_idx].strip() == ''):
            delete_count += 1
            continue
        rows_to_keep.append(row)
    
    if delete_count > 0:
        print(f"Found {delete_count} empty February rows. Cleaning up...")
        ws.clear()
        ws.update('A1', rows_to_keep)
        print("Cleanup done.")
    else:
        print("No empty February rows found.")

if __name__ == "__main__":
    cleanup_february()
