import pandas as pd
import os
import glob

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DOWNLOADS_DIR = os.path.join(BASE_DIR, 'downloads', 'processed')

def main():
    files = glob.glob(os.path.join(DOWNLOADS_DIR, "*.xls*"))
    if not files:
        print("No files found in downloads folder.")
        return

    for f in files:
        print(f"\n📄 File: {os.path.basename(f)}")
        try:
            df = pd.read_excel(f)
            print(f"   Columns: {df.columns.tolist()}")
        except Exception as e:
            print(f"   Error reading file: {e}")

if __name__ == "__main__":
    main()
