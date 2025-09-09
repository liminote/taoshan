import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { cache } from '@/lib/cache'

// 清除所有重要事項相關的快取
function clearImportantItemsCache() {
  const cacheKeys = [
    'important-items-pending-50',
    'important-items-all-50',
    'important-items-pending-100', 
    'important-items-all-100'
  ]
  
  cacheKeys.forEach(key => {
    cache.delete(key)
  })
  
  console.log('🗑️ 已清除重要事項相關快取')
}

interface ImportantItem {
  id: string
  date: string
  content: string
  assignee: string
  completed: boolean
  completed_at?: string
  created_at: string
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const onlyPending = url.searchParams.get('pending') === 'true'
    const limit = parseInt(url.searchParams.get('limit') || '50')
    const forceRefresh = url.searchParams.get('refresh') === 'true'

    // 生成快取鍵
    const cacheKey = `important-items-${onlyPending ? 'pending' : 'all'}-${limit}`
    
    // 檢查快取（除非強制刷新）
    if (!forceRefresh) {
      const cachedData = cache.get(cacheKey)
      if (cachedData) {
        console.log('✅ 使用快取的重要事項數據')
        return NextResponse.json({
          ...cachedData,
          cached: true,
          cacheTimestamp: cache.getTimestamp(cacheKey)
        })
      }
    }

    console.log(`🔄 從數據庫獲取重要事項 (${onlyPending ? '僅待處理' : '全部'})`)

    let query = supabase
      .from('important_items')
      .select('*')

    // 如果只需要待處理事項，直接在數據庫層過濾
    if (onlyPending) {
      query = query
        .eq('completed', false)
        .order('date', { ascending: true }) // 按日期升序，緊急的優先顯示
        .limit(limit)
    } else {
      query = query
        .order('created_at', { ascending: false })
        .limit(limit)
    }

    const { data: importantItems, error } = await query

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

    // 計算統計資訊以減少前端計算
    const stats = onlyPending ? {
      totalPending: formattedItems.length,
      overdueCount: formattedItems.filter(item => 
        new Date(item.date) < new Date()
      ).length
    } : {
      totalItems: formattedItems.length,
      completedItems: formattedItems.filter(item => item.completed).length,
      pendingItems: formattedItems.filter(item => !item.completed).length
    }

    const responseData = {
      success: true,
      data: formattedItems,
      stats,
      cached: false,
      timestamp: new Date().toISOString()
    }

    // 快取數據（30分鐘）
    cache.set(cacheKey, responseData, 30)
    console.log(`💾 已快取重要事項數據，快取鍵: ${cacheKey}`)

    return NextResponse.json(responseData)
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

      // 清除相關快取
      clearImportantItemsCache()
      
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

      // 清除相關快取
      clearImportantItemsCache()
      
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
      const updateData: { 
        completed: boolean;
        completed_at?: string | null;
      } = { 
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

      // 清除相關快取
      clearImportantItemsCache()
      
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

      // 清除相關快取
      clearImportantItemsCache()
      
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