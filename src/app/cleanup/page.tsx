'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function CleanupPage() {
  const [loading, setLoading] = useState(false)
  const [productsLoading, setProductsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [productsMessage, setProductsMessage] = useState('')
  const [stats, setStats] = useState<{orderCount: number, salesCount: number, productsCount: number} | null>(null)

  const clearAllData = async () => {
    if (!confirm('確定要清空所有資料嗎？這個動作無法復原！')) {
      return
    }

    setLoading(true)
    setMessage('')

    try {
      // 清空所有表格
      const response = await fetch('/api/cleanup', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      })

      if (!response.ok) {
        throw new Error('清理失敗')
      }

      const result = await response.json()
      setMessage('✅ 所有資料已清空')
      setStats({orderCount: 0, salesCount: 0, productsCount: 0})
      
    } catch (error) {
      setMessage('❌ 清理失敗: ' + (error instanceof Error ? error.message : '未知錯誤'))
    } finally {
      setLoading(false)
    }
  }

  const clearProductsData = async () => {
    if (!confirm('確定要清空所有商品主檔資料嗎？這個動作無法復原！')) {
      return
    }

    setProductsLoading(true)
    setProductsMessage('')

    try {
      const response = await fetch('/api/clear-products', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      })

      if (!response.ok) {
        throw new Error('清理商品主檔失敗')
      }

      const result = await response.json()
      setProductsMessage(`✅ 商品主檔已清空，共清除 ${result.deletedCount || 0} 筆資料`)
      
      // 更新統計
      if (stats) {
        setStats({...stats, productsCount: 0})
      }
      
    } catch (error) {
      setProductsMessage('❌ 清理商品主檔失敗: ' + (error instanceof Error ? error.message : '未知錯誤'))
    } finally {
      setProductsLoading(false)
    }
  }

  const getStats = async () => {
    try {
      const [orderRes, salesRes, productsRes] = await Promise.all([
        fetch('/api/orders?page=1&limit=1'),
        fetch('/api/products?page=1&limit=1'),
        fetch('/api/products-master?page=1&limit=1')
      ])

      const orderData = await orderRes.json()
      const salesData = await salesRes.json()
      const productsData = await productsRes.json()

      setStats({
        orderCount: orderData.total || 0,
        salesCount: salesData.total || 0,
        productsCount: productsData.pagination?.total || 0
      })
    } catch (error) {
      console.error('獲取統計失敗:', error)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        {/* 標題區域 */}
        <div className="mb-8">
          <Link 
            href="/" 
            className="inline-flex items-center text-gray-600 hover:text-red-600 transition-colors mb-6 group"
          >
            <svg className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            返回首頁
          </Link>
          
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gradient-to-r from-red-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                資料清理
              </h1>
              <p className="text-gray-600 mt-1">清理重複或錯誤的資料</p>
            </div>
          </div>
        </div>

        {/* 統計區域 */}
        <div className="bg-white/70 backdrop-blur-sm border border-white/50 rounded-2xl p-6 shadow-lg mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900">目前資料統計</h2>
            <button 
              onClick={getStats}
              className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
            >
              重新統計
            </button>
          </div>
          
          {stats ? (
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{stats.orderCount.toLocaleString()}</div>
                <div className="text-sm text-gray-600">訂單資料</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{stats.salesCount.toLocaleString()}</div>
                <div className="text-sm text-gray-600">商品銷售資料</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{stats.productsCount.toLocaleString()}</div>
                <div className="text-sm text-gray-600">商品主檔</div>
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-500">請點擊「重新統計」獲取資料數量</div>
          )}
        </div>

        {/* 清理區域 */}
        <div className="space-y-6">
          {/* 商品主檔清理 */}
          <div className="bg-white/70 backdrop-blur-sm border border-white/50 rounded-2xl p-6 shadow-lg">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                清空商品主檔
              </h2>
              <p className="text-gray-600 mb-6">
                只清除商品主檔資料，保留訂單和銷售資料
              </p>
              
              <button
                onClick={clearProductsData}
                disabled={productsLoading}
                className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-2xl hover:shadow-lg transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none text-lg font-semibold"
              >
                {productsLoading ? (
                  <>
                    <svg className="w-5 h-5 mr-2 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    清理中...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    清空商品主檔
                  </>
                )}
              </button>
            </div>
          </div>

          {/* 全部資料清理 */}
          <div className="bg-white/70 backdrop-blur-sm border border-white/50 rounded-2xl p-6 shadow-lg">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-red-500 to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                清空所有資料
              </h2>
              <p className="text-gray-600 mb-6">
                清空所有資料表，包含訂單、銷售和商品主檔
              </p>
              
              <button
                onClick={clearAllData}
                disabled={loading}
                className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-red-500 to-orange-600 text-white rounded-2xl hover:shadow-lg transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none text-lg font-semibold"
              >
                {loading ? (
                  <>
                    <svg className="w-5 h-5 mr-2 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    清理中...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    清空所有資料
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* 結果顯示 */}
        {(message || productsMessage) && (
          <div className="space-y-4">
            {/* 商品主檔清理結果 */}
            {productsMessage && (
              <div className={`p-4 rounded-2xl backdrop-blur-sm ${
                productsMessage.includes('✅')
                  ? 'bg-purple-50/70 border border-purple-200/50 text-purple-800' 
                  : 'bg-red-50/70 border border-red-200/50 text-red-800'
              }`}>
                <p className="text-center font-semibold">{productsMessage}</p>
                {productsMessage.includes('✅') && (
                  <div className="text-center mt-4 space-x-2">
                    <Link 
                      href="/bulk-import"
                      className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 12l3 3m0 0l3-3m-3 3V9" />
                      </svg>
                      批次匯入商品
                    </Link>
                    <Link 
                      href="/products-master"
                      className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                      查看商品主檔
                    </Link>
                  </div>
                )}
              </div>
            )}
            
            {/* 全部資料清理結果 */}
            {message && (
              <div className={`p-4 rounded-2xl backdrop-blur-sm ${
                message.includes('✅')
                  ? 'bg-green-50/70 border border-green-200/50 text-green-800' 
                  : 'bg-red-50/70 border border-red-200/50 text-red-800'
              }`}>
                <p className="text-center font-semibold">{message}</p>
                {message.includes('✅') && (
                  <div className="text-center mt-4">
                    <Link 
                      href="/upload"
                      className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      重新上傳資料
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* 說明 */}
        <div className="bg-amber-50/70 backdrop-blur-sm border border-amber-200/50 rounded-2xl p-4 shadow-lg">
          <div className="flex items-start space-x-3">
            <svg className="w-5 h-5 text-amber-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.732 15.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <div>
              <p className="text-amber-800 font-semibold mb-1">注意事項</p>
              <ul className="text-amber-700 text-sm space-y-1">
                <li>• 清空資料後無法復原，請確認後再執行</li>
                <li>• 建議先備份重要資料</li>
                <li>• 清空後需要重新上傳 Excel 檔案</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}