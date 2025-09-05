import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    // 獲取所有主分類
    const { data: categories, error: categoriesError } = await supabase
      .from('categories')
      .select('*')
      .order('id')

    if (categoriesError) {
      console.error('查詢主分類失敗:', categoriesError)
      return NextResponse.json({ error: '查詢主分類失敗' }, { status: 500 })
    }

    // 獲取所有子分類
    const { data: subcategories, error: subcategoriesError } = await supabase
      .from('subcategories')
      .select('*')
      .order('category_id, id')

    if (subcategoriesError) {
      console.error('查詢子分類失敗:', subcategoriesError)
      return NextResponse.json({ error: '查詢子分類失敗' }, { status: 500 })
    }

    // 組合主分類和子分類
    const categoriesWithSubcategories = categories?.map(category => ({
      ...category,
      subcategories: subcategories?.filter(sub => sub.category_id === category.id) || []
    })) || []

    return NextResponse.json(categoriesWithSubcategories)

  } catch (error) {
    console.error('處理分類查詢時發生錯誤:', error)
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { name, type } = await request.json()

    if (!name || !type) {
      return NextResponse.json({ error: '缺少必要參數' }, { status: 400 })
    }

    if (type === 'category') {
      // 獲取下一個可用的ID
      const { data: maxData } = await supabase
        .from('categories')
        .select('id')
        .order('id', { ascending: false })
        .limit(1)

      const nextId = (maxData && maxData.length > 0) ? maxData[0].id + 1 : 1

      // 新增主分類 - 手動指定ID
      const { data, error } = await supabase
        .from('categories')
        .insert({ id: nextId, name })
        .select()
        .single()

      if (error) {
        console.error('新增主分類失敗:', error)
        return NextResponse.json({ error: '新增主分類失敗: ' + error.message }, { status: 500 })
      }

      return NextResponse.json({ success: true, data })
    }

    return NextResponse.json({ error: '無效的類型' }, { status: 400 })

  } catch (error) {
    console.error('處理分類新增時發生錯誤:', error)
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url)
    const id = url.searchParams.get('id')
    const type = url.searchParams.get('type')

    if (!id || !type) {
      return NextResponse.json({ error: '缺少必要參數' }, { status: 400 })
    }

    if (type === 'category') {
      // 刪除主分類（會自動刪除相關子分類，因為外鍵約束）
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('刪除主分類失敗:', error)
        return NextResponse.json({ error: '刪除主分類失敗' }, { status: 500 })
      }
    } else if (type === 'subcategory') {
      // 刪除子分類
      const { error } = await supabase
        .from('subcategories')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('刪除子分類失敗:', error)
        return NextResponse.json({ error: '刪除子分類失敗' }, { status: 500 })
      }
    } else {
      return NextResponse.json({ error: '無效的類型' }, { status: 400 })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('處理分類刪除時發生錯誤:', error)
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 })
  }
}