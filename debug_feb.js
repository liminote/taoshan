const url = 'https://docs.google.com/spreadsheets/d/1EWPECWQp_Ehz43Lfks_I8lcvEig8gV9DjyjEIzC5EO4/export?format=csv&gid=0';

function parseCsv(content) {
    const rows = [];
    let currentField = '';
    let currentRow = [];
    let inQuotes = false;
    for (let i = 0; i < content.length; i++) {
        const char = content[i];
        if (inQuotes) {
            if (char === '"') {
                if (content[i + 1] === '"') { currentField += '"'; i++; }
                else inQuotes = false;
            } else currentField += char;
        } else {
            if (char === '"') inQuotes = true;
            else if (char === ',') { currentRow.push(currentField); currentField = ''; }
            else if (char === '\n' || char === '\r') {
                if (currentField || currentRow.length > 0) {
                    currentRow.push(currentField); rows.push(currentRow);
                    currentField = ''; currentRow = [];
                }
                if (char === '\r' && content[i + 1] === '\n') i++;
            } else currentField += char;
        }
    }
    if (currentField || currentRow.length > 0) { currentRow.push(currentField); rows.push(currentRow); }
    return rows;
}

async function debug() {
    console.log('正在抓取二月份資料...');
    const res = await fetch(url);
    const csv = await res.text();
    const rows = parseCsv(csv);
    const headers = rows[0].map(h => h.trim());

    const timeIdx = headers.findIndex(h => /結帳時間/.test(h));
    const invoiceIdx = headers.findIndex(h => /發票號碼/.test(h));
    const amountIdx = headers.findIndex(h => /發票金額|結帳金額/.test(h));
    const statusIdx = headers.findIndex(h => /目前概況/.test(h));

    let totalPure = 0;      // 只有「發票金額」有數字的
    let totalWithVoid = 0;  // 包含作廢的
    let totalNoInvoice = 0; // 沒有發票號碼但有金額的
    let uniqueInvoices = new Set();
    let totalDeduplicated = 0;

    rows.slice(1).forEach(r => {
        if (r[timeIdx] && r[timeIdx].includes('2026/02')) {
            const amt = parseFloat((r[amountIdx] || '0').replace(/[^-0-9.]/g, '')) || 0;
            const inv = r[invoiceIdx] || '';
            const status = r[statusIdx] || '';

            totalWithVoid += amt;

            if (!status.includes('作廢')) {
                if (inv === '') {
                    totalNoInvoice += amt;
                } else {
                    if (!uniqueInvoices.has(inv)) {
                        totalDeduplicated += amt;
                        uniqueInvoices.add(inv);
                    }
                }
            }
        }
    });

    console.log('--- 二月份深度分析 ---');
    console.log('1. 原始總計 (含作廢):', totalWithVoid.toLocaleString());
    console.log('2. 去重後總計 (排除作廢, 只算有發票號碼的):', totalDeduplicated.toLocaleString());
    console.log('3. 沒有發票號碼但有效的金額:', totalNoInvoice.toLocaleString());
    console.log('4. 兩者相加 (2+3):', (totalDeduplicated + totalNoInvoice).toLocaleString());
    console.log('5. 如果完全不去重 (排除作廢):', (totalDeduplicated + totalNoInvoice /* 這裡只是示意 */).toLocaleString());
}

debug();
