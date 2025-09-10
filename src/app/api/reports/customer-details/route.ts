import { NextRequest, NextResponse } from 'next/server'

interface OrderItem {
  name: string
  price: string
  quantity: number
}

interface OrderDetail {
  orderId: string
  orderTime: string
  items: OrderItem[]
  totalAmount: number
}

interface CustomerDetailsResponse {
  customerName: string
  customerPhone: string
  month: string
  orders: OrderDetail[]
  summary: {
    totalOrders: number
    totalAmount: number
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const phone = searchParams.get('phone')
    const month = searchParams.get('month')
    
    if (!phone || !month) {
      return NextResponse.json({ error: '請提供客戶電話和月份參數' }, { status: 400 })
    }


    // Google Sheets 訂單資料
    const orderSheetUrl = 'https://docs.google.com/spreadsheets/d/1EWPECWQp_Ehz43Lfks_I8lcvEig8gV9DjyjEIzC5EO4/export?format=csv&gid=0'
    
    const orderResponse = await fetch(orderSheetUrl)

    if (!orderResponse.ok) {
      return NextResponse.json({ error: '查詢失敗' }, { status: 500 })
    }

    const orderCsv = await orderResponse.text()

    // 解析訂單 CSV 資料
    const orderLines = orderCsv.split('\n').filter(line => line.trim())
    const orderHeaders = orderLines[0].split(',').map(h => h.replace(/"/g, '').trim())
    
    // 找到需要的欄位索引
    const checkoutTimeIndex = orderHeaders.findIndex(h => h.includes('結帳時間'))
    const customerNameIndex = orderHeaders.findIndex(h => h.includes('顧客姓名'))
    const customerPhoneIndex = orderHeaders.findIndex(h => h.includes('顧客電話'))
    const originalOrderIdIndex = orderHeaders.findIndex(h => h.includes('原始單號'))
    const itemsIndex = orderHeaders.findIndex(h => h.includes('品項'))
    const invoiceAmountIndex = orderHeaders.findIndex(h => h.includes('結帳金額'))


    const orderData = orderLines.slice(1).map((line, index) => {
      // 使用正則表達式來更準確地解析CSV，處理引號內的逗號
      const csvRegex = /,(?=(?:[^"]*"[^"]*")*[^"]*$)/
      const values = line.split(csvRegex).map(v => v.replace(/^"|"$/g, '').trim())
      
      const record = {
        checkout_time: values[checkoutTimeIndex],
        customer_name: values[customerNameIndex] || '',
        customer_phone: values[customerPhoneIndex] || '',
        original_order_id: values[originalOrderIdIndex] || '',
        items: values[itemsIndex] || '',
        invoice_amount: parseFloat(values[invoiceAmountIndex]) || 0
      }
      
      
      return record
    }).filter(record => 
      record.checkout_time && 
      record.checkout_time !== '' && 
      record.customer_phone === phone
    )

    // 篩選指定月份的訂單
    const monthlyOrders = orderData.filter(record => {
      const dateStr = record.checkout_time.replace(/\//g, '-')
      const date = new Date(dateStr)
      
      if (!isNaN(date.getTime())) {
        const orderMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        return orderMonth === month
      }
      return false
    })


    if (monthlyOrders.length === 0) {
      return NextResponse.json({
        customerName: '',
        customerPhone: phone,
        month: month,
        orders: [],
        summary: {
          totalOrders: 0,
          totalItems: 0,
          totalAmount: 0
        }
      })
    }

    // 解析品項字串並建立訂單明細，合併相同商品和價格
    function parseOrderItems(itemsString: string): OrderItem[] {
      if (!itemsString) return []
      
      const itemsMap = new Map<string, OrderItem>()
      
      itemsString.split(',').forEach(item => {
        const trimmedItem = item.trim()
        const lastSpaceIndex = trimmedItem.lastIndexOf(' $')
        
        if (lastSpaceIndex !== -1) {
          const name = trimmedItem.substring(0, lastSpaceIndex)
          const priceStr = trimmedItem.substring(lastSpaceIndex + 2) // 去除 " $"
          const price = parseFloat(priceStr).toString() // 這樣會自動移除 .0
          
          // 使用商品名稱+價格作為唯一key（相同商品不同價格分開統計）
          const key = `${name}|${price}`
          
          if (itemsMap.has(key)) {
            itemsMap.get(key)!.quantity += 1
          } else {
            itemsMap.set(key, { name, price, quantity: 1 })
          }
        }
      })
      
      // 依照商品定價由高至低排序
      return Array.from(itemsMap.values()).sort((a, b) => parseFloat(b.price) - parseFloat(a.price))
    }

    const orders: OrderDetail[] = monthlyOrders.map(record => {
      const items = parseOrderItems(record.items)
      const itemsPriceSum = items.reduce((sum, item) => sum + parseFloat(item.price), 0)
      const actualAmount = record.invoice_amount || 0  // 使用原始結帳金額
      
      
      return {
        orderId: record.original_order_id || '無編號',
        orderTime: record.checkout_time,
        items: items,
        totalAmount: actualAmount  // 使用實際結帳金額
      }
    })

    // 計算統計資訊
    const totalOrders = orders.length
    const totalAmount = orders.reduce((sum, order) => sum + order.totalAmount, 0)
    

    const result: CustomerDetailsResponse = {
      customerName: monthlyOrders[0].customer_name,
      customerPhone: phone,
      month: month,
      orders: orders.sort((a, b) => new Date(b.orderTime).getTime() - new Date(a.orderTime).getTime()), // 最新在前
      summary: {
        totalOrders,
        totalAmount: Math.round(totalAmount * 100) / 100
      }
    }


    return NextResponse.json({
      success: true,
      data: result
    })

  } catch (error) {
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 })
  }
}