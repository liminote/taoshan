import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    console.log('Testing Supabase connection...')
    
    // Test 1: Check if we can connect at all
    const { data: testData, error: testError } = await supabase
      .from('important_items')
      .select('count')
      .limit(1)
    
    if (testError) {
      console.error('Supabase connection error:', testError)
      return NextResponse.json({
        success: false,
        error: 'Connection failed',
        details: testError,
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      })
    }
    
    // Test 2: Try to select all items
    const { data: allItems, error: selectError } = await supabase
      .from('important_items')
      .select('*')
    
    return NextResponse.json({
      success: true,
      connectionTest: 'OK',
      itemsCount: allItems?.length || 0,
      items: allItems,
      selectError: selectError || null,
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    })
    
  } catch (error) {
    console.error('Debug error:', error)
    return NextResponse.json({
      success: false,
      error: 'Unexpected error',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}