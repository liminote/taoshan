import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    // 取得所有分類和子分類
    const { data: categories, error } = await supabase
      .from('categories')
      .select(`
        id,
        name,
        subcategories (
          id,
          name,
          category_id
        )
      `)
      .order('name', { ascending: true })

    if (error) {
      console.error('查詢分類失敗:', error)
      return NextResponse.json({ error: '查詢失敗' }, { status: 500 })
    }

    return NextResponse.json(categories || [])

  } catch (error) {
    console.error('處理分類查詢時發生錯誤:', error)
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { name } = await request.json()
    
    if (!name || !name.trim()) {
      return NextResponse.json({ error: '分類名稱不能為空' }, { status: 400 })
    }

    // 插入新分類
    const { data, error } = await supabase
      .from('categories')
      .insert([{ name: name.trim() }])
      .select()

    if (error) {
      if (error.code === '23505') { // unique_violation
        return NextResponse.json({ error: '分類名稱已存在' }, { status: 400 })
      }
      console.error('新增分類失敗:', error)
      return NextResponse.json({ error: '新增失敗' }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })

  } catch (error) {
    console.error('處理分類新增時發生錯誤:', error)
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 })
  }
}