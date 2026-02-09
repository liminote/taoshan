import os
import json
import gspread
from oauth2client.service_account import ServiceAccountCredentials
from dotenv import load_dotenv

def main():
    # Setup paths
    base_dir = os.path.dirname(os.path.abspath(__file__))
    load_dotenv(os.path.join(base_dir, '../../.env.local'))
    
    creds_json = os.getenv('GOOGLE_SHEETS_CREDENTIALS')
    if not creds_json:
        print("Error: GOOGLE_SHEETS_CREDENTIALS not found.")
        return

    # Authenticate
    scope = ['https://spreadsheets.google.com/feeds', 'https://www.googleapis.com/auth/drive']
    creds_dict = json.loads(creds_json)
    creds = ServiceAccountCredentials.from_json_keyfile_dict(creds_dict, scope)
    client = gspread.authorize(creds)

    # Open the sheet
    sheet_id = '1EWPECWQp_Ehz43Lfks_I8lcvEig8gV9DjyjEIzC5EO4'
    sh = client.open_by_key(sheet_id)
    ws = sh.worksheet('工作表1')

    print("Fetching all data from sheet...")
    all_values = ws.get_all_values()
    if not all_values:
        print("Sheet is empty.")
        return

    headers = all_values[0]
    try:
        phone_idx = headers.index('顧客電話')
        order_phone_idx = headers.index('訂購人電話')
    except ValueError as e:
        print(f"Error: Could not find column: {e}")
        return

    print(f"Cleaning phone numbers in columns {phone_idx} and {order_phone_idx}...")
    
    updates = []
    changes_count = 0
    
    for row_idx, row in enumerate(all_values[1:], start=2):
        # Check '顧客電話'
        original_phone = row[phone_idx] if len(row) > phone_idx else ""
        if original_phone.startswith('0'):
            new_phone = original_phone.lstrip('0')
            if new_phone != original_phone:
                updates.append({
                    'range': gspread.utils.rowcol_to_a1(row_idx, phone_idx + 1),
                    'values': [[new_phone]]
                })
                changes_count += 1
        
        # Check '訂購人電話'
        original_order_phone = row[order_phone_idx] if len(row) > order_phone_idx else ""
        if original_order_phone.startswith('0'):
            new_order_phone = original_order_phone.lstrip('0')
            if new_order_phone != original_order_phone:
                updates.append({
                    'range': gspread.utils.rowcol_to_a1(row_idx, order_phone_idx + 1),
                    'values': [[new_order_phone]]
                })
                changes_count += 1

    if updates:
        print(f"Applying {changes_count} updates...")
        # Batch update to avoid hitting rate limits too fast (gspread handles batching but we can use batch_update)
        # However, for huge sheets, we might want to chunk it.
        # Let's try batch_update with all changes.
        ws.batch_update(updates)
        print("Done! All phone numbers have been cleaned.")
    else:
        print("No phone numbers needed cleaning.")

if __name__ == "__main__":
    main()
