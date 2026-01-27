import json
import gspread
from oauth2client.service_account import ServiceAccountCredentials
import os
from dotenv import load_dotenv

# Load Config similar to other scripts
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

    print(f"🔑 Service Account: {email}")
    print("------------------------------------------------")
    print("🔍 Scanning for accessible Spreadsheets...")
    
    try:
        # openall() fetches all spreadsheets in Drive that the SA has access to
        titles_list = client.openall()
        print(f"✅ Found {len(titles_list)} accessible spreadsheets:")
        for sheet in titles_list:
            print(f"   - [ID: {sheet.id}] {sheet.title}")
            
    except Exception as e:
        print(f"❌ Error listing spreadsheets: {repr(e)}")

if __name__ == "__main__":
    main()
