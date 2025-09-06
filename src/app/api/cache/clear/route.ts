import { NextResponse } from 'next/server'
import { cache } from '../../../../lib/cache'

export async function POST() {
  try {
    // 清除所有緩存
    cache.clear()
    console.log('已清除所有緩存資料')
    
    return NextResponse.json({
      success: true,
      message: '所有緩存已清除，下次讀取將從 Google Sheets 重新載入最新資料'
    })
  } catch (error) {
    console.error('清除緩存時發生錯誤:', error)
    return NextResponse.json({ error: '清除緩存失敗' }, { status: 500 })
  }
}