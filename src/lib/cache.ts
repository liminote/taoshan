import fs from 'fs'
import path from 'path'

// 報表資料快取系統 - 支援手動刷新和檔案持久化
interface CacheItem<T> {
  data: T
  timestamp: number
  key: string
}

class ReportCache {
  private cache = new Map<string, CacheItem<unknown>>()
  private cacheDir = path.join(process.cwd(), '.cache')
  
  constructor() {
    // 確保快取目錄存在
    if (typeof window === 'undefined') {
      try {
        if (!fs.existsSync(this.cacheDir)) {
          fs.mkdirSync(this.cacheDir, { recursive: true })
        }
      } catch (error) {
        console.warn('無法創建快取目錄:', error)
      }
    }
  }

  private getCacheFilePath(key: string): string {
    return path.join(this.cacheDir, `${key.replace(/[^a-zA-Z0-9_-]/g, '_')}.json`)
  }

  // 從檔案載入快取
  private loadFromFile<T>(key: string): T | null {
    if (typeof window !== 'undefined') return null
    
    try {
      const filePath = this.getCacheFilePath(key)
      if (fs.existsSync(filePath)) {
        const fileContent = fs.readFileSync(filePath, 'utf-8')
        const item: CacheItem<T> = JSON.parse(fileContent)
        
        // 檢查快取是否在 30 分鐘內
        const now = Date.now()
        const cacheAge = now - item.timestamp
        const thirtyMinutes = 30 * 60 * 1000
        
        if (cacheAge < thirtyMinutes) {
          this.cache.set(key, item)
          return item.data
        } else {
          // 清除過期的檔案快取
          fs.unlinkSync(filePath)
        }
      }
    } catch (error) {
      console.warn(`載入快取檔案失敗 ${key}:`, error)
    }
    return null
  }

  // 儲存到檔案
  private saveToFile<T>(key: string, data: T, timestamp: number): void {
    if (typeof window !== 'undefined') return
    
    try {
      const filePath = this.getCacheFilePath(key)
      const item: CacheItem<T> = { data, timestamp, key }
      fs.writeFileSync(filePath, JSON.stringify(item))
    } catch (error) {
      console.warn(`儲存快取檔案失敗 ${key}:`, error)
    }
  }

  // 設定快取資料（30分鐘有效期）
  set<T>(key: string, data: T): void {
    const timestamp = Date.now()
    const item: CacheItem<T> = {
      data,
      timestamp,
      key
    }
    
    this.cache.set(key, item)
    this.saveToFile(key, data, timestamp)
  }

  // 取得快取資料
  get<T>(key: string): T | null {
    // 先檢查記憶體快取
    const memoryItem = this.cache.get(key)
    if (memoryItem) {
      const now = Date.now()
      const cacheAge = now - memoryItem.timestamp
      const thirtyMinutes = 30 * 60 * 1000
      
      if (cacheAge < thirtyMinutes) {
        return memoryItem.data as T
      } else {
        // 清除過期的記憶體快取
        this.cache.delete(key)
      }
    }
    
    // 嘗試從檔案載入
    return this.loadFromFile<T>(key)
  }

  // 檢查是否有快取
  has(key: string): boolean {
    return this.get(key) !== null
  }

  // 清除指定快取或全部快取
  clear(key?: string): void {
    if (key) {
      this.cache.delete(key)
      // 清除檔案快取
      if (typeof window === 'undefined') {
        try {
          const filePath = this.getCacheFilePath(key)
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath)
          }
        } catch (error) {
          console.warn(`清除快取檔案失敗 ${key}:`, error)
        }
      }
    } else {
      this.cache.clear()
      // 清除所有檔案快取
      if (typeof window === 'undefined') {
        try {
          if (fs.existsSync(this.cacheDir)) {
            const files = fs.readdirSync(this.cacheDir)
            files.forEach(file => {
              if (file.endsWith('.json')) {
                fs.unlinkSync(path.join(this.cacheDir, file))
              }
            })
          }
        } catch (error) {
          console.warn('清除所有快取檔案失敗:', error)
        }
      }
    }
  }

  // 取得快取時間戳
  getTimestamp(key: string): number | null {
    const item = this.cache.get(key) || this.loadFromFile(key)
    return item ? (item as any).timestamp : null
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
  PRODUCT_SALES: 'product_sales',
  CUSTOMER_SPENDING_RANKING: 'customer_spending_ranking',
  CUSTOMER_FREQUENCY_RANKING: 'customer_frequency_ranking'
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