import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    // 取得月銷售金額統計
    const { data: salesData, error } = await supabase
      .from('product_sales')
      .select(`
        checkout_time,
        invoice_amount
      `)
      .not('checkout_time', 'is', null)
      .order('checkout_time', { ascending: false })

    if (error) {
      console.error('查詢銷售資料失敗:', error)
      return NextResponse.json({ error: '查詢失敗' }, { status: 500 })
    }

    if (!salesData || salesData.length === 0) {
      return NextResponse.json([])
    }

    // 按月份分組統計
    const monthlyStats: { [key: string]: { amount: number; quantity: number } } = {}

    salesData.forEach((record) => {
      if (record.checkout_time) {
        const date = new Date(record.checkout_time)
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        
        if (!monthlyStats[monthKey]) {
          monthlyStats[monthKey] = { amount: 0, quantity: 0 }
        }
        
        monthlyStats[monthKey].amount += record.invoice_amount || 0
        monthlyStats[monthKey].quantity += 1
      }
    })

    // 轉換為陣列格式並排序
    const result = Object.entries(monthlyStats)
      .map(([month, stats]) => ({
        month: month,
        amount: Math.round(stats.amount * 100) / 100, // 四捨五入到小數點後兩位
        quantity: stats.quantity
      }))
      .sort((a, b) => b.month.localeCompare(a.month)) // 最新的月份在前

    return NextResponse.json(result)

  } catch (error) {
    console.error('處理月銷售報表時發生錯誤:', error)
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 })
  }
}