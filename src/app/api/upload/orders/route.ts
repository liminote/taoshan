import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: Request) {
  try {
    const { data: excelData } = await request.json()
    
    if (!Array.isArray(excelData) || excelData.length === 0) {
      return NextResponse.json({ error: '無效的資料格式' }, { status: 400 })
    }

    // 批量插入訂單資料
    const ordersData = excelData.map((row: Record<string, string | number>) => ({
      order_number: row['原始單號'] || '',
      external_order_number: row['外部單號'] || '',
      invoice_number: row['發票號碼'] || '',
      carrier_code: row['載具／捐贈碼'] || '',
      checkout_time: row['結帳時間'] ? new Date(row['結帳時間']).toISOString() : null,
      order_source: row['訂單來源'] || '',
      order_type: row['訂單種類'] || '',
      table_number: row['桌號'] || '',
      service_fee: parseFloat(row['服務費'] || '0'),
      shipping_fee: parseFloat(row['運費'] || '0'),
      discount_amount: parseFloat(row['折扣金額細項'] || '0'),
      invoice_amount: parseFloat(row['發票金額'] || '0'),
      payment_module: row['支付模組'] || '',
      payment_info: row['付款資訊'] || '',
      payment_note: row['支付備註'] || '',
      current_status: row['目前概況'] || '',
      customer_name: row['顧客姓名'] || '',
      customer_phone: row['顧客電話'] || '',
      order_note: row['訂單備註'] || '',
      items: row['品項'] || '',
      orderer: row['訂購人'] || '',
      orderer_phone: row['訂購人電話'] || ''
    }))

    // 插入訂單資料
    const { error: ordersError } = await supabase
      .from('orders')
      .insert(ordersData)

    if (ordersError) {
      console.error('插入訂單資料失敗:', ordersError)
      return NextResponse.json({ error: '插入訂單資料失敗' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      processed: excelData.length 
    })

  } catch (error) {
    console.error('處理訂單資料時發生錯誤:', error)
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 })
  }
}