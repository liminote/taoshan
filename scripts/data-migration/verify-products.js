// 驗證商品主檔資料匯入結果
const { supabase } = require('./supabase-client')

async function verifyProducts() {
  try {
    console.log('🔍 開始驗證商品主檔資料...')
    
    // 1. 統計商品總數
    const { count: totalCount, error: countError } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
    
    if (countError) {
      console.error('查詢商品總數失敗:', countError)
      return
    }
    
    console.log(`📊 商品總數: ${totalCount} 筆`)
    
    // 2. 按分類統計
    const { data: categoryStats, error: categoryError } = await supabase
      .from('products')
      .select('category_id')
    
    if (categoryError) {
      console.error('查詢分類統計失敗:', categoryError)
      return
    }
    
    // 統計每個分類的商品數量
    const categoryCount = {}
    categoryStats?.forEach(item => {
      categoryCount[item.category_id] = (categoryCount[item.category_id] || 0) + 1
    })
    
    console.log('📋 各分類商品數量統計:')
    Object.entries(categoryCount).forEach(([categoryId, count]) => {
      console.log(`   分類 ${categoryId}: ${count} 筆`)
    })
    
    // 3. 查詢前10筆商品資料
    const { data: sampleProducts, error: sampleError } = await supabase
      .from('products')
      .select('*')
      .limit(10)
    
    if (sampleError) {
      console.error('查詢樣本資料失敗:', sampleError)
      return
    }
    
    console.log('📝 前10筆商品資料:')
    sampleProducts?.forEach((product, index) => {
      console.log(`   ${index + 1}. ${product.original_name} -> ${product.new_name} (分類ID: ${product.category_id}, 子分類ID: ${product.subcategory_id})`)
    })
    
    // 4. 檢查是否有NULL值
    const { data: nullCheck, error: nullError } = await supabase
      .from('products')
      .select('*')
      .or('original_name.is.null,new_name.is.null,category_id.is.null')
    
    if (nullError) {
      console.error('檢查NULL值失敗:', nullError)
      return
    }
    
    if (nullCheck && nullCheck.length > 0) {
      console.log('⚠️  發現有NULL值的記錄:')
      nullCheck.forEach(product => {
        console.log(`   ID ${product.id}: ${product.original_name || 'NULL'} -> ${product.new_name || 'NULL'}`)
      })
    } else {
      console.log('✅ 沒有發現NULL值的記錄')
    }
    
    console.log('=== ✅ 驗證完成 ===')
    
  } catch (error) {
    console.error('💥 驗證過程發生錯誤:', error)
  }
}

// 執行驗證
if (require.main === module) {
  verifyProducts()
}

module.exports = { verifyProducts }