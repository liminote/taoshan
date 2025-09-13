import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// 分析存檔資料結構
interface AnalysisArchive {
  id: string
  title: string
  content: string
  createdAt: string
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const id = searchParams.get('id')

    // 如果指定 ID，返回單一檔案詳情
    if (id) {
      const { data: archive, error } = await supabase
        .from('analysis_archives')
        .select('*')
        .eq('id', id)
        .single()

      if (error || !archive) {
        console.error('Supabase error:', error)
        return NextResponse.json({ error: '找不到指定的分析檔案' }, { status: 404 })
      }

      const formattedArchive = {
        id: archive.id,
        title: archive.title,
        content: archive.content,
        createdAt: archive.created_at
      }

      return NextResponse.json({ success: true, data: formattedArchive })
    }

    // 處理搜尋
    let query = supabase
      .from('analysis_archives')
      .select('id, title, created_at')
    
    if (search) {
      // 使用全文搜索或基本文字搜索
      query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%`)
    }

    // 按建立時間排序 (最新的在前)
    query = query.order('created_at', { ascending: false })

    const { data: archives, error } = await query

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json({ error: '獲取分析存檔失敗' }, { status: 500 })
    }

    const formattedArchives = archives?.map(item => ({
      id: item.id,
      title: item.title,
      createdAt: item.created_at
    })) || []

    return NextResponse.json({
      success: true,
      data: formattedArchives
    })

  } catch (error) {
    console.error('獲取分析存檔失敗:', error)
    return NextResponse.json({ error: '獲取分析存檔失敗' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { title, content } = await request.json()

    if (!title || !content) {
      return NextResponse.json({ error: '標題和內容為必填欄位' }, { status: 400 })
    }

    const { data: newArchive, error } = await supabase
      .from('analysis_archives')
      .insert([
        {
          title,
          content
        }
      ])
      .select()
      .single()

    if (error) {
      console.error('Supabase insert error:', error)
      return NextResponse.json({ 
        error: '儲存分析檔案失敗', 
        details: error.message,
        code: error.code 
      }, { status: 500 })
    }

    const formattedArchive = {
      id: newArchive.id,
      title: newArchive.title,
      content: newArchive.content,
      createdAt: newArchive.created_at
    }

    return NextResponse.json({ 
      success: true, 
      message: '分析檔案已成功儲存',
      data: formattedArchive 
    })

  } catch (error) {
    console.error('儲存分析檔案失敗:', error)
    return NextResponse.json({ 
      error: '儲存分析檔案失敗', 
      details: error instanceof Error ? error.message : '未知錯誤' 
    }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const { title, content } = await request.json()

    if (!id) {
      return NextResponse.json({ error: '缺少檔案 ID' }, { status: 400 })
    }

    if (!title || !content) {
      return NextResponse.json({ error: '標題和內容為必填欄位' }, { status: 400 })
    }

    const { data: updatedArchive, error } = await supabase
      .from('analysis_archives')
      .update({
        title,
        content
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Supabase update error:', error)
      return NextResponse.json({ error: '更新分析檔案失敗' }, { status: 500 })
    }

    if (!updatedArchive) {
      return NextResponse.json({ error: '找不到指定的分析檔案' }, { status: 404 })
    }

    const formattedArchive = {
      id: updatedArchive.id,
      title: updatedArchive.title,
      content: updatedArchive.content,
      createdAt: updatedArchive.created_at
    }

    return NextResponse.json({ 
      success: true, 
      message: '分析檔案已更新',
      data: formattedArchive
    })

  } catch (error) {
    console.error('更新分析檔案失敗:', error)
    return NextResponse.json({ error: '更新分析檔案失敗' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: '缺少檔案 ID' }, { status: 400 })
    }

    const { data: deletedArchive, error } = await supabase
      .from('analysis_archives')
      .delete()
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Supabase delete error:', error)
      return NextResponse.json({ error: '刪除分析檔案失敗' }, { status: 500 })
    }

    if (!deletedArchive) {
      return NextResponse.json({ error: '找不到指定的分析檔案' }, { status: 404 })
    }

    return NextResponse.json({ 
      success: true, 
      message: '分析檔案已刪除' 
    })

  } catch (error) {
    console.error('刪除分析檔案失敗:', error)
    return NextResponse.json({ error: '刪除分析檔案失敗' }, { status: 500 })
  }
}