// 修正商品主檔的分類對應問題
const { supabase } = require('./supabase-client')

// 商品名稱到分類的智能對應規則
const categoryMappingRules = {
  // 壽司刺身類
  '壽司刺身': [
    '壽司', '刺身', '握壽司', '手卷', '手捲', '貫', '海膽', '鮭魚', '比目魚', 
    '星鰻', '干貝', '鮭魚卵', '鮪魚', '花壽司', '海膽手卷', '生魚片'
  ],
  
  // 黑板料理類
  '黑板料理': [
    '黑板', '季節', '限定', '特色', '主廚', '推薦', '時令'
  ],
  
  // 烤炸串類
  '烤炸串': [
    '烤', '炸', '串', '燒', '炙', '手羽先', '雞肉', '豬肉', '牛肉', '羊肉',
    '烤物', '炸物', '串燒', '燒烤'
  ],
  
  // 配菜類
  '配菜': [
    '小菜', '配菜', '沙拉', '前菜', '冷盤', '醃菜', '泡菜', '豆腐', '蛋',
    '胡麻', '溫泉', '空心菜', '蔬菜', '青菜'
  ],
  
  // 主食類
  '主食': [
    '飯', '麵', '烏龍', '拉麵', '丼', '蓋飯', '炒飯', '茶泡飯', '雜炊',
    '炒麵', '湯麵', '義大利麵', '咖哩飯'
  ],
  
  // 酒水類
  '酒水': [
    '酒', '清酒', '啤酒', '燒酎', '威士忌', '梅酒', '果酒', '雞尾酒',
    '茶', '咖啡', '果汁', '汽水', '可樂', '水', '飲料'
  ],
  
  // 湯品類
  '湯品': [
    '湯', '味噌湯', '清湯', '濃湯', '鍋物', '火鍋', '精力湯', '湯品'
  ],
  
  // 便當類
  '便當': [
    '便當', '定食', '套餐', '組合', '餐盒'
  ],
  
  // 外帶送類  
  '外帶送': [
    '外帶', '外送', '打包', '帶走'
  ]
}

async function fixCategoryMapping() {
  try {
    console.log('🔧 開始修正商品分類對應...')
    
    // 1. 取得所有系統分類
    const { data: categories } = await supabase
      .from('categories')
      .select('id, name')
    
    console.log('系統分類:')
    categories?.forEach(cat => console.log(`  ID ${cat.id}: ${cat.name}`))
    
    // 2. 建立分類名稱對應表
    const categoryNameToId = new Map()
    categories?.forEach(cat => {
      categoryNameToId.set(cat.name, cat.id)
    })
    
    // 3. 取得所有沒有分類的商品
    const { data: noCategotyProducts } = await supabase
      .from('products')
      .select('id, original_name')
      .is('category_id', null)
    
    console.log(`\n📊 找到 ${noCategotyProducts?.length} 筆沒有分類的商品`)
    
    if (!noCategotyProducts || noCategotyProducts.length === 0) {
      console.log('✅ 所有商品都已有分類')
      return
    }
    
    // 4. 智能分類對應
    let successCount = 0
    let unassignedCount = 0
    const unassignedProducts = []
    
    for (const product of noCategotyProducts) {
      let matchedCategoryId = null
      
      // 嘗試根據商品名稱關鍵字匹配分類
      for (const [categoryName, keywords] of Object.entries(categoryMappingRules)) {
        const categoryId = categoryNameToId.get(categoryName)
        if (!categoryId) continue
        
        // 檢查商品名稱是否包含任何關鍵字
        const productNameLower = product.original_name.toLowerCase()
        const hasKeyword = keywords.some(keyword => 
          productNameLower.includes(keyword.toLowerCase())
        )
        
        if (hasKeyword) {
          matchedCategoryId = categoryId
          break
        }
      }
      
      // 如果找到匹配的分類，更新商品
      if (matchedCategoryId) {
        const { error } = await supabase
          .from('products')
          .update({ category_id: matchedCategoryId })
          .eq('id', product.id)
        
        if (error) {
          console.error(`更新商品 ${product.original_name} 失敗:`, error)
        } else {
          successCount++
          
          // 每100筆顯示進度
          if (successCount % 100 === 0) {
            console.log(`✅ 已分類 ${successCount} 筆商品`)
          }
        }
      } else {
        unassignedCount++
        unassignedProducts.push(product.original_name)
      }
    }
    
    // 5. 驗證結果
    const { count: stillNullCount } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .is('category_id', null)
    
    const { count: withCategoryCount } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .not('category_id', 'is', null)
    
    // 6. 顯示各分類統計
    const { data: finalStats } = await supabase
      .from('products')
      .select(`
        category_id,
        categories:category_id(name)
      `)
      .not('category_id', 'is', null)
    
    const categoryStats = {}
    finalStats?.forEach(p => {
      const catName = p.categories?.name || '未知'
      categoryStats[catName] = (categoryStats[catName] || 0) + 1
    })
    
    console.log('\\n=== ✅ 分類修正完成 ===')
    console.log(`本次成功分類: ${successCount} 筆`)
    console.log(`無法自動分類: ${unassignedCount} 筆`)
    console.log(`最終有分類: ${withCategoryCount} 筆`)
    console.log(`最終無分類: ${stillNullCount} 筆`)
    
    console.log('\\n📊 各分類商品統計:')
    Object.entries(categoryStats).forEach(([catName, count]) => {
      console.log(`  ${catName}: ${count} 筆`)
    })
    
    // 7. 顯示部分無法分類的商品
    if (unassignedProducts.length > 0) {
      console.log('\\n⚠️  無法自動分類的商品樣本 (前10個):')
      unassignedProducts.slice(0, 10).forEach((name, i) => {
        console.log(`  ${i + 1}. ${name}`)
      })
      
      if (unassignedProducts.length > 10) {
        console.log(`  ... 還有 ${unassignedProducts.length - 10} 個`)
      }
    }
    
  } catch (error) {
    console.error('💥 修正過程發生錯誤:', error)
  }
}

// 執行修正
if (require.main === module) {
  fixCategoryMapping()
}

module.exports = { fixCategoryMapping }