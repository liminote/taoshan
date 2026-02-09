const fs = require('fs');
const path = require('path');
const https = require('https');

// 簡易 CSV 解析器，支援引號與跳脫處理 (copied from src/lib/csv.ts and adapted for JS)
function parseCsv(content) {
    const rows = [];
    let currentField = '';
    let currentRow = [];
    let inQuotes = false;

    for (let i = 0; i < content.length; i++) {
        const char = content[i];

        if (inQuotes) {
            if (char === '"') {
                if (content[i + 1] === '"') {
                    currentField += '"';
                    i++;
                } else {
                    inQuotes = false;
                }
            } else {
                currentField += char;
            }
            continue;
        }

        if (char === '"') {
            inQuotes = true;
            continue;
        }

        if (char === ',') {
            currentRow.push(currentField);
            currentField = '';
            continue;
        }

        if (char === '\r') {
            continue;
        }

        if (char === '\n') {
            currentRow.push(currentField);
            rows.push(currentRow);
            currentRow = [];
            currentField = '';
            continue;
        }

        currentField += char;
    }

    if (currentField.length > 0 || currentRow.length > 0) {
        currentRow.push(currentField);
    }
    if (currentRow.length > 0) {
        rows.push(currentRow);
    }

    return rows.filter(row => row.some(value => value.trim() !== ''));
}

const { execSync } = require('child_process');

async function main() {
    const orderSheetUrl = 'https://docs.google.com/spreadsheets/d/1EWPECWQp_Ehz43Lfks_I8lcvEig8gV9DjyjEIzC5EO4/export?format=csv&gid=0';

    console.log('正在從 Google Sheets 獲取資料...');
    let csvContent;
    try {
        csvContent = execSync(`curl -L "${orderSheetUrl}"`, { encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 });
    } catch (err) {
        console.error('下載資料失敗:', err.message);
        return;
    }
    const rows = parseCsv(csvContent);

    if (rows.length < 2) {
        console.error('CSV 檔案中沒有足夠的資料');
        return;
    }

    const headers = rows[0].map(h => h.trim());
    const dataRows = rows.slice(1);

    // 欄位索引
    const nameIndex = headers.indexOf('顧客姓名');
    const phoneIndex = headers.indexOf('顧客電話');
    const timeIndex = headers.indexOf('結帳時間');
    const amountIndex = headers.indexOf('發票金額');

    if (nameIndex === -1 || phoneIndex === -1 || timeIndex === -1 || amountIndex === -1) {
        console.error('找不到必要的欄位，請檢查 CSV 表頭');
        console.log('現有表頭:', headers);
        return;
    }

    // 設定時間範圍：2024/01/01 ~ 2026/01/31
    const startDate = new Date('2024-01-01');
    const endDate = new Date('2026-02-01'); // 2026/02/01 以前，即包含 2026/01/31

    // 產出月份清單 (2024-01 到 2026-01)
    const months = [];
    for (let y = 2024; y <= 2026; y++) {
        for (let m = 1; m <= 12; m++) {
            if (y === 2026 && m > 1) break;
            months.push(`${y}-${String(m).padStart(2, '0')}`);
        }
    }

    // 統計客戶資料
    const customerStats = new Map();

    dataRows.forEach(row => {
        const timeStr = row[timeIndex] ? row[timeIndex].replace(/\//g, '-') : '';
        const date = new Date(timeStr);

        if (isNaN(date.getTime()) || date < startDate || date >= endDate) return;

        const name = row[nameIndex] || '--';
        const phone = row[phoneIndex] || '--';

        // 排除無姓名也無電話的紀錄 (視為非特定客戶)
        if (name === '--' && phone === '--') return;
        if (name.trim() === '' && phone.trim() === '') return;

        const amount = parseFloat(row[amountIndex]) || 0;
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

        // 使用手機號碼作為唯一識別碼，若無則用 姓名+手機
        const id = phone !== '--' ? phone : `${name}_${phone}`;

        if (!customerStats.has(id)) {
            customerStats.set(id, {
                name: name,
                phone: phone,
                totalAmount: 0,
                visitCounts: {}
            });
            months.forEach(m => customerStats.get(id).visitCounts[m] = 0);
        }

        const stats = customerStats.get(id);
        stats.totalAmount += amount;
        if (stats.visitCounts[monthKey] !== undefined) {
            stats.visitCounts[monthKey]++;
        }
    });

    // 取得 Top 100 (按總消費金額排序)
    const top100 = Array.from(customerStats.values())
        .sort((a, b) => b.totalAmount - a.totalAmount)
        .slice(0, 100);

    // 產生 CSV 內容 (加上 BOM 讓 Excel 正確識別 UTF-8)
    const BOM = '\uFEFF';
    const outputHeaders = ['名次', '顧客姓名', '顧客電話', ...months.map(m => `${m} 次數`), '總計消費金額'];
    const outputRows = top100.map((customer, index) => {
        return [
            index + 1,
            customer.name,
            customer.phone,
            ...months.map(m => customer.visitCounts[m]),
            Math.round(customer.totalAmount)
        ];
    });

    const generateFileContent = (sep) => {
        return [
            outputHeaders.join(sep),
            ...outputRows.map(row => row.map(cell => {
                const cellStr = String(cell);
                // 如果包含分隔符號，則加上引號
                return cellStr.includes(sep) ? `"${cellStr}"` : cellStr;
            }).join(sep))
        ].join('\n');
    };

    const csvOutput = BOM + generateFileContent(',');
    const tsvOutput = generateFileContent('\t');

    const csvPath = path.join(process.cwd(), 'top_100_customers_visits.csv');
    const tsvPath = path.join(process.cwd(), 'top_100_customers_visits.tsv');

    fs.writeFileSync(csvPath, csvOutput);
    fs.writeFileSync(tsvPath, tsvOutput);

    console.log(`CSV 報表已更新 (含 BOM): ${csvPath}`);
    console.log(`TSV 報表已生成 (最適合直接複製貼上): ${tsvPath}`);
    console.log('前 5 名客戶範例:');
    console.log(top100.slice(0, 5).map(c => `${c.name} (${c.phone}): ${c.totalAmount}`).join('\n'));
}

main().catch(console.error);
