
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, serviceRoleKey);

async function checkBuckets() {
    const { data, error } = await supabase.storage.listBuckets();
    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Buckets:', data.map(b => b.name));

        // Try to create if not exists
        if (!data.find(b => b.name === 'temp-meeting-uploads')) {
            console.log('Creating bucket...');
            // Try creating without fileSizeLimit first
            const { error: createError } = await supabase.storage.createBucket('temp-meeting-uploads', {
                public: false
            });
            if (createError) console.error('Create Error:', createError);
            else console.log('Bucket created!');
        }
    }
}

checkBuckets();
