// 修正商品主檔資料結構問題
const { supabase } = require('./supabase-client')

async function fixProductsMaster() {
  try {
    console.log('🔧 開始修正商品主檔資料結構...')
    
    // 1. 查找所有 new_name 為 null 的商品
    const { data: productsWithNullNewName, error: queryError } = await supabase
      .from('products')
      .select('id, original_name, new_name')
      .is('new_name', null)
    
    if (queryError) {
      console.error('查詢有問題的商品失敗:', queryError)
      return
    }
    
    console.log(`📊 找到 ${productsWithNullNewName?.length || 0} 筆需要修正的商品`)
    
    if (!productsWithNullNewName || productsWithNullNewName.length === 0) {
      console.log('✅ 所有商品都已有正確的 new_name')
      return
    }
    
    // 2. 批次更新 new_name
    let successCount = 0
    let errorCount = 0
    const batchSize = 100
    
    for (let i = 0; i < productsWithNullNewName.length; i += batchSize) {
      const batch = productsWithNullNewName.slice(i, i + batchSize)
      
      // 準備批次更新
      const updates = batch.map(product => ({
        id: product.id,
        new_name: product.original_name + '-'
      }))
      
      // 逐一更新（因為 Supabase 不支援批次 upsert 不同的值）
      for (const update of updates) {
        const { error } = await supabase
          .from('products')
          .update({ new_name: update.new_name })
          .eq('id', update.id)
        
        if (error) {
          console.error(`更新商品 ID ${update.id} 失敗:`, error)
          errorCount++
        } else {
          successCount++
        }
      }
      
      console.log(`✅ 已處理 ${Math.min(i + batchSize, productsWithNullNewName.length)}/${productsWithNullNewName.length} 筆`)
    }
    
    // 3. 驗證結果
    const { count: nullCount, error: verifyError } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .is('new_name', null)
    
    if (verifyError) {
      console.error('驗證結果失敗:', verifyError)
    } else {
      console.log(`📝 剩餘 null 值商品: ${nullCount} 筆`)
    }
    
    // 4. 顯示修正後的樣本
    const { data: sampleProducts } = await supabase
      .from('products')
      .select('original_name, new_name')
      .limit(5)
    
    console.log('📝 修正後的商品樣本:')
    sampleProducts?.forEach((product, i) => {
      console.log(`   ${i + 1}. ${product.original_name} -> ${product.new_name}`)
    })
    
    console.log('=== ✅ 修正完成 ===')
    console.log(`成功修正: ${successCount} 筆`)
    console.log(`失敗: ${errorCount} 筆`)
    console.log(`總計處理: ${productsWithNullNewName.length} 筆`)
    
  } catch (error) {
    console.error('💥 修正過程發生錯誤:', error)
  }
}

// 執行修正
if (require.main === module) {
  fixProductsMaster()
}

module.exports = { fixProductsMaster }