import os
import json
import glob
import pandas as pd
import gspread
from oauth2client.service_account import ServiceAccountCredentials
from datetime import datetime
from dotenv import load_dotenv

# Setup Paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CONFIG_PATH = os.path.join(BASE_DIR, 'config.json')
DOWNLOADS_DIR = os.path.join(BASE_DIR, 'downloads')
ARCHIVE_DIR = os.path.join(DOWNLOADS_DIR, 'processed')

if not os.path.exists(ARCHIVE_DIR):
    os.makedirs(ARCHIVE_DIR)

def load_config():
    with open(CONFIG_PATH, 'r', encoding='utf-8') as f:
        return json.load(f)

def get_google_client(credentials_env_path):
    # Try to load from .env.local first
    env_path = os.path.abspath(os.path.join(BASE_DIR, credentials_env_path))
    if os.path.exists(env_path):
        load_dotenv(env_path)
    
    creds_json = os.getenv('GOOGLE_SHEETS_CREDENTIALS')
    if not creds_json:
        raise ValueError("GOOGLE_SHEETS_CREDENTIALS not found in environment variables.")

    scope = ['https://spreadsheets.google.com/feeds', 'https://www.googleapis.com/auth/drive']
    creds_dict = json.loads(creds_json)
    creds = ServiceAccountCredentials.from_json_keyfile_dict(creds_dict, scope)
    return gspread.authorize(creds)

def find_excel_files():
    # Look for .xls and .xlsx files
    files = glob.glob(os.path.join(DOWNLOADS_DIR, "*.xls*"))
    product_files = []
    order_files = []

    for f in files:
        filename = os.path.basename(f)
        if '商品' in filename or 'Product' in filename or '結帳品項紀錄' in filename:
            product_files.append(f)
        elif '訂單' in filename or 'Order' in filename or '作廢紀錄' in filename:
            order_files.append(f)
    
    # Also look in reward_cards subdirectory
    reward_dir = os.path.join(os.path.dirname(os.path.dirname(DOWNLOADS_DIR)), 'reward_cards')
    if os.path.exists(reward_dir):
        csv_files = glob.glob(os.path.join(reward_dir, "*.csv"))
        for f in csv_files:
            filename = os.path.basename(f)
            if '_cards_' in filename or '_points_' in filename:
                order_files.append(f) # Reusing list or handle separately
    
    return product_files, order_files

def sync_products(client, config, file_path):
    print(f"Processing Product File: {file_path}")
    
    # Read Excel
    try:
        df_new = pd.read_excel(file_path)
    except Exception as e:
        print(f"Error reading Excel {file_path}: {repr(e)}")
        return False

    # 1. Sync Raw Data to 'Product Sales List'
    raw_success = sync_product_sales_raw(client, config, file_path, df_new)
    if not raw_success:
        print("Skipping Product Master check due to Raw Sync failure.")
        return False

    # 2. Check for New Products in Master Sheet
    print("Checking for new products in Master Sheet...")

    # Normalize columns if needed (Basic check)
    # Assuming the first column is often the product name or we look for specific headers
    # iCHEF export usually has '商品名稱' or 'Product Name'
    name_col = None
    for col in df_new.columns:
        if '商品名稱' in str(col) or 'Product' in str(col):
            name_col = col
            break
    
    if not name_col:
        print("Could not find 'Product Name' column in Excel.")
        return

    # Connect to Google Sheet
    sheet_id = config['sheets']['product_master']['id']
    sheet_name = config['sheets']['product_master']['sheet_name']
    
    try:
        sh = client.open_by_key(sheet_id)
        worksheet = sh.worksheet(sheet_name)
    except Exception as e:
        print(f"Error accessing Google Sheet (Product Master): {repr(e)}")
        return False

    # Read existing data
    existing_data = worksheet.get_all_records()
    existing_df = pd.DataFrame(existing_data)
    
    existing_names = set()
    master_col_name = config['sheets']['product_master']['columns']['name']
    
    if not existing_df.empty and master_col_name in existing_df.columns:
        existing_names = set(existing_df[master_col_name].astype(str).str.strip())
    
    # Find new products
    new_products = []
    current_date = datetime.now().strftime('%Y-%m-%d')
    
    for index, row in df_new.iterrows():
        p_name = str(row[name_col]).strip()
        if p_name and p_name not in existing_names:
            # Prepare row based on Master Sheet structure
            # [Original Name, New Name, Category, Small Category, ...Date]
            new_row = [
                p_name,
                "", # New Name (Empty)
                "未分類", # Category
                "未分類", # Small Category
                current_date
            ]
            new_products.append(new_row)
            existing_names.add(p_name) # Prevent duplicates in same batch

    if new_products:
        print(f"Found {len(new_products)} new products. Appending...")
        worksheet.append_rows(new_products)
        print("Done.")
    else:
        print("No new products found.")
    
    return True

def sync_product_sales_raw(client, config, file_path, df_new):
    print(f"Syncing Raw Product Sales to Sheet...")
    sheet_id = config['sheets']['product_sales']['id']
    sheet_name = config['sheets']['product_sales']['sheet_name']
    
    try:
        sh = client.open_by_key(sheet_id)
        worksheet = sh.worksheet(sheet_name)
        
        df_new = df_new.fillna('').astype(str)
        
        # Normalize Column Names (Fix mismatches)
        df_new = df_new.rename(columns={
            '載具／捐贈碼': '載具/捐贈碼',  # Full-width slash to half-width
            '發票金額': '結帳金額',        # Invoice Amount to Checkout Amount
            '支付模組': '支付方式',        # Payment Module to Payment Method
            '訂單標籤與備註': '訂單備註'    # Tags to Notes
        })
        
        # Filter out voided transactions (目前概況 contains '已作廢')
        if '目前概況' in df_new.columns:
            before_count = len(df_new)
            df_new = df_new[~df_new['目前概況'].str.contains('已作廢', na=False)]
            after_count = len(df_new)
            if before_count > after_count:
                print(f"Filtered out {before_count - after_count} voided (已作廢) rows.")

        # Check if empty to add headers
        existing_data = worksheet.get_all_values()
        if not existing_data:
            header = df.columns.tolist()
            worksheet.append_row(header)
            target_headers = header
        else:
            target_headers = worksheet.row_values(1)
        
        if not existing_data:
            header = df.columns.tolist()
            worksheet.append_row(header)
            target_headers = header
        else:
            target_headers = worksheet.row_values(1)
        
        # Define column aliases to handle mismatches
        aliases = {
            '發票金額': '結帳金額',
            '結帳金額': '發票金額',
            '支付模組': '支付方式',
            '支付方式': '支付模組',
            '載具／捐贈碼': '載具/捐贈碼',
            '載具/捐贈碼': '載具／捐贈碼',
            '訂單標籤與備註': '訂單備註',
            '訂單備註': '訂單標籤與備註'
        }

        # Prevent Duplicates: Get existing invoice numbers & times to skip
        existing_keys = set()
        if existing_data:
            inv_idx = -1
            time_idx = -1
            for i, h in enumerate(target_headers):
                if '發票號碼' in h: inv_idx = i
                if '結帳時間' in h: time_idx = i
            
            if inv_idx != -1 and time_idx != -1:
                # Use (InvoiceNumber, Time) as a unique key
                for r in existing_data[1:]:
                    if len(r) > max(inv_idx, time_idx):
                        existing_keys.add((r[inv_idx].strip(), r[time_idx].strip()))

        # Strict Alignment with Alias Support & Deduplication: 
        aligned_rows = []
        inv_col = '發票號碼'
        time_col = '結帳時間'

        for _, row in df_new.iterrows():
            # Check if exists
            current_key = (str(row.get(inv_col, '')).strip(), str(row.get(time_col, '')).strip())
            if current_key[0] and current_key in existing_keys:
                continue

            new_row = []
            for h in target_headers:
                target_h = h.strip()
                if target_h in df_new.columns:
                    new_row.append(row[target_h])
                elif target_h in aliases and aliases[target_h] in df_new.columns:
                    new_row.append(row[aliases[target_h]])
                else:
                    new_row.append("") 
            aligned_rows.append(new_row)
            existing_keys.add(current_key) # Prevent duplicates WITHIN the same file

        if not aligned_rows:
            print("No NEW data to upload after deduplication.")
            return True # Not a failure, just nothing new

        print(f"Appending {len(aligned_rows)} NEW rows to Product Sales sheet...")
        worksheet.append_rows(aligned_rows)
        print("Raw Product Sales Synced.")
        return True
        
    except Exception as e:
        print(f"Error syncing raw product sales: {repr(e)}")
        return False

def sync_orders(client, config, file_path):
    print(f"Processing Order File: {file_path}")
    
    sheet_id = config['sheets']['orders']['id']
    if sheet_id == "REPLACE_WITH_ORDER_SHEET_ID_HERE":
        print("Skipping Orders: Sheet ID not configured in config.json")
        return

    try:
        df = pd.read_excel(file_path)
        # Convert all to string to avoid JSON serialization errors with dates/NaNs
        df = df.fillna('').astype(str)
        
        # Normalize Column Names for Orders (Fix mismatches)
        df = df.rename(columns={
            '載具／捐贈碼': '載具/捐贈碼',  # Full-width slash to half-width
            '發票金額': '結帳金額',        # Invoice Amount to Checkout Amount
            '支付模組': '支付方式',        # Payment Module to Payment Method
            '訂單標籤與備註': '訂單備註'    # Tags to Notes
        })
        
        # Filter out voided transactions (目前概況 contains '已作廢')
        if '目前概況' in df.columns:
            before_count = len(df)
            df = df[~df['目前概況'].str.contains('已作廢', na=False)]
            after_count = len(df)
            if before_count > after_count:
                print(f"Filtered out {before_count - after_count} voided (已作廢) rows.")

        # CLEAN PHONE NUMBERS (Strip leading '0' to match legacy data)
        # e.g. '0912345678' -> '912345678'
        phone_cols = ['顧客電話', '訂購人電話']
        for col in phone_cols:
            if col in df.columns:
                # Convert to string, strip whitespace, then strip leading '0'
                # But keep non-empty values that might not be numbers just in case? 
                # User specifically asked for this matching.
                # Use apply to handle individual cells safely
                df[col] = df[col].astype(str).apply(lambda x: x.strip().lstrip('0') if x and x.strip().startswith('0') else x)

    except Exception as e:
        print(f"Error reading Order Excel: {repr(e)}")
        return False

    try:
        sh = client.open_by_key(sheet_id)
        worksheet = sh.worksheet(config['sheets']['orders']['sheet_name'])
        
        # Check if sheet is empty (has headers?)
        # If we assume we are appending daily logs, we might just append.
        # But if headers are missing, we should add them.
        existing_data = worksheet.get_all_values()
        
        # Check if empty
        existing_data = worksheet.get_all_values()
        
        if not existing_data:
            # Empty sheet, add headers from Excel
            header = df.columns.tolist()
            worksheet.append_row(header)
            target_headers = header
        else:
            # Sheet exists, get headers
            target_headers = worksheet.row_values(1)
            
        if not existing_data:
            # Empty sheet, add headers from Excel
            header = df.columns.tolist()
            worksheet.append_row(header)
            target_headers = header
        else:
            # Sheet exists, get headers
            target_headers = worksheet.row_values(1)
            
        # Define column aliases to handle mismatches
        aliases = {
            '發票金額': '結帳金額',
            '結帳金額': '發票金額',
            '支付模組': '支付方式',
            '支付方式': '支付模組',
            '載具／捐贈碼': '載具/捐贈碼',
            '載具/捐贈碼': '載具／捐贈碼',
            '訂單標籤與備註': '訂單備註',
            '訂單備註': '訂單標籤與備註'
        }

        # Prevent Duplicates for Orders
        existing_keys = set()
        if existing_data:
            inv_idx = -1
            time_idx = -1
            for i, h in enumerate(target_headers):
                if '發票號碼' in h: inv_idx = i
                if '結帳時間' in h: time_idx = i
            
            if inv_idx != -1 and time_idx != -1:
                for r in existing_data[1:]:
                    if len(r) > max(inv_idx, time_idx):
                        existing_keys.add((r[inv_idx].strip(), r[time_idx].strip()))

        # Strict Alignment for Orders with Alias Support & Deduplication
        aligned_rows = []
        inv_col = '發票號碼'
        time_col = '結帳時間'

        for _, row in df.iterrows():
            # Check if exists
            current_key = (str(row.get(inv_col, '')).strip(), str(row.get(time_col, '')).strip())
            if current_key[0] and current_key in existing_keys:
                continue

            new_row = []
            for h in target_headers:
                target_h = h.strip()
                if target_h in df.columns:
                    new_row.append(row[target_h])
                elif target_h in aliases and aliases[target_h] in df.columns:
                    new_row.append(row[aliases[target_h]])
                else:
                    new_row.append("") 
            aligned_rows.append(new_row)
            existing_keys.add(current_key)

        if not aligned_rows:
            print("No NEW order data to upload.")
            return True

        print(f"Appending {len(aligned_rows)} NEW rows to Orders sheet...")
        worksheet.append_rows(aligned_rows)
        print("Done.")

    except Exception as e:
        print(f"Error updating Order Sheet: {repr(e)}")
        return False
        
    return True

def sync_reward_data(client, config, file_path):
    print(f"Processing Reward Data File: {file_path}")
    filename = os.path.basename(file_path)
    is_points = '_points_' in filename
    sheet_type = 'reward_points' if is_points else 'reward_cards'
    
    sheet_id = config['sheets'][sheet_type]['id']
    sheet_name = config['sheets'][sheet_type]['sheet_name']

    # Extract date from filename (e.g., 20260218)
    import re
    date_match = re.search(r'(\d{8})', filename)
    file_date_str = date_match.group(1) if date_match else "Unknown"

    try:
        # Load CSV
        df = pd.read_csv(file_path, encoding='utf-8-sig') # Handle BOM
        df = df.fillna('').astype(str)
        
        # Add 'Data_Date' column to the beginning
        df.insert(0, 'Data_Date', file_date_str)
        
        sh = client.open_by_key(sheet_id)
        # Ensure worksheet exists
        try:
            worksheet = sh.worksheet(sheet_name)
        except gspread.exceptions.WorksheetNotFound:
            print(f"Creating missing worksheet: {sheet_name}")
            worksheet = sh.add_worksheet(title=sheet_name, rows="100", cols="20")
            worksheet.append_row(df.columns.tolist())

        # Check for existing data for THIS date to prevent duplicates
        existing_data = worksheet.get_all_values()
        if existing_data:
            existing_dates = set([r[0] for r in existing_data[1:]])
            if file_date_str in existing_dates:
                print(f"Data for {file_date_str} already exists in {sheet_name}. Skipping.")
                return True

        # Append data
        data_to_append = df.values.tolist()
        worksheet.append_rows(data_to_append)
        print(f"Successfully synced {len(data_to_append)} rows to {sheet_name}.")
        return True
        
    except Exception as e:
        print(f"Error syncing reward data: {repr(e)}")
        return False

def archive_file(file_path):
    filename = os.path.basename(file_path)
    # Add timestamp to filename to prevent overwrite in archive
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    new_name = f"{timestamp}_{filename}"
    dest_path = os.path.join(ARCHIVE_DIR, new_name)
    
    try:
        os.rename(file_path, dest_path)
        print(f"Archived file to: {new_name}")
    except Exception as e:
        print(f"Error archiving file: {e}")

def main():
    print("Starting iCHEF Data Sync...")
    
    try:
        config = load_config()
        client = get_google_client(config['google_credentials_path'])
    except Exception as e:
        print(f"Initialization Error: {e}")
        return

    prod_files, order_files = find_excel_files()
    
    if not prod_files and not order_files:
        print("No Excel files found in 'downloads' folder.")
        return

    for f in prod_files:
        if sync_products(client, config, f):
            archive_file(f)
        
    for f in order_files:
        if f.endswith('.csv'):
            if sync_reward_data(client, config, f):
                # We don't archive reward cards yet to keep them as a record locally, 
                # but we could. For now let's just mark as done.
                print(f"Marked {f} as synced.")
        elif sync_orders(client, config, f):
            archive_file(f)

    print("Sync completed.")

if __name__ == "__main__":
    main()
