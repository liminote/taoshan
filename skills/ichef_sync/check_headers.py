import json
import gspread
from oauth2client.service_account import ServiceAccountCredentials
import os
from dotenv import load_dotenv

# Load Config
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CONFIG_PATH = os.path.join(BASE_DIR, 'config.json')

def load_config():
    with open(CONFIG_PATH, 'r', encoding='utf-8') as f:
        return json.load(f)

def get_client(config):
    env_path = os.path.abspath(os.path.join(BASE_DIR, config['google_credentials_path']))
    load_dotenv(env_path)
    creds_json = os.getenv('GOOGLE_SHEETS_CREDENTIALS')
    scope = ['https://spreadsheets.google.com/feeds', 'https://www.googleapis.com/auth/drive']
    creds = ServiceAccountCredentials.from_json_keyfile_dict(json.loads(creds_json), scope)
    return gspread.authorize(creds), creds.service_account_email

def main():
    config = load_config()
    client, email = get_client(config)

    print(f"Service Account Email: {email}")
    
    sheets_to_check = ['orders', 'product_sales', 'product_master']

    for key in sheets_to_check:
        sheet_conf = config['sheets'].get(key)
        if not sheet_conf: continue
        
        print(f"\n--- Checking {key} ({sheet_conf['id']}) ---")
        try:
            sh = client.open_by_key(sheet_conf['id'])
            
            # Print available sheets
            worksheets = sh.worksheets()
            print(f"Available Tabs: {[w.title for w in worksheets]}")
            
            try:
                ws = sh.worksheet(sheet_conf['sheet_name'])
                headers = ws.row_values(1)
                print(f"Current Headers in '{sheet_conf['sheet_name']}': {headers}")
            except gspread.WorksheetNotFound:
                print(f"⚠️ Worksheet '{sheet_conf['sheet_name']}' not found. Please update config.json.")
                if worksheets:
                   print(f"Suggestion: Use '{worksheets[0].title}'?")

        except Exception as e:
            print(f"❌ Error accessing Spreadsheet: {repr(e)}")
            if "403" in str(e):
                print(">>> HINT: Did you share the sheet with the Service Account email above?")

if __name__ == "__main__":
    main()
