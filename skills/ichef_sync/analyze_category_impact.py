import pandas as pd
import glob
import os
 

# Suppress warnings
import warnings
warnings.simplefilter(action='ignore', category=FutureWarning)

DOWNLOADS_DIR = 'downloads/processed'
MASTER_FILE = 'product_master_cache.csv'

def analyze():
    print("Starting analysis...")
    
    # 1. Load Sales Data
    files = glob.glob(os.path.join(DOWNLOADS_DIR, '*結帳品項紀錄*.xlsx'))
    if not files:
        print("No item sales records found.")
        return

    print(f"Loading {len(files)} sales files...")
    df_list = []
    for f in files:
        try:
            d = pd.read_excel(f)
            d['結帳時間'] = pd.to_datetime(d['結帳時間'])
            df_list.append(d)
        except Exception as e:
            print(f"Error reading {f}: {e}")
    
    if not df_list:
        return

    df_sales = pd.concat(df_list, ignore_index=True)
    df_sales = df_sales.drop_duplicates()
    df_sales['Date'] = df_sales['結帳時間'].dt.date
    
    # 2. Load Product Master for Categories
    if not os.path.exists(MASTER_FILE):
        os.system('python3 -c "import pandas as pd; from check_headers import get_client, load_config; config = load_config(); client, _ = get_client(config); sheet = client.open_by_key(config[\'sheets\'][\'product_master\'][\'id\']); worksheet = sheet.worksheet(config[\'sheets\'][\'product_master\'][\'sheet_name\']); data = worksheet.get_all_records(); df = pd.DataFrame(data); df.to_csv(\'product_master_cache.csv\', index=False)"')
    
    try:
        df_master = pd.read_csv(MASTER_FILE)
        # Clean master data columns
        df_master = df_master[['商品名稱', '新商品名稱', '大分類', '小分類']]
        # Create a mapping dictionary: Item Name -> Big Category
        # Prioritize 'New Item Name' matching if possible, but sales data uses 'Item Name'
        # Strategy: Map sales '商品名稱' to master '商品名稱' to get '大分類'
        
        # Handle potential duplicates in master by dropping them
        df_master = df_master.drop_duplicates(subset=['商品名稱'])
        
        item_category_map = df_master.set_index('商品名稱')['大分類'].to_dict()
        
    except Exception as e:
        print(f"Error loading product master: {e}")
        return

    # 3. Map Categories to Sales Data
    # Note: Sales data names might slightly differ (e.g., * prefix for modifications). 
    # Global cleanup for matching: remove leading asterisk if any
    df_sales['CleanName'] = df_sales['商品名稱'].astype(str).str.replace(r'^\*', '', regex=True).str.strip()
    
    # Fill unknown categories
    df_sales['Category'] = df_sales['CleanName'].map(item_category_map).fillna('未分類')

    # 4. Analyze Variety by Category
    # We want to see: For low revenue days vs high revenue days, which categories had fewer unique items sold?
    
    daily_revenue = df_sales.groupby('Date')['發票金額'].sum().reset_index()
    daily_revenue.columns = ['Date', 'TotalRevenue']
    
    # Classify days into High/Low (e.g., Median split)
    median_rev = daily_revenue['TotalRevenue'].median()
    daily_revenue['RevenueGroup'] = daily_revenue['TotalRevenue'].apply(lambda x: 'High' if x >= median_rev else 'Low')
    
    # Calculate unique items per category per day
    daily_cat_variety = df_sales.groupby(['Date', 'Category'])['CleanName'].nunique().reset_index()
    daily_cat_variety.columns = ['Date', 'Category', 'UniqueItemsCount']
    
    # Merge with revenue info
    merged = pd.merge(daily_cat_variety, daily_revenue[['Date', 'RevenueGroup', 'TotalRevenue']], on='Date')
    
    # Pivot to compare High vs Low revenue days per category
    comparison = merged.groupby(['Category', 'RevenueGroup'])['UniqueItemsCount'].mean().unstack().fillna(0)
    comparison['Difference'] = comparison['High'] - comparison['Low']
    comparison = comparison.sort_values('Difference', ascending=False)
    
    print("\n--- Impact of Category Variety on Revenue (High $ vs Low $ Days) ---")
    print(f"Median Daily Revenue: ${median_rev:,.0f}")
    print("Numbers represent average UNIQUE items sold per day in that category.\n")
    print(comparison.round(1).to_string())

    print("\n--- Interpretation ---")
    print("Positive difference means High revenue days have significantly MORE variety in this category than Low revenue days.")
    
    # 5. Specific Low Day Analysis (e.g., 2026-01-23)
    target_date = pd.to_datetime('2026-01-23').date()
    if target_date in df_sales['Date'].unique():
        print(f"\n--- Deep Dive: Low Revenue Day ({target_date}) ---")
        day_data = df_sales[df_sales['Date'] == target_date]
        day_cats = day_data.groupby('Category')['CleanName'].nunique()
        
        avg_cats = df_sales.groupby('Category')['CleanName'].nunique().mean() # This is wrong, this is variety across all time
        # Better: Average daily variety per category
        temp_df = df_sales.groupby(['Date', 'Category'])['CleanName'].nunique().reset_index()
        temp_df.columns = ['Date', 'Category', 'UniqueItemsCount']
        daily_avg_cats = temp_df.groupby('Category')['UniqueItemsCount'].mean()
        
        diff_df = pd.DataFrame({'LowDay': day_cats, 'AvgDay': daily_avg_cats}).fillna(0)
        diff_df['MissingVariety'] = diff_df['AvgDay'] - diff_df['LowDay']
        diff_df = diff_df.sort_values('MissingVariety', ascending=False)
        
        print(f"Total Revenue: ${daily_revenue[daily_revenue['Date'] == target_date]['TotalRevenue'].values[0]:,.0f}")
        print("Categories with biggest drop in variety compared to average:")
        print(diff_df.head(5).round(1).to_string())

if __name__ == "__main__":
    analyze()
