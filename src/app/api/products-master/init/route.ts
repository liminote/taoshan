import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST() {
  try {
    console.log('🏗️ 開始初始化商品主檔資料表...')

    // 先嘗試創建資料表結構（如果已存在會被忽略）
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS products_master (
        id BIGSERIAL PRIMARY KEY,
        product_name TEXT NOT NULL UNIQUE,
        new_product_name TEXT,
        category_id BIGINT REFERENCES categories(id),
        subcategory_id BIGINT REFERENCES subcategories(id),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `

    const { error: createTableError } = await supabase.rpc('exec_sql', { 
      sql: createTableSQL 
    })

    // 如果無法執行SQL（可能是權限問題），我們繼續嘗試操作
    if (createTableError) {
      console.log('無法執行建表SQL（可能是權限問題）:', createTableError.message)
    }

    // 檢查是否已經有商品主檔資料
    const { count: existingCount, error: checkError } = await supabase
      .from('products_master')
      .select('*', { count: 'exact', head: true })

    // 如果表不存在，提供手動建立的指引
    if (checkError && checkError.message.includes('Could not find the table')) {
      return NextResponse.json({
        success: false,
        error: '需要先在 Supabase 中創建 products_master 資料表',
        sql: `
CREATE TABLE products_master (
  id BIGSERIAL PRIMARY KEY,
  product_name TEXT NOT NULL UNIQUE,
  new_product_name TEXT,
  category_id BIGINT REFERENCES categories(id),
  subcategory_id BIGINT REFERENCES subcategories(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 建立索引
CREATE INDEX IF NOT EXISTS idx_products_master_category_id ON products_master(category_id);
CREATE INDEX IF NOT EXISTS idx_products_master_subcategory_id ON products_master(subcategory_id);
CREATE INDEX IF NOT EXISTS idx_products_master_product_name ON products_master(product_name);
        `
      }, { status: 500 })
    }

    if (existingCount && existingCount > 0) {
      return NextResponse.json({
        success: true,
        message: '商品主檔資料已存在',
        productsCount: existingCount
      })
    }

    // 從現有的products表獲取所有商品，並建立商品主檔
    const { data: existingProducts } = await supabase
      .from('products')
      .select('original_name, category_id, subcategory_id')
      .not('original_name', 'is', null)

    if (existingProducts && existingProducts.length > 0) {
      // 轉換為商品主檔格式
      const masterProducts = existingProducts.map(product => ({
        product_name: product.original_name,
        new_product_name: product.original_name + '-', // 商品名稱後加「-」
        category_id: product.category_id,
        subcategory_id: product.subcategory_id
      }))

      // 插入商品主檔
      const { error: insertError } = await supabase
        .from('products_master')
        .insert(masterProducts)

      if (insertError) {
        console.error('插入商品主檔失敗:', insertError)
        return NextResponse.json({ error: '插入商品主檔失敗' }, { status: 500 })
      }

      console.log(`✅ 已初始化 ${masterProducts.length} 筆商品主檔資料`)

      return NextResponse.json({
        success: true,
        message: '商品主檔初始化完成',
        productsCount: masterProducts.length
      })
    } else {
      // 如果沒有現有商品，創建空的商品主檔表
      console.log('✅ 商品主檔資料表已準備就緒（目前無資料）')
      
      return NextResponse.json({
        success: true,
        message: '商品主檔資料表已準備就緒',
        productsCount: 0
      })
    }

  } catch (error) {
    console.error('初始化商品主檔時發生錯誤:', error)
    return NextResponse.json({ error: '初始化失敗' }, { status: 500 })
  }
}