import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

interface Params {
  id: string
}

export async function DELETE(request: Request, { params }: { params: Params }) {
  try {
    const id = parseInt(params.id)
    
    if (isNaN(id)) {
      return NextResponse.json({ error: '無效的分類 ID' }, { status: 400 })
    }

    // 刪除分類（會自動刪除相關的小分類，因為有 ON DELETE CASCADE）
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('刪除分類失敗:', error)
      return NextResponse.json({ error: '刪除失敗' }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('處理分類刪除時發生錯誤:', error)
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 })
  }
}