import pandas as pd
import os
import numpy as np

# Define file paths
base_dir = '/Users/vannyma/antigravity/02_Business_Studio/Client_Taoshan'
files = {
    'product_master': os.path.join(base_dir, '商品主檔.xlsx'),
    'item_sales_report': os.path.join(base_dir, '商品銷售報表.xlsx')
}

def analyze():
    print("Starting analysis for 2025...")

    # 1. Load Product Master (Categories)
    print("Loading Product Master...")
    try:
        df_master = pd.read_excel(files['product_master'], engine='openpyxl')
        # Create mapping: Product Name -> Big Category
        # Handle duplicates: drop duplicates, keep first
        df_master = df_master.drop_duplicates(subset=['商品名稱'])
        category_map = df_master.set_index('商品名稱')['大分類'].to_dict()
    except Exception as e:
        print(f"Error loading Product Master: {e}")
        return

    # 2. Load Item Sales Report
    print("Loading Item Sales Report...")
    try:
        df_sales = pd.read_excel(files['item_sales_report'], engine='openpyxl')
        
        # Parse Dates
        df_sales['結帳時間'] = pd.to_datetime(df_sales['結帳時間'])
        
        # Filter for 2025
        # The user asked for 2025, but let's check the date range first
        min_date = df_sales['結帳時間'].min()
        max_date = df_sales['結帳時間'].max()
        print(f"Data Date Range: {min_date} to {max_date}")
        
        # If 2025 data exists, filter for it. If not, use whatever is there if it covers a long period.
        # Let's try to filter for 2025 if possible, otherwise warn the user.
        df_2025 = df_sales[df_sales['結帳時間'].dt.year == 2025].copy()
        
        if len(df_2025) == 0:
            print("⚠️ Warning: No data found for 2025. Using all available data.")
            df_2025 = df_sales.copy()
        else:
            print(f"Filtered for 2025 data: {len(df_2025)} rows.")

    except Exception as e:
        print(f"Error loading Item Sales Report: {e}")
        return

    # 3. Process Data
    # Map Categories
    df_2025['Category'] = df_2025['商品名稱'].map(category_map).fillna('未分類')
    df_2025['Date'] = df_2025['結帳時間'].dt.date

    # 4. Daily Aggregation
    daily_stats = df_2025.groupby('Date').agg(
        TotalRevenue=('結帳金額', 'sum'),
        UniqueItems=('商品名稱', 'nunique')
    ).reset_index()

    # 5. Correlation Analysis
    corr_total = daily_stats['TotalRevenue'].corr(daily_stats['UniqueItems'])
    row_count_corr = daily_stats['TotalRevenue'].corr(df_2025.groupby('Date')['商品名稱'].count())
    
    print(f"\n--- Correlation Analysis (n={len(daily_stats)} days) ---")
    print(f"Overall Variety vs Revenue: {corr_total:.4f}")
    print(f"Total Items Sold (Quantity) vs Revenue: {row_count_corr:.4f}")

    # Calculate correlation for each category variety
    print("\n--- Correlation by Category Variety ---")
    category_correlations = {}
    for cat in df_2025['Category'].unique():
        cat_data = df_2025[df_2025['Category'] == cat]
        if len(cat_data) < 10: continue
        
        # Calculate daily variety for this category
        daily_cat_variety = cat_data.groupby('Date')['商品名稱'].nunique()
        
        # Align with daily total revenue
        aligned_data = pd.DataFrame({'Revenue': daily_stats['TotalRevenue'], 'CatVariety': daily_cat_variety}).fillna(0)
        
        corr = aligned_data['Revenue'].corr(aligned_data['CatVariety'])
        category_correlations[cat] = corr

    # Sort and print
    sorted_corrs = sorted(category_correlations.items(), key=lambda x: x[1], reverse=True)
    for cat, c in sorted_corrs:
        print(f"{cat}: {c:.4f}")

    median_revenue = daily_stats['TotalRevenue'].median()
    daily_stats['RevenueGroup'] = daily_stats['TotalRevenue'].apply(lambda x: 'High' if x >= median_revenue else 'Low')
    
    # 6. Category Analysis (High vs Low Revenue)
    # Merge RevenueGroup to df_2025
    df_2025 = pd.merge(df_2025, daily_stats[['Date', 'RevenueGroup']], on='Date', how='left')
    
    # First get daily counts per category
    daily_cat_counts = df_2025.groupby(['Date', 'Category'])['商品名稱'].nunique().unstack(fill_value=0)
    
    # Add Revenue Group to this
    # We need to map Date to RevenueGroup again for this new dataframe which is indexed by Date
    daily_cat_counts = daily_cat_counts.join(daily_stats.set_index('Date')['RevenueGroup'])
    
    # Group by RevenueGroup and mean
    cat_summary = daily_cat_counts.groupby('RevenueGroup').mean().T
    cat_summary['Difference'] = cat_summary['High'] - cat_summary['Low']
    cat_summary['% Drop'] = (cat_summary['Difference'] / cat_summary['High']) * 100
    cat_summary = cat_summary.sort_values('Difference', ascending=False)

    print(f"\n--- Category Variety Impact (Median Revenue: ${median_revenue:,.0f}) ---")
    print(cat_summary[['High', 'Low', 'Difference', '% Drop']].round(1).to_string())
    
    # 7. Identify "Blackboard" Items missing in Low Days
    print("\n--- Top Blackboard Items Missing in Low Revenue Days ---")
    blackboard_items = df_2025[df_2025['Category'].astype(str).str.contains('黑板')].copy()
    
    # Calculate appearance frequency in High Days vs Low Days
    high_days_count = daily_stats[daily_stats['TotalRevenue'] >= median_revenue].shape[0]
    low_days_count = daily_stats[daily_stats['TotalRevenue'] < median_revenue].shape[0]
    
    item_stats = blackboard_items.groupby(['商品名稱', 'RevenueGroup']).size().unstack(fill_value=0)
    
    # Normalize by number of days
    item_stats['High_Freq'] = item_stats.get('High', 0) / high_days_count
    item_stats['Low_Freq'] = item_stats.get('Low', 0) / low_days_count
    item_stats['Diff_Freq'] = item_stats['High_Freq'] - item_stats['Low_Freq']
    
    print(item_stats.sort_values('Diff_Freq', ascending=False).head(10)[['High_Freq', 'Low_Freq', 'Diff_Freq']].round(3).to_string())




if __name__ == "__main__":
    analyze()
