import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: Request) {
  try {
    const { name, category_id } = await request.json()

    if (!name || !category_id) {
      return NextResponse.json({ error: '缺少必要參數' }, { status: 400 })
    }

    // 新增子分類
    const { data, error } = await supabase
      .from('subcategories')
      .insert({ name, category_id })
      .select()
      .single()

    if (error) {
      console.error('新增子分類失敗:', error)
      return NextResponse.json({ error: '新增子分類失敗' }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })

  } catch (error) {
    console.error('處理子分類新增時發生錯誤:', error)
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 })
  }
}