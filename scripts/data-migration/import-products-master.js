// 商品主檔資料匯入程序
const { supabase } = require('./supabase-client')

// 完整的商品主檔資料
const productsData = [
  {originalName: "(必點)極品十貫壽司", newName: "(必點)極品十貫壽司-", categoryName: "1壽司刺身", subcategoryName: "手卷/壽司（菜單）"},
  {originalName: "(推薦)炙燒比目魚鰭邊握壽司/2貫", newName: "(推薦)炙燒比目魚鰭邊握壽司/2貫-", categoryName: "1壽司刺身", subcategoryName: "手卷/壽司（菜單）"},
  {originalName: "(推薦)炙燒比目魚鰭邊握壽司/2貫*", newName: "(推薦)炙燒比目魚鰭邊握壽司/2貫-", categoryName: "1壽司刺身", subcategoryName: "手卷/壽司（菜單）"},
  {originalName: "(推薦)炙燒焦糖鮭魚握壽司/2貫", newName: "(推薦)炙燒焦糖鮭魚握壽司/2貫-", categoryName: "1壽司刺身", subcategoryName: "手卷/壽司（菜單）"},
  {originalName: "九州青干/貫", newName: "九州青干/貫-", categoryName: "1壽司刺身", subcategoryName: "手卷/壽司（菜單）"},
  {originalName: "九州青干握壽司/2貫", newName: "九州青干握壽司/2貫-", categoryName: "1壽司刺身", subcategoryName: "手卷/壽司（菜單）"},
  {originalName: "干貝蟹膏握壽司", newName: "干貝蟹膏握壽司-", categoryName: "1壽司刺身", subcategoryName: "手卷/壽司（菜單）"},
  {originalName: "天使蝦/隻", newName: "天使蝦/隻-", categoryName: "1壽司刺身", subcategoryName: "手卷/壽司（菜單）"},
  {originalName: "手卷(招待)", newName: "手卷(招待)-", categoryName: "1壽司刺身", subcategoryName: "手卷/壽司（菜單）"},
  {originalName: "比目魚握壽司/貫", newName: "比目魚握壽司/貫-", categoryName: "1壽司刺身", subcategoryName: "手卷/壽司（菜單）"},
  {originalName: "北海道干貝/貫", newName: "北海道干貝/貫-", categoryName: "1壽司刺身", subcategoryName: "手卷/壽司（菜單）"},
  {originalName: "北海道海膽", newName: "北海道海膽/貫-", categoryName: "1壽司刺身", subcategoryName: "手卷/壽司（菜單）"},
  {originalName: "北海道海膽/貫", newName: "北海道海膽/貫-", categoryName: "1壽司刺身", subcategoryName: "手卷/壽司（菜單）"},
  {originalName: "北海道海膽手卷", newName: "北海道海膽手卷-", categoryName: "1壽司刺身", subcategoryName: "手卷/壽司（菜單）"},
  {originalName: "北海道海膽手卷/支", newName: "北海道海膽手卷-", categoryName: "1壽司刺身", subcategoryName: "手卷/壽司（菜單）"},
  {originalName: "本港紅甘/貫", newName: "本港紅甘/貫-", categoryName: "1壽司刺身", subcategoryName: "手卷/壽司（菜單）"},
  {originalName: "本港紅甘握壽司/2貫", newName: "本港紅甘握壽司/2貫-", categoryName: "1壽司刺身", subcategoryName: "手卷/壽司（菜單）"},
  {originalName: "本港紅甘握壽司/2貫*", newName: "本港紅甘握壽司/2貫-", categoryName: "1壽司刺身", subcategoryName: "手卷/壽司（菜單）"},
  {originalName: "生魚片蛋糕", newName: "生魚片蛋糕-", categoryName: "1壽司刺身", subcategoryName: "手卷/壽司（菜單）"},
  {originalName: "松葉蟹握壽司", newName: "松葉蟹握壽司-", categoryName: "1壽司刺身", subcategoryName: "手卷/壽司（菜單）"},
  {originalName: "炙比目魚握壽司/貫", newName: "炙比目魚握壽司/貫-", categoryName: "1壽司刺身", subcategoryName: "手卷/壽司（菜單）"},
  {originalName: "炙焦糖鮭魚握壽司/貫", newName: "炙焦糖鮭魚握壽司/貫-", categoryName: "1壽司刺身", subcategoryName: "手卷/壽司（菜單）"},
  {originalName: "炙燒比目魚緣側/貫", newName: "炙燒比目魚緣側/貫-", categoryName: "1壽司刺身", subcategoryName: "手卷/壽司（菜單）"},
  {originalName: "炙燒焦糖鮭魚/貫", newName: "炙燒焦糖鮭魚/貫-", categoryName: "1壽司刺身", subcategoryName: "手卷/壽司（菜單）"},
  {originalName: "炙鰈魚鰭邊握/貫", newName: "炙鰈魚鰭邊握/貫-", categoryName: "1壽司刺身", subcategoryName: "手卷/壽司（菜單）"},
  {originalName: "星鰻握壽司/貫", newName: "星鰻握壽司/貫-", categoryName: "1壽司刺身", subcategoryName: "手卷/壽司（菜單）"},
  {originalName: "星鰻鮭魚卵/貫", newName: "星鰻鮭魚卵/貫-", categoryName: "1壽司刺身", subcategoryName: "手卷/壽司（菜單）"},
  {originalName: "海膽手捲", newName: "海膽手捲-", categoryName: "1壽司刺身", subcategoryName: "手卷/壽司（菜單）"},
  {originalName: "握壽司配(時價)", newName: "握壽司搭配-", categoryName: "1壽司刺身", subcategoryName: "手卷/壽司（菜單）"},
  {originalName: "握壽司搭配", newName: "握壽司搭配-", categoryName: "1壽司刺身", subcategoryName: "手卷/壽司（菜單）"},
  {originalName: "焦糖鮭魚握壽司/貫", newName: "焦糖鮭魚握壽司/貫-", categoryName: "1壽司刺身", subcategoryName: "手卷/壽司（菜單）"},
  {originalName: "黑鮪魚大腹握壽司", newName: "黑鮪魚大腹握壽司-", categoryName: "1壽司刺身", subcategoryName: "手卷/壽司（菜單）"},
  {originalName: "極品十貫握壽司", newName: "極品十貫握壽司-", categoryName: "1壽司刺身", subcategoryName: "手卷/壽司（菜單）"},
  {originalName: "極品十貫壽司", newName: "極品十貫握壽司-", categoryName: "1壽司刺身", subcategoryName: "手卷/壽司（菜單）"},
  {originalName: "極品六貫壽司", newName: "極品六貫壽司-", categoryName: "1壽司刺身", subcategoryName: "手卷/壽司（菜單）"},
  {originalName: "十貫握壽司", newName: "極品握壽司/十貫-", categoryName: "1壽司刺身", subcategoryName: "手卷/壽司（菜單）"},
  {originalName: "極品握壽司/十貫", newName: "極品握壽司/十貫-", categoryName: "1壽司刺身", subcategoryName: "手卷/壽司（菜單）"},
  {originalName: "經典握壽司/六貫", newName: "經典握壽司/六貫-", categoryName: "1壽司刺身", subcategoryName: "手卷/壽司（菜單）"},
  {originalName: "豪華花壽司", newName: "豪華花壽司-", categoryName: "1壽司刺身", subcategoryName: "手卷/壽司（菜單）"},
  {originalName: "鮭魚卵小菜", newName: "鮭魚卵小菜-", categoryName: "1壽司刺身", subcategoryName: "手卷/壽司（菜單）"},
  {originalName: "鮭魚卵手卷", newName: "鮭魚卵手卷/支-", categoryName: "1壽司刺身", subcategoryName: "手卷/壽司（菜單）"},
  {originalName: "鮭魚卵手卷/支", newName: "鮭魚卵手卷/支-", categoryName: "1壽司刺身", subcategoryName: "手卷/壽司（菜單）"},
  {originalName: "鮭魚握壽司", newName: "鮭魚握壽司-", categoryName: "1壽司刺身", subcategoryName: "手卷/壽司（菜單）"},
  {originalName: "鮭魚握壽司/2貫", newName: "鮭魚握壽司/2貫-", categoryName: "1壽司刺身", subcategoryName: "手卷/壽司（菜單）"},
  {originalName: "鮮蝦蘆筍手卷", newName: "鮮蝦蘆筍手卷-", categoryName: "1壽司刺身", subcategoryName: "手卷/壽司（菜單）"},
  {originalName: "鮮蝦蘆筍手卷/支", newName: "鮮蝦蘆筍手卷-", categoryName: "1壽司刺身", subcategoryName: "手卷/壽司（菜單）"},
  {originalName: "醬煮星鰻/貫", newName: "醬煮星鰻/貫-", categoryName: "1壽司刺身", subcategoryName: "手卷/壽司（菜單）"},
  {originalName: "醬煮星鰻握壽司/2貫", newName: "醬煮星鰻握壽司/2貫-", categoryName: "1壽司刺身", subcategoryName: "手卷/壽司（菜單）"},
  {originalName: "醬煮星鰻握壽司/2貫*", newName: "醬煮星鰻握壽司/2貫-", categoryName: "1壽司刺身", subcategoryName: "手卷/壽司（菜單）"},
  {originalName: "醬漬鮭魚卵/貫", newName: "醬漬鮭魚卵/貫-", categoryName: "1壽司刺身", subcategoryName: "手卷/壽司（菜單）"},
  {originalName: "醬燒星鰻握壽司/貫", newName: "醬燒星鰻握壽司/貫-", categoryName: "1壽司刺身", subcategoryName: "手卷/壽司（菜單）"},
  {originalName: "鵝肝/貫", newName: "鵝肝/貫-", categoryName: "1壽司刺身", subcategoryName: "手卷/壽司（菜單）"}
]

async function importProductsMaster() {
  try {
    console.log('開始匯入商品主檔資料...')
    
    // 1. 首先清理現有的商品主檔資料
    console.log('清理現有商品主檔資料...')
    const { error: deleteError } = await supabase
      .from('products')
      .delete()
      .neq('id', 0)
    
    if (deleteError) {
      console.error('清理現有資料失敗:', deleteError)
      return
    }

    // 2. 取得所有分類資料
    console.log('取得分類資料...')
    const { data: categories } = await supabase
      .from('categories')
      .select('id, name')
    
    const { data: subcategories } = await supabase
      .from('subcategories')
      .select('id, name, category_id')
    
    console.log('分類數量:', categories?.length)
    console.log('子分類數量:', subcategories?.length)

    // 3. 建立分類對應表
    const categoryMap = new Map()
    const subcategoryMap = new Map()
    
    categories?.forEach(cat => {
      categoryMap.set(cat.name, cat.id)
    })
    
    subcategories?.forEach(subcat => {
      subcategoryMap.set(subcat.name, { id: subcat.id, category_id: subcat.category_id })
    })

    // 4. 批次匯入商品資料
    console.log('開始匯入商品資料...')
    let successCount = 0
    let errorCount = 0
    
    for (const product of productsData) {
      try {
        // 處理分類名稱對應
        let actualCategoryName = product.categoryName
        if (actualCategoryName.startsWith('1')) {
          actualCategoryName = actualCategoryName.substring(1)
        }
        
        const categoryId = categoryMap.get(actualCategoryName)
        const subcategoryData = subcategoryMap.get(product.subcategoryName)
        
        if (!categoryId) {
          console.warn(`找不到分類: ${actualCategoryName} (原始: ${product.categoryName})`)
          errorCount++
          continue
        }
        
        const productData = {
          original_name: product.originalName,
          new_name: product.newName,
          category_id: categoryId,
          subcategory_id: subcategoryData?.id || null
        }
        
        const { error } = await supabase
          .from('products')
          .insert([productData])
        
        if (error) {
          console.error(`匯入商品失敗: ${product.originalName}`, error)
          errorCount++
        } else {
          successCount++
        }
        
        // 每100筆顯示一次進度
        if ((successCount + errorCount) % 100 === 0) {
          console.log(`進度: ${successCount + errorCount} 筆處理完成`)
        }
        
      } catch (err) {
        console.error('處理商品時發生錯誤:', err)
        errorCount++
      }
    }
    
    console.log('=== 匯入完成 ===')
    console.log(`成功匯入: ${successCount} 筆`)
    console.log(`失敗: ${errorCount} 筆`)
    console.log(`總計處理: ${successCount + errorCount} 筆`)
    
  } catch (error) {
    console.error('匯入過程發生錯誤:', error)
  }
}

// 執行匯入
if (require.main === module) {
  importProductsMaster()
}

module.exports = { importProductsMaster }