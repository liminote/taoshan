import pandas as pd
import os

file_path = 'downloads/processed/20260201_174554_結帳品項紀錄_2026-01-26~2026-01-31.xlsx'

try:
    df = pd.read_excel(file_path)
    print("Columns:", df.columns.tolist())
    print("\nFirst 5 rows:")
    print(df.head(5).to_string())
    
    # Check for duplicate columns or potential quantity columns
    # Sometimes quantity is in a column named '數量' or similar
except Exception as e:
    print(f"Error: {e}")
