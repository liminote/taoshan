import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

interface ImportantItem {
  id: string
  date: string
  content: string
  assignee: string
  completed: boolean
  completed_at?: string
  created_at: string
}

export async function GET() {
  try {
    const { data: importantItems, error } = await supabase
      .from('important_items')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json({ error: '獲取重要事項失敗' }, { status: 500 })
    }

    // Convert Supabase format to expected format
    const formattedItems = importantItems?.map(item => ({
      id: item.id,
      date: item.date,
      content: item.content,
      assignee: item.assignee,
      completed: item.completed,
      completedAt: item.completed_at,
      createdAt: item.created_at
    })) || []

    return NextResponse.json({
      success: true,
      data: formattedItems
    })
  } catch (error) {
    console.error('獲取重要事項失敗:', error)
    return NextResponse.json({ error: '獲取重要事項失敗' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { action, data } = await request.json()
    
    if (action === 'add') {
      const { date, content, assignee } = data
      
      if (!date || !content || !assignee) {
        return NextResponse.json({ error: '日期、內容和負責人為必填' }, { status: 400 })
      }
      
      const { data: newItem, error } = await supabase
        .from('important_items')
        .insert([
          {
            date,
            content,
            assignee,
            completed: false
          }
        ])
        .select()
        .single()

      if (error) {
        console.error('Supabase insert error:', error)
        return NextResponse.json({ error: '新增重要事項失敗' }, { status: 500 })
      }

      const formattedItem = {
        id: newItem.id,
        date: newItem.date,
        content: newItem.content,
        assignee: newItem.assignee,
        completed: newItem.completed,
        completedAt: newItem.completed_at,
        createdAt: newItem.created_at
      }
      
      return NextResponse.json({
        success: true,
        message: '重要事項已新增',
        data: formattedItem
      })
      
    } else if (action === 'update') {
      const { id, date, content, assignee } = data
      
      const { data: updatedItem, error } = await supabase
        .from('important_items')
        .update({
          ...(date && { date }),
          ...(content && { content }),
          ...(assignee && { assignee })
        })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error('Supabase update error:', error)
        return NextResponse.json({ error: '更新重要事項失敗' }, { status: 500 })
      }

      if (!updatedItem) {
        return NextResponse.json({ error: '找不到指定的重要事項' }, { status: 404 })
      }

      const formattedItem = {
        id: updatedItem.id,
        date: updatedItem.date,
        content: updatedItem.content,
        assignee: updatedItem.assignee,
        completed: updatedItem.completed,
        completedAt: updatedItem.completed_at,
        createdAt: updatedItem.created_at
      }
      
      return NextResponse.json({
        success: true,
        message: '重要事項已更新',
        data: formattedItem
      })
      
    } else if (action === 'toggle') {
      const { id } = data
      
      // First get the current item to toggle its status
      const { data: currentItem, error: fetchError } = await supabase
        .from('important_items')
        .select('completed')
        .eq('id', id)
        .single()

      if (fetchError || !currentItem) {
        console.error('Supabase fetch error:', fetchError)
        return NextResponse.json({ error: '找不到指定的重要事項' }, { status: 404 })
      }

      const newCompleted = !currentItem.completed
      const updateData: any = { 
        completed: newCompleted 
      }
      
      if (newCompleted) {
        updateData.completed_at = new Date().toISOString()
      } else {
        updateData.completed_at = null
      }

      const { data: updatedItem, error } = await supabase
        .from('important_items')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error('Supabase toggle error:', error)
        return NextResponse.json({ error: '更新重要事項狀態失敗' }, { status: 500 })
      }

      const formattedItem = {
        id: updatedItem.id,
        date: updatedItem.date,
        content: updatedItem.content,
        assignee: updatedItem.assignee,
        completed: updatedItem.completed,
        completedAt: updatedItem.completed_at,
        createdAt: updatedItem.created_at
      }
      
      return NextResponse.json({
        success: true,
        message: updatedItem.completed ? '事項已完成' : '事項已標記為未完成',
        data: formattedItem
      })
      
    } else if (action === 'delete') {
      const { id } = data
      
      const { data: deletedItem, error } = await supabase
        .from('important_items')
        .delete()
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error('Supabase delete error:', error)
        return NextResponse.json({ error: '刪除重要事項失敗' }, { status: 500 })
      }

      if (!deletedItem) {
        return NextResponse.json({ error: '找不到指定的重要事項' }, { status: 404 })
      }

      const formattedItem = {
        id: deletedItem.id,
        date: deletedItem.date,
        content: deletedItem.content,
        assignee: deletedItem.assignee,
        completed: deletedItem.completed,
        completedAt: deletedItem.completed_at,
        createdAt: deletedItem.created_at
      }
      
      return NextResponse.json({
        success: true,
        message: '重要事項已刪除',
        data: formattedItem
      })
    }
    
    return NextResponse.json({ error: '無效的操作類型' }, { status: 400 })
    
  } catch (error) {
    console.error('處理重要事項時發生錯誤:', error)
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 })
  }
}