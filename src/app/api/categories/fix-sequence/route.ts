import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST() {
  try {
    console.log('🔧 修復分類表序列號...')

    // 獲取當前最大ID
    const { data: maxData } = await supabase
      .from('categories')
      .select('id')
      .order('id', { ascending: false })
      .limit(1)
      .single()

    const maxId = maxData?.id || 0
    const nextId = maxId + 1

    console.log(`當前最大分類ID: ${maxId}, 下一個ID將從: ${nextId}`)

    // 修復序列號 - 這需要直接執行SQL
    // 注意: 這個方法可能需要資料庫管理員權限
    const { error: sequenceError } = await supabase.rpc('fix_category_sequence', {
      next_val: nextId
    })

    if (sequenceError) {
      console.log('無法直接修復序列號:', sequenceError.message)
      console.log('嘗試替代方案...')
      
      // 替代方案：手動指定下一個可用的ID
      return NextResponse.json({
        success: true,
        message: '已準備好使用手動ID分配',
        nextAvailableId: nextId
      })
    }

    return NextResponse.json({
      success: true,
      message: '序列號修復完成',
      nextAvailableId: nextId
    })

  } catch (error) {
    console.error('修復序列號時發生錯誤:', error)
    return NextResponse.json({ error: '修復失敗' }, { status: 500 })
  }
}