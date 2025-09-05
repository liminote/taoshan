// 從銷售資料中提取唯一商品，建立商品主檔
const { supabase } = require('./supabase-client')

async function extractProductsFromSales() {
  try {
    console.log('🔍 開始從銷售資料中提取商品主檔...')
    
    // 1. 取得所有銷售資料中的唯一商品
    const { data: salesData, error: salesError } = await supabase
      .from('product_sales')
      .select('product_original_name')
    
    if (salesError) {
      console.error('查詢銷售資料失敗:', salesError)
      return
    }
    
    console.log(`📊 找到 ${salesData?.length || 0} 筆銷售記錄`)
    
    // 2. 提取唯一的商品名稱
    const uniqueProducts = [...new Set(salesData?.map(item => item.product_original_name) || [])]
    console.log(`🎯 發現 ${uniqueProducts.length} 個唯一商品`)
    
    // 3. 取得預設分類
    const { data: categories } = await supabase
      .from('categories')
      .select('id, name')
      .limit(1)
    
    const defaultCategoryId = categories?.[0]?.id
    if (!defaultCategoryId) {
      console.error('找不到預設分類')
      return
    }
    
    console.log(`使用預設分類: ${categories[0].name} (ID: ${defaultCategoryId})`)
    
    // 4. 批次建立商品主檔
    let successCount = 0
    let errorCount = 0
    const batchSize = 100
    
    for (let i = 0; i < uniqueProducts.length; i += batchSize) {
      const batch = uniqueProducts.slice(i, i + batchSize)
      
      const batchData = batch.map(productName => ({
        original_name: productName,
        new_name: productName + '-',
        category_id: defaultCategoryId,
        subcategory_id: null
      }))
      
      const { data, error } = await supabase
        .from('products')
        .insert(batchData)
        .select('id')
      
      if (error) {
        console.error(`批次 ${Math.floor(i / batchSize) + 1} 插入失敗:`, error)
        errorCount += batch.length
      } else {
        successCount += data?.length || batch.length
        console.log(`✅ 批次 ${Math.floor(i / batchSize) + 1} 成功插入 ${data?.length || batch.length} 筆`)
      }
    }
    
    // 5. 驗證結果
    const { count: totalCount, error: countError } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
    
    if (countError) {
      console.error('驗證結果失敗:', countError)
    } else {
      console.log(`📝 商品主檔總數: ${totalCount} 筆`)
    }
    
    console.log('=== ✅ 提取完成 ===')
    console.log(`成功建立: ${successCount} 筆商品主檔`)
    console.log(`失敗: ${errorCount} 筆`)
    console.log(`處理的唯一商品: ${uniqueProducts.length} 個`)
    
  } catch (error) {
    console.error('💥 提取過程發生錯誤:', error)
  }
}

// 執行提取
if (require.main === module) {
  extractProductsFromSales()
}

module.exports = { extractProductsFromSales }