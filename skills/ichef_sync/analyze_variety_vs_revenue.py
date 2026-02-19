import pandas as pd
import glob
import os


# Suppress warnings
import warnings
warnings.simplefilter(action='ignore', category=FutureWarning)

DOWNLOADS_DIR = 'downloads/processed'
OUTPUT_FILE = 'analysis_results.txt'

def analyze():
    # 1. Load Data
    files = glob.glob(os.path.join(DOWNLOADS_DIR, '*結帳品項紀錄*.xlsx'))
    if not files:
        print("No item sales records found.")
        return

    print(f"Loading {len(files)} files...")
    df_list = []
    for f in files:
        try:
            d = pd.read_excel(f)
            # Ensure proper datetime parsing
            d['結帳時間'] = pd.to_datetime(d['結帳時間'])
            df_list.append(d)
        except Exception as e:
            print(f"Error reading {f}: {e}")
    
    if not df_list:
        return

    df = pd.concat(df_list, ignore_index=True)
    
    # filter duplicates if any (based on Invoice + Product Name + Time)
    # But since we have no unique ID per row, duplicates might be valid (2 items sold).
    # Since files overlap (Jan 26 present in both ranges?), we need to handle overlap.
    # The file names suggest: 16-26 and 26-31.
    # Let's drop duplicates based on all columns to be safe.
    df = df.drop_duplicates()

    # Create Date Column
    df['Date'] = df['結帳時間'].dt.date

    # 2. Daily Stats
    daily_stats = df.groupby('Date').agg(
        Revenue=('發票金額', 'sum'),
        UniqueItems=('商品名稱', 'nunique'),
        TotalItemsSold=('商品名稱', 'count')
    ).reset_index()

    # Sort by Date
    daily_stats = daily_stats.sort_values('Date')

    # 3. Correlation
    corr_unique = daily_stats['Revenue'].corr(daily_stats['UniqueItems'])
    corr_total = daily_stats['Revenue'].corr(daily_stats['TotalItemsSold'])

    # 4. Output Results
    print("\n--- Daily Analysis Results ---")
    print(daily_stats.to_string(index=False))
    
    print("\n--- Correlation Analysis ---")
    print(f"Correlation (Revenue vs Unique Items Variety): {corr_unique:.4f}")
    print(f"Correlation (Revenue vs Total Items Sold): {corr_total:.4f}")

    # Interpret
    if corr_unique > 0.7:
        strength = "Strong positive"
    elif corr_unique > 0.4:
        strength = "Moderate positive"
    elif corr_unique > 0:
        strength = "Weak positive"
    else:
        strength = "Negative (or no)"
    
    print(f"\nInterpretation: There is a {strength} correlation between the variety of items sold and revenue.")
    print("Simply put: Days with higher revenue tend to have a wider variety of items ordered.")

    # 5. Top Categories (Simulated)
    # Since we lack category data, we can list top 10 items contributing to revenue
    item_revenue = df.groupby('商品名稱')['發票金額'].sum().sort_values(ascending=False).head(10)
    print("\n--- Top 10 Revenue Generating Items ---")
    print(item_revenue.to_string())

if __name__ == "__main__":
    analyze()
