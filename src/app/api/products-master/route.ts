import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = parseInt(url.searchParams.get('limit') || '100')
    const search = url.searchParams.get('search') || ''
    const categoryId = url.searchParams.get('category_id')
    
    const offset = (page - 1) * limit

    // 建立查詢
    let query = supabase
      .from('products')
      .select(`
        *,
        categories:category_id(id, name),
        subcategories:subcategory_id(id, name)
      `, { count: 'exact' })

    // 搜尋條件
    if (search) {
      query = query.or(`original_name.ilike.%${search}%,new_name.ilike.%${search}%`)
    }

    // 分類篩選
    if (categoryId && categoryId !== 'all') {
      query = query.eq('category_id', categoryId)
    }

    // 分頁和排序
    const { data: products, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('查詢商品主檔失敗:', error)
      return NextResponse.json({ error: '查詢商品主檔失敗' }, { status: 500 })
    }

    return NextResponse.json({
      products: products || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    })

  } catch (error) {
    console.error('處理商品主檔查詢時發生錯誤:', error)
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { original_name, new_name, category_id, subcategory_id } = await request.json()

    if (!original_name) {
      return NextResponse.json({ error: '商品名稱為必填' }, { status: 400 })
    }

    // 如果沒有提供新商品名，自動生成（商品名稱 + '-'）
    const finalNewName = new_name || (original_name + '-')

    // 檢查商品名稱是否已存在
    const { data: existingProduct } = await supabase
      .from('products')
      .select('original_name')
      .eq('original_name', original_name)
      .single()

    if (existingProduct) {
      return NextResponse.json({ error: '商品名稱已存在' }, { status: 400 })
    }

    // 新增商品主檔
    const { data, error } = await supabase
      .from('products')
      .insert({
        original_name,
        new_name: finalNewName,
        category_id,
        subcategory_id
      })
      .select()
      .single()

    if (error) {
      console.error('新增商品主檔失敗:', error)
      return NextResponse.json({ error: '新增商品主檔失敗' }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })

  } catch (error) {
    console.error('處理商品主檔新增時發生錯誤:', error)
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const { id, original_name, new_name, category_id, subcategory_id } = await request.json()

    if (!id || !original_name) {
      return NextResponse.json({ error: '缺少必要參數' }, { status: 400 })
    }

    // 更新商品主檔
    const { data, error } = await supabase
      .from('products')
      .update({
        original_name,
        new_name,
        category_id,
        subcategory_id
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('更新商品主檔失敗:', error)
      return NextResponse.json({ error: '更新商品主檔失敗' }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })

  } catch (error) {
    console.error('處理商品主檔更新時發生錯誤:', error)
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url)
    const id = url.searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: '缺少商品ID' }, { status: 400 })
    }

    // 刪除商品主檔
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('刪除商品主檔失敗:', error)
      return NextResponse.json({ error: '刪除商品主檔失敗' }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('處理商品主檔刪除時發生錯誤:', error)
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 })
  }
}