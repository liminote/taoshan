import { reportCache } from './cache'
import { requestDeduplicator } from './request-deduplication'
import { normalizePhone } from './phoneUtils'

// Google Sheets 資料快取服務
export class SheetsCache {
  private static readonly CACHE_KEYS = {
    ORDER_DATA: 'sheets_order_data',
    PRODUCT_DATA: 'sheets_product_data',
    PRODUCTS_MASTER: 'sheets_products_master'
  }

  // 快取訂單資料（2小時快取）
  static async getOrderData(): Promise<any[]> {
    return requestDeduplicator.deduplicate('sheets_order_data', async () => {
      // 檢查快取
      const cached = reportCache.get<any[]>(this.CACHE_KEYS.ORDER_DATA)
      if (cached) {
        console.log('📋 使用快取的訂單資料')
        return cached
      }

      console.log('📥 從 Google Sheets 載入訂單資料...')
      const orderSheetUrl = 'https://docs.google.com/spreadsheets/d/1EWPECWQp_Ehz43Lfks_I8lcvEig8gV9DjyjEIzC5EO4/export?format=csv&gid=0'

      const response = await fetch(orderSheetUrl)
      if (!response.ok) {
        throw new Error('無法獲取訂單資料')
      }

      const orderCsv = await response.text()
      const orderLines = orderCsv.split('\n').filter(line => line.trim())
      const orderHeaders = orderLines[0].split(',').map(h => h.replace(/"/g, '').trim())

      const checkoutTimeIndex = orderHeaders.findIndex(h => h.includes('結帳時間'))
      const checkoutAmountIndex = orderHeaders.findIndex(h => h.includes('結帳金額'))
      const customerNameIndex = orderHeaders.findIndex(h => h.includes('顧客姓名'))
      const customerPhoneIndex = orderHeaders.findIndex(h => h.includes('顧客電話'))

      const orderData = orderLines.slice(1).map(line => {
        const values = line.split(',').map(v => v.replace(/"/g, '').trim())
        return {
          checkout_time: values[checkoutTimeIndex],
          invoice_amount: parseFloat(values[checkoutAmountIndex]) || 0,
          customer_name: values[customerNameIndex] || '',
          customer_phone: normalizePhone(values[customerPhoneIndex])
        }
      })

      console.log(`📊 訂單資料載入完成: ${orderData.length} 筆`)

      // 快取 2 小時
      reportCache.set(this.CACHE_KEYS.ORDER_DATA, orderData)
      return orderData
    })
  }

  // 快取商品資料（2小時快取）
  static async getProductData(): Promise<any[]> {
    return requestDeduplicator.deduplicate('sheets_product_data', async () => {
      // 檢查快取
      const cached = reportCache.get<any[]>(this.CACHE_KEYS.PRODUCT_DATA)
      if (cached) {
        console.log('📋 使用快取的商品資料')
        return cached
      }

      console.log('📥 從 Google Sheets 載入商品資料...')
      const productSheetUrl = 'https://docs.google.com/spreadsheets/d/1GeRbtCX_oHJBooYvZeRbREaSxJ4r8P8QoL-vHiSz2eo/export?format=csv&gid=0'

      const response = await fetch(productSheetUrl)
      if (!response.ok) {
        throw new Error('無法獲取商品資料')
      }

      const productCsv = await response.text()
      const productLines = productCsv.split('\n').filter(line => line.trim())
      const productHeaders = productLines[0].split(',').map(h => h.replace(/"/g, '').trim())

      const productData = productLines.slice(1).map(line => {
        const values = line.split(',').map(v => v.replace(/"/g, '').trim())
        const record: Record<string, string> = {}
        productHeaders.forEach((header, index) => {
          record[header] = values[index] || ''
        })
        return record
      }).filter(record => record['結帳時間'] && record['結帳時間'] !== '')

      console.log(`📊 商品資料載入完成: ${productData.length} 筆`)

      // 快取 2 小時
      reportCache.set(this.CACHE_KEYS.PRODUCT_DATA, productData)
      return productData
    })
  }

  // 快取商品主檔資料（4小時快取 - 變動較少）
  static async getProductsMaster(): Promise<any> {
    return requestDeduplicator.deduplicate('sheets_products_master', async () => {
      // 檢查快取
      const cached = reportCache.get<any>(this.CACHE_KEYS.PRODUCTS_MASTER)
      if (cached) {
        console.log('📋 使用快取的商品主檔資料')
        return cached
      }

      console.log('📥 從 API 載入商品主檔資料...')
      const baseUrl = process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : 'http://localhost:3000'

      const response = await fetch(`${baseUrl}/api/products-master?limit=10000`)
      if (!response.ok) {
        throw new Error('無法獲取商品主檔資料')
      }

      const productMasterData = await response.json()
      console.log(`📊 商品主檔載入完成: ${productMasterData.products?.length || 0} 筆`)

      // 快取 4 小時（商品主檔變動較少）
      reportCache.set(this.CACHE_KEYS.PRODUCTS_MASTER, productMasterData)
      return productMasterData
    })
  }

  // 清除所有 Sheets 快取
  static clearAll(): void {
    Object.values(this.CACHE_KEYS).forEach(key => {
      reportCache.clear(key)
    })
    console.log('🧹 已清除所有 Google Sheets 快取')
  }
}