
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function setupBucket() {
    const bucketName = 'temp-meeting-uploads';

    // Check if bucket exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();

    if (listError) {
        console.error('Error listing buckets:', listError);
        return;
    }

    const bucketExists = buckets.find(b => b.name === bucketName);

    if (bucketExists) {
        console.log(`Bucket '${bucketName}' already exists.`);
    } else {
        console.log(`Creating bucket '${bucketName}'...`);
        const { data, error } = await supabase.storage.createBucket(bucketName, {
            public: false,
            fileSizeLimit: 100 * 1024 * 1024, // 100MB
            allowedMimeTypes: ['audio/*', 'video/mp4', 'video/quicktime', 'video/x-m4v']
        });

        if (error) {
            console.error('Error creating bucket:', error);
        } else {
            console.log(`Bucket '${bucketName}' created successfully.`);
        }
    }

    // Update policy to allow authenticated uploads (or public if needed, but service role is safer for backend)
    // For client-side upload, we need a policy.
    // Since we are using the anon key on client, we need RLS policies.
    // However, storage policies are tricky to set via JS client directly without SQL usually.
    // But let's try to see if we can just use it.
    // Actually, creating a bucket via service role usually gives full access to service role, 
    // but for client side upload (anon key), we need a policy.

    console.log('Please ensure you have Storage policies set up in Supabase Dashboard if uploads fail.');
    console.log('Policy needed: Allow INSERT/SELECT for authenticated/anon users on bucket "temp-meeting-uploads"');
}

setupBucket();
