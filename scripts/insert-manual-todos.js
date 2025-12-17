
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

const items = [
    { content: '製作銷售競賽追蹤表（PDF/按鍵式）', assignee: '馬姐', date: '儘速', dateVal: '2025-12-02' },
    { content: '確認滴雞精與年菜銷售話術並演練', assignee: 'Luis', date: '本週內', dateVal: '2025-12-05' },
    { content: '更新行事曆（含年菜取貨、送禮、外燴等）', assignee: 'Allen', date: '儘速', dateVal: '2025-12-02' },
    { content: '林姓自然人外燴執行與發票開立', assignee: 'Luis/Allen', date: '2025/12/03', dateVal: '2025-12-03' },
    { content: '聖誕裝飾安裝與測試', assignee: 'Luis', date: '本週四或五', dateVal: '2025-12-04' },
    { content: '確認冬季餐酒會酒單設計與資訊', assignee: 'Allen', date: '儘速', dateVal: '2025-12-02' },
    { content: '滴雞精小卡確認（無額外費用）', assignee: 'Luis', date: '已完成', dateVal: '2025-12-02' },
    { content: '督促美珠IG限動發布（每週4+2篇）', assignee: 'Allen', date: '持續進行', dateVal: '2025-12-02' }
];

async function insertItems() {
    console.log('Inserting items...');

    const todos = items.map(item => {
        let content = item.content;
        // Append the original date text if it's not a date
        if (!item.date.match(/^\d{4}\/\d{2}\/\d{2}$/)) {
            content = `${content} (${item.date})`;
        }

        return {
            content: content,
            assignee: item.assignee,
            date: item.dateVal,
            completed: item.date === '已完成'
        };
    });

    const { data, error } = await supabase
        .from('important_items')
        .insert(todos)
        .select();

    if (error) {
        console.error('Error inserting items:', error);
    } else {
        console.log('Successfully inserted items:', data.length);
    }
}

insertItems();
