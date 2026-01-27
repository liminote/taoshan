---
name: iCHEF Data Sync
description: Automates the synchronization of iCHEF Excel exports (Products & Orders) to Google Sheets, and updates the Product Master with missing items.
---

# iCHEF Data Sync Skill

This skill allows you to automatically upload iCHEF daily export files to your Google Sheets. It automatically detects new products and adds them to your Product Master sheet for categorization.

## Prerequisites

- **Python 3.x** installed.
- **Google Service Account** credentials (configured in `.env.local` of the main project).
- **Target Google Sheets** created and accessible by the Service Account.

## Setup

1. **Install Dependencies**:
   Open a terminal in this directory and run:
   ```bash
   pip install -r requirements.txt
   ```

2. **Configure Sheet IDs**:
   Open `config.json` and update the `id` for the **orders** sheet.
   *(The Product Master ID is pre-configured based on your existing project).*
   ```json
   "orders": {
       "id": "YOUR_ORDER_SHEET_ID_HERE",
       ...
   }
   ```

3. **Prepare Google Sheets**:
   Ensure your Service Account email (found in your `.env.local` or JSON key) has **Editor** access to both the Product Master and Orders spreadsheets.

## Usage

1. **Download Data**:
   Download the Excel files (`.xls` or `.xlsx`) from iCHEF:
   - **Products**: Should contain "商品" or "Product" in the filename.
   - **Orders**: Should contain "訂單" or "Order" in the filename.

2. **Place Files**:
   Move these files into the `downloads/` folder within this skill directory:
   `Client_Taoshan/skills/ichef_sync/downloads/`

3. **Run Sync**:
   Execute the script:
   ```bash
   python sync_service.py
   ```

## Workflow Details

- **Products**: The script reads the exported product list. It checks against the "Product Master" Google Sheet. Any product name not found in the master sheet is appended to the bottom with "Unclassified" (未分類) status.
- **Orders**: The script appends the entire content of the Order export to the configured Orders Google Sheet.

## Troubleshooting

- **Credential Errors**: Ensure `GOOGLE_SHEETS_CREDENTIALS` is correctly set in your project's `.env.local`.
- **Permission Errors**: Share the Google Sheet with the Service Account email.
- **Missing Columns**: Ensure the Product Master sheet has the expected columns (商品名稱, 新商品名稱, 大分類, 小分類).
