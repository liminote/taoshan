// 清除商品主檔資料
const { supabase } = require('./supabase-client')

async function clearProducts() {
  try {
    console.log('🗑️  開始清除商品主檔資料...')
    
    // 1. 先統計現有資料數量
    const { count: totalCount, error: countError } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
    
    if (countError) {
      console.error('查詢商品總數失敗:', countError)
      return
    }
    
    console.log(`📊 發現 ${totalCount} 筆商品資料`)
    
    if (totalCount === 0) {
      console.log('✅ 資料表已經是空的')
      return
    }

    // 2. 清除所有資料
    console.log('🧹 開始清除資料...')
    const { error: deleteError } = await supabase
      .from('products')
      .delete()
      .neq('id', 0) // 刪除所有記錄（id 不等於 0，實際上會刪除所有）
    
    if (deleteError) {
      console.error('清除資料失敗:', deleteError)
      return
    }
    
    // 3. 驗證清除結果
    const { count: remainingCount, error: verifyError } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
    
    if (verifyError) {
      console.error('驗證清除結果失敗:', verifyError)
      return
    }
    
    console.log('=== ✅ 清除完成 ===')
    console.log(`原有資料: ${totalCount} 筆`)
    console.log(`剩餘資料: ${remainingCount} 筆`)
    console.log(`已清除: ${totalCount - (remainingCount || 0)} 筆`)
    
  } catch (error) {
    console.error('💥 清除過程發生錯誤:', error)
  }
}

// 執行清除
if (require.main === module) {
  console.log('⚠️  警告：此操作將清除所有商品主檔資料！')
  console.log('⚠️  請確認你要執行此操作...')
  
  // 5秒後執行
  setTimeout(() => {
    clearProducts()
  }, 2000)
}

module.exports = { clearProducts }