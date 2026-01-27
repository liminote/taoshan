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
        filename = os.path.basename(f) # Case sensitive for Chinese might be safer, but usually ok
        if '商品' in filename or 'Product' in filename or '結帳品項紀錄' in filename:
            product_files.append(f)
        elif '訂單' in filename or 'Order' in filename or '作廢紀錄' in filename:
            order_files.append(f)
    
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
            '發票金額': '結帳金額'        # Invoice Amount to Checkout Amount
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
        
        # Strict Alignment: 
        # Construct a new DataFrame or list of lists that EXACTLY matches target_headers order.
        # If a header column is not in df, fill with empty string.
        
        aligned_rows = []
        for _, row in df_new.iterrows():
            new_row = []
            for h in target_headers:
                if h in df_new.columns:
                    new_row.append(row[h])
                else:
                    # Column exists in Sheet but not in Excel (e.g. empty first col, or specific manual col)
                    new_row.append("") 
            aligned_rows.append(new_row)

        if not aligned_rows:
            print("No data to upload after alignment.")
            return False

        print(f"Appending {len(aligned_rows)} rows to Product Sales sheet...")
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
            '發票金額': '結帳金額'        # Invoice Amount to Checkout Amount
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
            
        # Strict Alignment for Orders
        aligned_rows = []
        for _, row in df.iterrows():
            new_row = []
            for h in target_headers:
                if h in df.columns:
                    new_row.append(row[h])
                else:
                    # Column exists in Sheet but not in Excel (e.g. empty first col)
                    new_row.append("") 
            aligned_rows.append(new_row)

        if not aligned_rows:
            print("No data to upload after alignment.")
            return False
            
        print(f"Appending {len(aligned_rows)} rows to Orders sheet...")
        worksheet.append_rows(aligned_rows)
        print("Done.")

    except Exception as e:
        print(f"Error updating Order Sheet: {repr(e)}")
        return False
        
    return True

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
        if sync_orders(client, config, f):
            archive_file(f)

    print("Sync completed.")

if __name__ == "__main__":
    main()
