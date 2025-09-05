import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const month = searchParams.get('month')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // 建立日期篩選條件
    let dateFilter = ''
    if (month) {
      const startOfMonth = `${month}-01`
      const endOfMonth = new Date(new Date(month).getFullYear(), new Date(month).getMonth() + 1, 0).toISOString().split('T')[0]
      dateFilter = `checkout_time >= '${startOfMonth}' AND checkout_time <= '${endOfMonth} 23:59:59'`
    } else {
      const conditions = []
      if (startDate) conditions.push(`checkout_time >= '${startDate}'`)
      if (endDate) conditions.push(`checkout_time <= '${endDate} 23:59:59'`)
      dateFilter = conditions.join(' AND ')
    }

    // 1. 訂單統計
    const { data: orderStats, error: orderError } = await supabase
      .from('orders')
      .select(`
        id,
        invoice_number,
        checkout_time,
        order_source,
        payment_module,
        invoice_amount,
        customer_name
      `)
      .not('checkout_time', 'is', null)
      .gte('checkout_time', dateFilter ? undefined : '1900-01-01')
      .lte('checkout_time', dateFilter ? undefined : '2100-12-31')
    
    if (orderError) {
      console.error('查詢訂單統計失敗:', orderError)
      return NextResponse.json({ error: '查詢訂單統計失敗' }, { status: 500 })
    }

    // 2. 商品銷售統計
    const { data: productStats, error: productError } = await supabase
      .from('product_sales')
      .select(`
        id,
        product_name,
        invoice_number,
        invoice_amount,
        checkout_time,
        order_source
      `)
      .not('checkout_time', 'is', null)

    if (productError) {
      console.error('查詢商品統計失敗:', productError)
      return NextResponse.json({ error: '查詢商品統計失敗' }, { status: 500 })
    }

    // 3. 手動篩選資料（因為Supabase的動態查詢限制）
    const filteredOrders = orderStats?.filter(order => {
      if (!order.checkout_time) return false
      const orderDate = new Date(order.checkout_time)
      
      if (month) {
        const orderMonth = `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, '0')}`
        return orderMonth === month
      } else {
        let valid = true
        if (startDate && orderDate < new Date(startDate)) valid = false
        if (endDate && orderDate > new Date(`${endDate} 23:59:59`)) valid = false
        return valid
      }
    }) || []

    const filteredProducts = productStats?.filter(product => {
      if (!product.checkout_time) return false
      const productDate = new Date(product.checkout_time)
      
      if (month) {
        const productMonth = `${productDate.getFullYear()}-${String(productDate.getMonth() + 1).padStart(2, '0')}`
        return productMonth === month
      } else {
        let valid = true
        if (startDate && productDate < new Date(startDate)) valid = false
        if (endDate && productDate > new Date(`${endDate} 23:59:59`)) valid = false
        return valid
      }
    }) || []

    // 4. 計算綜合統計
    const totalOrders = filteredOrders.length
    const totalProducts = filteredProducts.length
    const totalRevenue = filteredProducts.reduce((sum, product) => sum + (product.invoice_amount || 0), 0)
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0

    // 5. 來源分析
    const sourceAnalysis = filteredOrders.reduce((acc: Record<string, number>, order) => {
      const source = order.order_source || '未知'
      acc[source] = (acc[source] || 0) + 1
      return acc
    }, {})

    // 6. 支付方式分析
    const paymentAnalysis = filteredOrders.reduce((acc: Record<string, number>, order) => {
      const payment = order.payment_module || '未知'
      acc[payment] = (acc[payment] || 0) + 1
      return acc
    }, {})

    // 7. 熱門商品 (前10名)
    const productAnalysis = filteredProducts.reduce((acc: Record<string, {count: number, revenue: number}>, product) => {
      const name = product.product_name || '未知商品'
      if (!acc[name]) {
        acc[name] = { count: 0, revenue: 0 }
      }
      acc[name].count += 1
      acc[name].revenue += product.invoice_amount || 0
      return acc
    }, {})

    const topProducts = Object.entries(productAnalysis)
      .map(([name, stats]) => ({ name, ...stats }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)

    // 8. 日期趨勢分析
    const dailyTrends = filteredProducts.reduce((acc: Record<string, {orders: number, revenue: number, products: number}>, product) => {
      if (!product.checkout_time) return acc
      
      const date = new Date(product.checkout_time).toISOString().split('T')[0]
      if (!acc[date]) {
        acc[date] = { orders: 0, revenue: 0, products: 0 }
      }
      
      acc[date].products += 1
      acc[date].revenue += product.invoice_amount || 0
      
      return acc
    }, {})

    // 計算每日訂單數
    filteredOrders.forEach(order => {
      if (!order.checkout_time) return
      const date = new Date(order.checkout_time).toISOString().split('T')[0]
      if (dailyTrends[date]) {
        dailyTrends[date].orders += 1
      }
    })

    const trendData = Object.entries(dailyTrends)
      .map(([date, stats]) => ({ date, ...stats }))
      .sort((a, b) => a.date.localeCompare(b.date))

    return NextResponse.json({
      summary: {
        totalOrders,
        totalProducts,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        averageOrderValue: Math.round(averageOrderValue * 100) / 100
      },
      analysis: {
        sourceAnalysis,
        paymentAnalysis,
        topProducts,
        trendData
      },
      period: {
        month,
        startDate,
        endDate
      }
    })

  } catch (error) {
    console.error('處理綜合銷售報表時發生錯誤:', error)
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 })
  }
}