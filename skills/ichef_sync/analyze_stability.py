import pandas as pd
import os
import numpy as np

# Define file paths
base_dir = '/Users/vannyma/antigravity/02_Business_Studio/Client_Taoshan'
files = {
    'item_sales_report': os.path.join(base_dir, '商品銷售報表.xlsx')
}

def analyze():
    print("Starting Stable vs Unstable Item Analysis for 2025...")

    # 1. Load Item Sales Report
    try:
        df_sales = pd.read_excel(files['item_sales_report'], engine='openpyxl')
        
        # Parse Dates
        df_sales['結帳時間'] = pd.to_datetime(df_sales['結帳時間'])
        
        # Filter for 2025
        df_2025 = df_sales[df_sales['結帳時間'].dt.year == 2025].copy()
        
        if len(df_2025) == 0:
            print("⚠️ Warning: No data found for 2025.")
            return

        # Filter out unrelated categories/items as per user request
        # Keywords to exclude: 年菜, 餐酒2480, 無菜單, 冷凍商品, 外燴, 外帶送
        # Also exclude specific categories if they match these concepts
        
        exclude_keywords = ['年菜', '餐酒', '無菜單', '冷凍', '外燴', '外帶', '2500元', '2000元', '1500元', '1200元']
        # Note: '2500元無菜單料理' is a common item name
        
        initial_count = len(df_2025)
        df_2025 = df_2025[~df_2025['商品名稱'].str.contains('|'.join(exclude_keywords), na=False)]
        final_count = len(df_2025)
        print(f"Filtered out {initial_count - final_count} rows related to excluded items.")

        df_2025['Date'] = df_2025['結帳時間'].dt.date
        total_days = df_2025['Date'].nunique()
        print(f"Total Business Days in 2025: {total_days}")

    except Exception as e:
        print(f"Error loading data: {e}")
        return

    # 2. Identify Stable vs Unstable Items
    # Calculate how many days each item was sold
    item_days_count = df_2025.groupby('商品名稱')['Date'].nunique()
    
    # Threshold: Sold on > 20% of business days
    threshold_days = total_days * 0.2
    print(f"Stability Threshold (20% of days): {threshold_days:.1f} days")
    
    stable_items = item_days_count[item_days_count >= threshold_days].index.tolist()
    unstable_items = item_days_count[item_days_count < threshold_days].index.tolist()
    
    print(f"Total Unique Items Sold: {len(item_days_count)}")
    print(f"Stable Items Count: {len(stable_items)} ({len(stable_items)/len(item_days_count):.1%})")
    print(f"Unstable Items Count: {len(unstable_items)} ({len(unstable_items)/len(item_days_count):.1%})")

    # 3. Analyze Revenue Contribution per Day
    # Tag each transaction
    df_2025['ItemType'] = df_2025['商品名稱'].apply(lambda x: 'Stable' if x in stable_items else 'Unstable')
    
    # Group by Day and ItemType
    daily_revenue_split = df_2025.groupby(['Date', 'ItemType'])['結帳金額'].sum().unstack(fill_value=0)
    daily_revenue_split['TotalRevenue'] = daily_revenue_split['Stable'] + daily_revenue_split['Unstable']
    
    # Calculate % contribution
    daily_revenue_split['Stable%'] = (daily_revenue_split['Stable'] / daily_revenue_split['TotalRevenue']) * 100
    daily_revenue_split['Unstable%'] = (daily_revenue_split['Unstable'] / daily_revenue_split['TotalRevenue']) * 100
    
    # 4. Compare High vs Low Revenue Days
    median_revenue = daily_revenue_split['TotalRevenue'].median()
    daily_revenue_split['RevenueGroup'] = daily_revenue_split['TotalRevenue'].apply(lambda x: 'High' if x >= median_revenue else 'Low')
    
    summary = daily_revenue_split.groupby('RevenueGroup').agg(
        Avg_Total_Revenue=('TotalRevenue', 'mean'),
        Avg_Stable_Revenue=('Stable', 'mean'),
        Avg_Unstable_Revenue=('Unstable', 'mean'),
        Avg_Stable_Pct=('Stable%', 'mean'),
        Avg_Unstable_Pct=('Unstable%', 'mean')
    )
    
    summary['Stable_Diff'] = summary['Avg_Stable_Revenue']['High'] - summary['Avg_Stable_Revenue']['Low']
    summary['Unstable_Diff'] = summary['Avg_Unstable_Revenue']['High'] - summary['Avg_Unstable_Revenue']['Low']
    
    print(f"\n--- Revenue Contribution Analysis (Median Revenue: ${median_revenue:,.0f}) ---")
    print(summary.round(1).to_string())
    
    print("\n--- Interpretation ---")
    stable_gap = summary.loc['High', 'Avg_Stable_Revenue'] - summary.loc['Low', 'Avg_Stable_Revenue']
    unstable_gap = summary.loc['High', 'Avg_Unstable_Revenue'] - summary.loc['Low', 'Avg_Unstable_Revenue']
    total_gap = summary.loc['High', 'Avg_Total_Revenue'] - summary.loc['Low', 'Avg_Total_Revenue']
    
    print(f"Revenue Gap betwen High ({summary.loc['High', 'Avg_Total_Revenue']:,.0f}) and Low ({summary.loc['Low', 'Avg_Total_Revenue']:,.0f}) days: ${total_gap:,.0f}")
    print(f"  - Driven by '{stable_items}' Volume Increase: ${stable_gap:,.0f} ({stable_gap/total_gap:.1%})")
    print(f"  - Driven by '{unstable_items}' Variety/Volume: ${unstable_gap:,.0f} ({unstable_gap/total_gap:.1%})")
    
    # 5. List Impactful Unstable Items
    # Which "Unstable" items appear frequently in High days but rarely in Low days?
    high_dates = daily_revenue_split[daily_revenue_split['RevenueGroup'] == 'High'].index
    low_dates = daily_revenue_split[daily_revenue_split['RevenueGroup'] == 'Low'].index
    
    unstable_df = df_2025[df_2025['ItemType'] == 'Unstable']
    
    # Count appearances (transactions) in High vs Low days
    high_counts = unstable_df[unstable_df['Date'].isin(high_dates)]['商品名稱'].value_counts()
    low_counts = unstable_df[unstable_df['Date'].isin(low_dates)]['商品名稱'].value_counts()
    
    # Normalize by number of days in each group
    high_freq = (high_counts / len(high_dates)).rename('High_Freq')
    low_freq = (low_counts / len(low_dates)).rename('Low_Freq')
    
    impact_analysis = pd.concat([high_freq, low_freq], axis=1).fillna(0)
    impact_analysis['Diff'] = impact_analysis['High_Freq'] - impact_analysis['Low_Freq']
    
    print("\n--- Top 'Unstable' Items driving High Revenue Days ---")
    print("(Values represent average transactions per day)")
    print(impact_analysis.sort_values('Diff', ascending=False).head(10).round(2).to_string())

if __name__ == "__main__":
    analyze()
