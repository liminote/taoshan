import pandas as pd
import os


# Define file paths
base_dir = '/Users/vannyma/antigravity/02_Business_Studio/Client_Taoshan'
files = {
    'product_master': os.path.join(base_dir, '商品主檔.xlsx'),
    'item_sales_report': os.path.join(base_dir, '商品銷售報表.xlsx'),
    'order_sales_list': os.path.join(base_dir, '訂單銷售列表.xlsx')
}

def analyze():
    print("Starting Trend Analysis: 2024-2026...")

    # 1. Load Product Master (Categories)
    print("Loading Product Master...")
    try:
        df_master = pd.read_excel(files['product_master'], engine='openpyxl')
        df_master = df_master.drop_duplicates(subset=['商品名稱'])
        category_map = df_master.set_index('商品名稱')['大分類'].to_dict()
    except Exception as e:
        print(f"Error loading Product Master: {e}")
        return

    # 2. Load Item Sales Report
    print("Loading Item Sales Report...")
    try:
        df_items = pd.read_excel(files['item_sales_report'], engine='openpyxl')
        df_items['結帳時間'] = pd.to_datetime(df_items['結帳時間'])
        df_items['Year'] = df_items['結帳時間'].dt.year
        df_items['Quarter'] = df_items['結帳時間'].dt.to_period('Q')
        df_items['Category'] = df_items['商品名稱'].map(category_map).fillna('未分類')
        
        # Filter for 2024-2026
        df_items = df_items[df_items['Year'].isin([2024, 2025, 2026])]
        print(f"Item Sales Data Range: {df_items['Year'].min()} - {df_items['Year'].max()}")
        print(f"Total Rows: {len(df_items)}")

    except Exception as e:
        print(f"Error loading Item Sales Report: {e}")
        return

    # 3. Load Order Sales List (for Order Types & AOV)
    print("Loading Order Sales List...")
    try:
        df_orders = pd.read_excel(files['order_sales_list'], engine='openpyxl')
        df_orders['結帳時間'] = pd.to_datetime(df_orders['結帳時間'])
        df_orders['Year'] = df_orders['結帳時間'].dt.year
        
        # Filter for 2024-2026
        df_orders = df_orders[df_orders['Year'].isin([2024, 2025, 2026])]
        print(f"Order Sales Data Range: {df_orders['Year'].min()} - {df_orders['Year'].max()}")
        print(f"Total Orders: {len(df_orders)}")

    except Exception as e:
        print(f"Error loading Order Sales List: {e}")
        return

    # --- Analysis Section ---

    # A. Annual Overview
    print("\n--- A. Annual Performance Overview ---")
    annual_stats = df_orders.groupby('Year').agg(
        TotalRevenue=('發票金額', 'sum'),
        TotalOrders=('發票號碼', 'nunique'),
        AvgOrderValue=('發票金額', 'mean')
    )
    print(annual_stats.round(0).to_string())

    # B. Category Trends (Share of Revenue)
    print("\n--- B. Category Revenue Share Trends (%) ---")
    cat_revenue = df_items.groupby(['Year', 'Category'])['結帳金額'].sum().unstack(fill_value=0)
    # Calculate percentage
    cat_revenue_pct = cat_revenue.div(cat_revenue.sum(axis=1), axis=0) * 100
    
    # Sort categories by latest year share
    sorted_cols = cat_revenue_pct.loc[2025].sort_values(ascending=False).index # Use 2025 as it's the full year
    print(cat_revenue_pct[sorted_cols].round(1).to_string())
    
    # Identify Growing/Shrinking Categories
    if 2024 in cat_revenue_pct.index and 2025 in cat_revenue_pct.index:
        diff_25_24 = cat_revenue_pct.loc[2025] - cat_revenue_pct.loc[2024]
        print("\nBiggest Share Growers (2024 -> 2025):")
        print(diff_25_24.sort_values(ascending=False).head(3).to_string())
        print("\nBiggest Share Losers (2024 -> 2025):")
        print(diff_25_24.sort_values(ascending=True).head(3).to_string())

    # C. Order Type Trends
    print("\n--- C. Order Type Evolution (%) ---")
    type_counts = df_orders.groupby(['Year', '訂單種類']).size().unstack(fill_value=0)
    type_pct = type_counts.div(type_counts.sum(axis=1), axis=0) * 100
    print(type_pct.round(1).to_string())

    # D. Top Element Shifts
    print("\n--- D. Top 5 Items by Revenue (Yearly Shift) ---")
    for year in sorted(df_items['Year'].unique()):
        print(f"\n[ Year {year} ]")
        top_items = df_items[df_items['Year'] == year].groupby('商品名稱')['結帳金額'].sum().sort_values(ascending=False).head(5)
        
        # Calculate Share
        total_rev = df_items[df_items['Year'] == year]['結帳金額'].sum()
        for item, rev in top_items.items():
            print(f"  - {item}: ${rev:,.0f} ({rev/total_rev:.1%})")

    # E. Variety Trends
    print("\n--- E. Menu Variety Trends ---")
    variety_stats = df_items.groupby('Year').agg(
        UniqueItemsSold=('商品名稱', 'nunique')
    )
    print(variety_stats.to_string())
    
    # Calculate Monthly Average Variety
    df_items['Month'] = df_items['結帳時間'].dt.to_period('M')
    monthly_variety = df_items.groupby(['Year', 'Month'])['商品名稱'].nunique().reset_index()
    avg_monthly_variety = monthly_variety.groupby('Year')['商品名稱'].mean()
    print("\nAverage Unique Items Sent Per Month:")
    print(avg_monthly_variety.round(1).to_string())

if __name__ == "__main__":
    analyze()
