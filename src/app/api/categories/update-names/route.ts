import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST() {
  try {
    console.log('🔄 開始更新分類名稱為帶數字格式...')

    // 更新每個分類名稱
    const updates = [
      { id: 1, oldName: '壽司刺身', newName: '1壽司刺身' },
      { id: 2, oldName: '黑板料理', newName: '2黑板料理' },
      { id: 3, oldName: '烤炸串', newName: '3烤炸串' },
      { id: 4, oldName: '配菜', newName: '4配菜' },
      { id: 5, oldName: '主食', newName: '5主食' },
      { id: 6, oldName: '酒水', newName: '6酒水' },
      { id: 7, oldName: '便當', newName: '7便當' },
      { id: 8, oldName: '外帶送', newName: '8外帶送' },
      { id: 9, oldName: '其他', newName: '9其他' }
    ]

    let updatedCount = 0
    for (const update of updates) {
      const { error } = await supabase
        .from('categories')
        .update({ name: update.newName })
        .eq('id', update.id)
        .eq('name', update.oldName)

      if (error) {
        console.error(`更新分類 ${update.oldName} -> ${update.newName} 失敗:`, error)
      } else {
        console.log(`✅ 更新分類: ${update.oldName} -> ${update.newName}`)
        updatedCount++
      }
    }

    console.log(`✅ 分類名稱更新完成：${updatedCount} 個分類已更新`)

    return NextResponse.json({
      success: true,
      message: `分類名稱更新完成，${updatedCount} 個分類已更新`,
      updatedCount
    })

  } catch (error) {
    console.error('更新分類名稱時發生錯誤:', error)
    return NextResponse.json({ error: '更新失敗' }, { status: 500 })
  }
}