// 報表資料快取系統 - 支援手動刷新
interface CacheItem<T> {
  data: T
  timestamp: number
  key: string
}

class ReportCache {
  private cache = new Map<string, CacheItem<unknown>>()

  // 設定快取資料（不會過期，只能手動清除）
  set<T>(key: string, data: T): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      key
    })
  }

  // 取得快取資料
  get<T>(key: string): T | null {
    const item = this.cache.get(key)
    return item ? (item.data as T) : null
  }

  // 檢查是否有快取
  has(key: string): boolean {
    return this.cache.has(key)
  }

  // 清除指定快取或全部快取
  clear(key?: string): void {
    if (key) {
      this.cache.delete(key)
    } else {
      this.cache.clear()
    }
  }

  // 取得快取時間戳
  getTimestamp(key: string): number | null {
    const item = this.cache.get(key)
    return item ? item.timestamp : null
  }

  // 取得所有快取資訊
  getAll(): { key: string; timestamp: number; dataSize: number }[] {
    return Array.from(this.cache.values()).map(item => ({
      key: item.key,
      timestamp: item.timestamp,
      dataSize: JSON.stringify(item.data).length
    }))
  }
}

// 全域快取實例
export const reportCache = new ReportCache()

// 快取鍵常數
export const CACHE_KEYS = {
  MONTHLY_SALES: 'monthly_sales',
  DISCOUNT_TRENDS: 'discount_trends',
  CATEGORY_DISTRIBUTION: 'category_distribution',
  SMALL_CATEGORY_DISTRIBUTION: 'small_category_distribution',
  RANKINGS: 'rankings',
  PAYMENT_DISTRIBUTION: 'payment_distribution',
  ORDER_TYPE_DISTRIBUTION: 'order_type_distribution',
  ORDERS_FULL: 'orders_full',
  PRODUCT_SALES: 'product_sales'
} as const

// 舊的快取系統保留給其他用途
interface CacheItem2<T> {
  data: T
  timestamp: number
  expiresAt: number
}

class MemoryCache {
  private cache = new Map<string, CacheItem2<unknown>>()
  
  set<T>(key: string, data: T, ttlMinutes: number = 30): void {
    const now = Date.now()
    this.cache.set(key, {
      data,
      timestamp: now,
      expiresAt: now + (ttlMinutes * 60 * 1000)
    })
  }
  
  get<T>(key: string): T | null {
    const item = this.cache.get(key)
    
    if (!item) {
      return null
    }
    
    // 檢查是否過期
    if (Date.now() > item.expiresAt) {
      this.cache.delete(key)
      return null
    }
    
    return item.data as T
  }
  
  delete(key: string): void {
    this.cache.delete(key)
  }
  
  clear(): void {
    this.cache.clear()
  }
  
  getTimestamp(key: string): number | null {
    const item = this.cache.get(key)
    return item ? item.timestamp : null
  }
  
  has(key: string): boolean {
    const item = this.cache.get(key)
    if (!item) return false
    
    // 檢查是否過期
    if (Date.now() > item.expiresAt) {
      this.cache.delete(key)
      return false
    }
    
    return true
  }
}

export const cache = new MemoryCache()