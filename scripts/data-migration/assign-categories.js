// 為商品主檔分配分類
const { supabase } = require('./supabase-client')

async function assignCategoriesToProducts() {
  try {
    console.log('🏷️  開始為商品主檔分配分類...')
    
    // 1. 取得所有可用分類
    const { data: categories } = await supabase
      .from('categories')
      .select('id, name')
    
    console.log('可用的分類:')
    categories?.forEach(cat => console.log(`  ID ${cat.id}: ${cat.name}`))
    
    // 2. 統計沒有分類的商品
    const { count: noCategoryCount } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .is('category_id', null)
    
    console.log(`\n📊 發現 ${noCategoryCount} 筆沒有分類的商品`)
    
    if (!noCategoryCount || noCategoryCount === 0) {
      console.log('✅ 所有商品都已有分類')
      return
    }
    
    // 3. 選擇預設分類（使用第一個分類）
    const defaultCategory = categories?.[0]
    if (!defaultCategory) {
      console.error('找不到可用的分類')
      return
    }
    
    console.log(`使用預設分類: ${defaultCategory.name} (ID: ${defaultCategory.id})`)
    
    // 4. 批次更新所有沒有分類的商品
    console.log('🔄 開始批次更新...')
    const { data: updatedProducts, error } = await supabase
      .from('products')
      .update({ category_id: defaultCategory.id })
      .is('category_id', null)
      .select('id')
    
    if (error) {
      console.error('批次更新失敗:', error)
      return
    }
    
    const updateCount = updatedProducts?.length || 0
    console.log(`✅ 成功更新 ${updateCount} 筆商品`)
    
    // 5. 驗證結果
    const { count: remainingNullCount } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .is('category_id', null)
    
    const { count: withCategoryCount } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .not('category_id', 'is', null)
    
    console.log('\n=== ✅ 分配完成 ===')
    console.log(`有分類的商品: ${withCategoryCount} 筆`)
    console.log(`沒有分類的商品: ${remainingNullCount} 筆`)
    console.log(`使用的預設分類: ${defaultCategory.name}`)
    
    // 6. 顯示樣本
    const { data: sampleProducts } = await supabase
      .from('products')
      .select(`
        original_name, 
        new_name,
        categories:category_id(id, name)
      `)
      .limit(5)
    
    console.log('\n📝 分配後的商品樣本:')
    sampleProducts?.forEach((product, i) => {
      console.log(`   ${i + 1}. ${product.original_name} -> 分類: ${product.categories?.name}`)
    })
    
  } catch (error) {
    console.error('💥 分配過程發生錯誤:', error)
  }
}

// 執行分配
if (require.main === module) {
  assignCategoriesToProducts()
}

module.exports = { assignCategoriesToProducts }