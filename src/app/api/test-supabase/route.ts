import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    console.log('Testing Supabase connection...')
    console.log('SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
    console.log('SUPABASE_KEY exists:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    
    // 測試簡單的查詢
    const { data, error } = await supabase
      .from('important_items')
      .select('count')
      .limit(1)
    
    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json({
        error: 'Supabase connection failed',
        details: error.message,
        code: error.code,
        hint: error.hint
      })
    }
    
    return NextResponse.json({
      success: true,
      message: 'Supabase connection working',
      data: data
    })
    
  } catch (error) {
    console.error('Test error:', error)
    return NextResponse.json({
      error: 'Test failed',
      details: error instanceof Error ? error.message : '未知錯誤'
    })
  }
}