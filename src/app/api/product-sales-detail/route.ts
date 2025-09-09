import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10000') // 預設獲取最近10000筆
    const startDate = searchParams.get('startDate') 
    const endDate = searchParams.get('endDate')
    const productName = searchParams.get('productName')
    
    // 建立查詢
    let query = supabase
      .from('product_sales')
      .select(`
        id,
        product_name,
        invoice_number,
        invoice_amount,
        checkout_time,
        order_source,
        quantity
      `)
      .not('checkout_time', 'is', null)
      .order('checkout_time', { ascending: false })

    // 添加篩選條件
    if (startDate) {
      query = query.gte('checkout_time', startDate)
    }
    if (endDate) {
      query = query.lte('checkout_time', `${endDate} 23:59:59`)
    }
    if (productName) {
      query = query.ilike('product_name', `%${productName}%`)
    }
    
    // 限制數量
    query = query.limit(limit)

    const { data: salesData, error } = await query

    if (error) {
      console.error('查詢銷售明細失敗:', error)
      return NextResponse.json({ error: '查詢銷售明細失敗' }, { status: 500 })
    }

    // 格式化數據添加一些計算字段
    const formattedData = salesData?.map(item => {
      const checkoutDate = new Date(item.checkout_time)
      return {
        ...item,
        checkout_date: checkoutDate.toISOString().split('T')[0],
        checkout_hour: checkoutDate.getHours(),
        day_of_week: checkoutDate.getDay(), // 0=Sunday, 1=Monday, ...
        day_name: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][checkoutDate.getDay()],
        month: `${checkoutDate.getFullYear()}-${String(checkoutDate.getMonth() + 1).padStart(2, '0')}`,
        year: checkoutDate.getFullYear()
      }
    }) || []

    // 提供統計摘要
    const totalRecords = formattedData.length
    const totalAmount = formattedData.reduce((sum, item) => sum + (item.invoice_amount || 0), 0)
    const uniqueProducts = [...new Set(formattedData.map(item => item.product_name))].length
    const dateRange = totalRecords > 0 ? {
      earliest: formattedData[totalRecords - 1]?.checkout_date,
      latest: formattedData[0]?.checkout_date
    } : null

    return NextResponse.json({
      success: true,
      summary: {
        totalRecords,
        totalAmount: Math.round(totalAmount * 100) / 100,
        uniqueProducts,
        dateRange
      },
      data: formattedData,
      message: `已獲取 ${totalRecords} 筆銷售明細記錄`
    })

  } catch (error) {
    console.error('處理銷售明細查詢時發生錯誤:', error)
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 })
  }
}