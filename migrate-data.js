const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function migrateData() {
  try {
    // Read existing data
    const existingDataPath = './src/data/important-items.json'
    let existingData = []
    
    if (fs.existsSync(existingDataPath)) {
      const rawData = fs.readFileSync(existingDataPath, 'utf8')
      existingData = JSON.parse(rawData)
      console.log(`Found ${existingData.length} existing items to migrate`)
    }
    
    // Check if table exists and migrate data
    for (const item of existingData) {
      const { data, error } = await supabase
        .from('important_items')
        .insert([{
          date: item.date,
          content: item.content,
          assignee: item.assignee,
          completed: item.completed || false,
          completed_at: item.completedAt || null,
          created_at: item.createdAt
        }])
        .select()
        .single()
      
      if (error) {
        console.error(`Error migrating item "${item.content}":`, error)
      } else {
        console.log(`✓ Migrated: "${item.content}"`)
      }
    }
    
    // Test the API by fetching all items
    const { data: allItems, error: fetchError } = await supabase
      .from('important_items')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (fetchError) {
      console.error('Error fetching migrated data:', fetchError)
    } else {
      console.log(`✓ Migration complete! Total items in database: ${allItems.length}`)
      console.log('Items:', allItems.map(item => ({ id: item.id, content: item.content, assignee: item.assignee })))
    }
    
  } catch (error) {
    console.error('Migration error:', error)
  }
}

// First check if table exists
async function checkTable() {
  try {
    const { data, error } = await supabase
      .from('important_items')
      .select('id')
      .limit(1)
    
    if (error) {
      console.log('❌ Table does not exist. Please create it first in Supabase dashboard.')
      console.log('Go to: https://supabase.com/dashboard/project/ukrismjdyahpbratbsnl/editor')
      console.log('Run this SQL:')
      console.log('------------------')
      console.log(fs.readFileSync('./sql/important_items.sql', 'utf8'))
      console.log('------------------')
      return false
    } else {
      console.log('✓ Table exists! Running migration...')
      await migrateData()
      return true
    }
  } catch (error) {
    console.error('Error checking table:', error)
    return false
  }
}

checkTable()