// 請求去重機制 - 防止相同請求同時執行
interface PendingRequest<T> {
  promise: Promise<T>
  timestamp: number
}

class RequestDeduplicator {
  private pendingRequests = new Map<string, PendingRequest<unknown>>()
  
  // 執行去重請求
  async deduplicate<T>(key: string, requestFn: () => Promise<T>): Promise<T> {
    // 檢查是否有進行中的相同請求
    const pending = this.pendingRequests.get(key)
    if (pending) {
      console.log(`♻️ 重複請求被去重: ${key}`)
      return pending.promise as Promise<T>
    }
    
    // 建立新的請求
    console.log(`🚀 開始新請求: ${key}`)
    const promise = requestFn()
    
    this.pendingRequests.set(key, {
      promise,
      timestamp: Date.now()
    })
    
    try {
      const result = await promise
      this.pendingRequests.delete(key)
      return result
    } catch (error) {
      this.pendingRequests.delete(key)
      throw error
    }
  }
  
  // 清理過期的請求（5分鐘）
  cleanup(): void {
    const now = Date.now()
    const fiveMinutes = 5 * 60 * 1000
    
    for (const [key, request] of this.pendingRequests) {
      if (now - request.timestamp > fiveMinutes) {
        this.pendingRequests.delete(key)
      }
    }
  }
}

export const requestDeduplicator = new RequestDeduplicator()

// 每 5 分鐘清理一次過期請求
if (typeof window === 'undefined') {
  setInterval(() => {
    requestDeduplicator.cleanup()
  }, 5 * 60 * 1000)
}