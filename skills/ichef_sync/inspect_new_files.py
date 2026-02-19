import pandas as pd
import os

# Define file paths
base_dir = '/Users/vannyma/antigravity/02_Business_Studio/Client_Taoshan'
files = {
    'product_master': os.path.join(base_dir, '商品主檔.xlsx'),
    'item_sales_report': os.path.join(base_dir, '商品銷售報表.xlsx'),
    'order_sales_list': os.path.join(base_dir, '訂單銷售列表.xlsx')
}

def inspect_file(name, path):
    print(f"\n--- Inspecting {name} ---")
    try:
        # Read Excel file
        df = pd.read_excel(path, engine='openpyxl', nrows=5)
        print(f"Columns: {df.columns.tolist()}")
        print("First 2 rows:")
        print(df.head(2).to_string())
    except Exception as e:
        print(f"Error reading {name}: {e}")

if __name__ == "__main__":
    for name, path in files.items():
        if os.path.exists(path):
            inspect_file(name, path)
        else:
            print(f"File not found: {path}")
