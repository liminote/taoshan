const { supabase } = require('./supabase-client')

// 分類對應規則（根據商品名稱關鍵字智能分類）
const categoryMappingRules = {
  '1壽司刺身': [
    '壽司', '刺身', '握壽司', '手卷', '手捲', '貫', '海膽', '鮭魚', '比目魚', 
    '星鰻', '干貝', '鮭魚卵', '鮪魚', '花壽司', '海膽手卷', '生魚片', '天使蝦',
    '九州青干', '炙燒', '蟹膏'
  ],
  
  '2黑板料理': [
    '黑板', '季節', '限定', '特色', '主廚', '推薦', '時令', '乾煎', '魚頭', '雲蛤',
    '旗魚', '鮑魚', '酒蒸', '曼波魚', '陶板', '木瓜螺', '布拉塔', '和牛', '芥末山藥',
    '哈囉米', '北海道', '薑汁', '天婦羅', '半敲燒', '起司沙拉'
  ],
  
  '3烤炸串': [
    '烤', '炸', '串', '燒', '炙', '手羽先', '雞肉', '豬肉', '牛肉', '羊肉',
    '烤物', '炸物', '串燒', '燒烤', '揚物'
  ],
  
  '4配菜': [
    '小菜', '配菜', '沙拉', '前菜', '冷盤', '醃菜', '泡菜', '豆腐', '蛋',
    '胡麻', '溫泉', '空心菜', '蔬菜', '青菜', '厚蛋燒', '甜點', '米布丁',
    '冰卷', '無菜單'
  ],
  
  '5主食': [
    '飯', '麵', '烏龍', '拉麵', '丼', '蓋飯', '炒飯', '茶泡飯', '雜炊',
    '炒麵', '湯麵', '義大利麵', '咖哩飯', '日式炒烏龍', '定食', '關東煮'
  ],
  
  '6酒水': [
    '酒', '清酒', '啤酒', '燒酎', '威士忌', '梅酒', '果酒', '雞尾酒',
    '茶', '咖啡', '果汁', '汽水', '可樂', '水', '飲料', '精力湯', '西洋酒',
    '東洋酒', '非酒精'
  ],
  
  '湯品': [
    '湯', '味噌湯', '清湯', '濃湯', '鍋物', '火鍋', '精力湯', '湯品', '吸物'
  ],
  
  '7便當': [
    '便當', '定食', '套餐', '組合', '餐盒'
  ],
  
  '8外帶送': [
    '外帶', '外送', '打包', '帶走', 'uber'
  ],
  
  '9其他': [
    '加價購', '年菜', '折扣', '贈品', '禮券', '點數', '搭伙', '振興券', '備註'
  ]
}

async function fixCategoryAssignment() {
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
    const { data: noCategoryProducts } = await supabase
      .from('products')
      .select('id, original_name')
      .is('category_id', null)
    
    console.log(`\n📊 找到 ${noCategoryProducts?.length} 筆沒有分類的商品`)
    
    if (!noCategoryProducts || noCategoryProducts.length === 0) {
      console.log('✅ 所有商品都已有分類')
      return
    }
    
    // 4. 智能分類對應
    let successCount = 0
    let unassignedCount = 0
    const unassignedProducts = []
    
    for (const product of noCategoryProducts) {
      let matchedCategoryId = null
      let matchedCategoryName = ''
      
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
          matchedCategoryName = categoryName
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
          
          // 每50筆顯示進度
          if (successCount % 50 === 0) {
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
    
    console.log('\n=== ✅ 分類修正完成 ===')
    console.log(`本次成功分類: ${successCount} 筆`)
    console.log(`無法自動分類: ${unassignedCount} 筆`)
    console.log(`最終有分類: ${withCategoryCount} 筆`)
    console.log(`最終無分類: ${stillNullCount} 筆`)
    
    console.log('\n📊 各分類商品統計:')
    Object.entries(categoryStats)
      .sort(([,a], [,b]) => b - a)
      .forEach(([catName, count]) => {
        console.log(`  ${catName}: ${count} 筆`)
      })
    
    // 7. 顯示部分無法分類的商品
    if (unassignedProducts.length > 0) {
      console.log('\n⚠️  無法自動分類的商品樣本 (前20個):')
      unassignedProducts.slice(0, 20).forEach((name, i) => {
        console.log(`  ${i + 1}. ${name}`)
      })
      
      if (unassignedProducts.length > 20) {
        console.log(`  ... 還有 ${unassignedProducts.length - 20} 個`)
      }
    }
    
  } catch (error) {
    console.error('💥 修正過程發生錯誤:', error)
  }
}

// 執行修正
if (require.main === module) {
  fixCategoryAssignment()
}

module.exports = { fixCategoryAssignment }