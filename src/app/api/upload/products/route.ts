import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: Request) {
  try {
    const { data: excelData } = await request.json()
    
    if (!Array.isArray(excelData) || excelData.length === 0) {
      return NextResponse.json({ error: '無效的資料格式' }, { status: 400 })
    }

    // 批量插入商品銷售資料
    const salesData = excelData.map((row: any) => ({
      product_original_name: row['商品名稱'] || '',
      invoice_number: row['發票號碼'] || '',
      carrier_code: row['載具／捐贈碼'] || '',
      checkout_time: row['結帳時間'] ? new Date(row['結帳時間']).toISOString() : null,
      order_number: row['原始單號'] || '',
      external_order_number: row['外部單號'] || '',
      order_source: row['訂單來源'] || '',
      order_type: row['訂單種類'] || '',
      table_number: row['桌號'] || '',
      invoice_amount: parseFloat(row['發票金額'] || '0'),
      current_status: row['目前概況'] || ''
    }))

    // 插入商品銷售資料
    const { error: salesError } = await supabase
      .from('product_sales')
      .insert(salesData)

    if (salesError) {
      console.error('插入商品銷售資料失敗:', salesError)
      return NextResponse.json({ error: '插入商品銷售資料失敗' }, { status: 500 })
    }

    // 取得所有獨特的商品名稱
    const uniqueProducts = [...new Set(excelData.map((row: any) => row['商品名稱']).filter(Boolean))]
    
    // 檢查哪些商品不存在於比對表中
    const { data: existingProducts } = await supabase
      .from('products')
      .select('original_name')
      .in('original_name', uniqueProducts)

    const existingProductNames = existingProducts?.map(p => p.original_name) || []
    const newProducts = uniqueProducts.filter(name => !existingProductNames.includes(name))

    // 插入新商品到比對表
    if (newProducts.length > 0) {
      const newProductsData = newProducts.map(name => ({
        original_name: name,
        new_name: null,
        category_id: null,
        subcategory_id: null
      }))

      const { error: productsError } = await supabase
        .from('products')
        .insert(newProductsData)

      if (productsError) {
        console.error('插入新商品失敗:', productsError)
      }
    }

    return NextResponse.json({ 
      success: true, 
      processed: excelData.length,
      newProducts: newProducts.length 
    })

  } catch (error) {
    console.error('處理商品資料時發生錯誤:', error)
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 })
  }
}