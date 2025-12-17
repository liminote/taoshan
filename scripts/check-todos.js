
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function checkItems() {
    console.log('Checking items...');

    const { data, error } = await supabase
        .from('important_items')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

    if (error) {
        console.error('Error fetching items:', error);
    } else {
        console.log('Recent items:', data.map(i => `${i.content} (${i.date})`));
    }
}

checkItems();
