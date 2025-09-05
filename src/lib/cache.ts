interface CacheItem<T> {
  data: T
  timestamp: number
  expiresAt: number
}

class MemoryCache {
  private cache = new Map<string, CacheItem<unknown>>()
  
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