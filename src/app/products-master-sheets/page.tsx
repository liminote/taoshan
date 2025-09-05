'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface ProductMaster {
  id: number
  original_name: string
  new_name: string
  category: string
  small_category: string
  rowIndex: number
}

interface UncategorizedProduct {
  productName: string
  inMaster: boolean
  category?: string
  smallCategory?: string
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

interface ApiMeta {
  lastUpdated: string | null
  fromCache: boolean
}

export default function ProductsMasterSheetsPage() {
  const [products, setProducts] = useState<ProductMaster[]>([])
  const [uncategorizedProducts, setUncategorizedProducts] = useState<UncategorizedProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [uncategorizedLoading, setUncategorizedLoading] = useState(false)
  const [error, setError] = useState('')
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 50, total: 0, totalPages: 0 })
  const [search, setSearch] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [showUncategorized, setShowUncategorized] = useState(false)
  const [editingProduct, setEditingProduct] = useState<ProductMaster | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [meta, setMeta] = useState<ApiMeta>({ lastUpdated: null, fromCache: false })
  const [refreshLoading, setRefreshLoading] = useState(false)

  // 表單狀態
  const [formData, setFormData] = useState({
    original_name: '',
    new_name: '',
    category: '',
    small_category: ''
  })

  useEffect(() => {
    fetchProducts()
  }, [pagination.page, search])

  const fetchProducts = async (forceRefresh = false) => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        search
      })

      if (forceRefresh) {
        params.set('refresh', 'true')
      }

      const response = await fetch(`/api/products-master-sheets?${params}`)
      if (!response.ok) {
        throw new Error('獲取商品主檔失敗')
      }

      const data = await response.json()
      setProducts(data.products)
      setPagination(data.pagination)
      setMeta(data.meta)
    } catch (err) {
      setError(err instanceof Error ? err.message : '未知錯誤')
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    try {
      setRefreshLoading(true)
      await fetchProducts(true)
    } finally {
      setRefreshLoading(false)
    }
  }

  const fetchUncategorizedProducts = async () => {
    try {
      setUncategorizedLoading(true)
      const response = await fetch('/api/products-master-sheets/uncategorized')
      if (!response.ok) {
        throw new Error('獲取未分類商品失敗')
      }

      const data = await response.json()
      setUncategorizedProducts(data.uncategorizedProducts)
      console.log('統計資料:', data.statistics)
    } catch (err) {
      setError(err instanceof Error ? err.message : '獲取未分類商品失敗')
    } finally {
      setUncategorizedLoading(false)
    }
  }

  const handleSearch = (value: string) => {
    setSearch(value)
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.original_name.trim()) {
      alert('請輸入商品名稱')
      return
    }

    setActionLoading(true)
    try {
      const response = await fetch('/api/products-master-sheets/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: editingProduct ? 'update' : 'add',
          data: editingProduct 
            ? { ...formData, rowIndex: editingProduct.rowIndex }
            : formData
        })
      })

      const result = await response.json()
      if (response.ok) {
        alert(result.message)
        resetForm()
        fetchProducts()
      } else {
        alert(result.error)
      }
    } catch (err) {
      alert('操作失敗：' + (err instanceof Error ? err.message : '未知錯誤'))
    } finally {
      setActionLoading(false)
    }
  }

  const handleEdit = (product: ProductMaster) => {
    setEditingProduct(product)
    setFormData({
      original_name: product.original_name,
      new_name: product.new_name,
      category: product.category,
      small_category: product.small_category
    })
    setShowAddForm(true)
  }

  const resetForm = () => {
    setFormData({
      original_name: '',
      new_name: '',
      category: '',
      small_category: ''
    })
    setEditingProduct(null)
    setShowAddForm(false)
  }

  const handleQuickAdd = (uncategorizedProduct: UncategorizedProduct) => {
    setFormData({
      original_name: uncategorizedProduct.productName,
      new_name: uncategorizedProduct.productName + '-',
      category: '',
      small_category: ''
    })
    setShowAddForm(true)
    setShowUncategorized(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* 標題區域 */}
        <div className="mb-8">
          <Link 
            href="/" 
            className="inline-flex items-center text-gray-600 hover:text-blue-600 transition-colors mb-6 group"
          >
            <svg className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            返回首頁
          </Link>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                  商品主檔管理 (Google Sheets)
                </h1>
                <div className="flex items-center mt-1 space-x-4">
                  <p className="text-gray-600">從 Google Sheets 讀取並管理商品分類</p>
                  {meta.lastUpdated && (
                    <div className="flex items-center space-x-2">
                      <div className={`w-2 h-2 rounded-full ${meta.fromCache ? 'bg-blue-500' : 'bg-green-500'}`}></div>
                      <span className="text-sm text-gray-500">
                        {meta.fromCache ? '緩存資料' : '最新資料'} - 更新時間: {meta.lastUpdated}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={handleRefresh}
                disabled={refreshLoading}
                className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:shadow-lg transition-all duration-300 hover:scale-105 disabled:opacity-50"
              >
                <svg className={`w-5 h-5 mr-2 ${refreshLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {refreshLoading ? '更新中...' : '重新整理'}
              </button>
              
              <button
                onClick={() => {
                  setShowUncategorized(!showUncategorized)
                  if (!showUncategorized && uncategorizedProducts.length === 0) {
                    fetchUncategorizedProducts()
                  }
                }}
                disabled={uncategorizedLoading}
                className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl hover:shadow-lg transition-all duration-300 hover:scale-105 disabled:opacity-50"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.728-.833-2.498 0L4.316 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                {uncategorizedLoading ? '分析中...' : `未分類商品 ${showUncategorized ? '隱藏' : '顯示'}`}
              </button>
              
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-green-500 to-blue-600 text-white rounded-xl hover:shadow-lg transition-all duration-300 hover:scale-105"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                新增商品
              </button>
            </div>
          </div>
        </div>

        {/* 未分類商品區域 */}
        {showUncategorized && (
          <div className="bg-orange-50 border-l-4 border-orange-400 rounded-2xl p-6 shadow-lg mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-orange-900">未分類商品</h2>
              <button
                onClick={() => setShowUncategorized(false)}
                className="text-orange-500 hover:text-orange-700"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {uncategorizedProducts.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {uncategorizedProducts.slice(0, 20).map((product, index) => (
                  <div key={index} className="bg-white/70 backdrop-blur-sm border border-white/50 rounded-lg p-3">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 text-sm mb-1">{product.productName}</p>
                        <p className="text-xs text-gray-500">
                          {product.inMaster ? '在主檔中但未分類' : '不在主檔中'}
                        </p>
                        {product.category && (
                          <p className="text-xs text-orange-600">目前分類: {product.category}</p>
                        )}
                      </div>
                      <button
                        onClick={() => handleQuickAdd(product)}
                        className="ml-2 px-2 py-1 bg-orange-500 text-white text-xs rounded hover:bg-orange-600 transition-colors"
                      >
                        分類
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-orange-700">沒有找到未分類商品</p>
            )}
            
            {uncategorizedProducts.length > 20 && (
              <p className="text-orange-600 text-sm mt-3">
                顯示前 20 個，總共 {uncategorizedProducts.length} 個未分類商品
              </p>
            )}
          </div>
        )}

        {/* 搜尋和新增表單區域 */}
        <div className="bg-white/70 backdrop-blur-sm border border-white/50 rounded-2xl p-6 shadow-lg mb-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 搜尋區域 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">搜尋商品</label>
              <input
                type="text"
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="輸入商品名稱、分類等..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white/70 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* 新增/編輯表單 */}
            {showAddForm && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  {editingProduct ? '編輯商品' : '新增商品'}
                </h3>
                <form onSubmit={handleSubmit} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      value={formData.original_name}
                      onChange={(e) => setFormData({...formData, original_name: e.target.value})}
                      placeholder="商品名稱*"
                      required
                      className="px-3 py-2 border border-gray-300 rounded-lg bg-white/70 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                    <input
                      type="text"
                      value={formData.new_name}
                      onChange={(e) => setFormData({...formData, new_name: e.target.value})}
                      placeholder="新商品名稱"
                      className="px-3 py-2 border border-gray-300 rounded-lg bg-white/70 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      value={formData.category}
                      onChange={(e) => setFormData({...formData, category: e.target.value})}
                      placeholder="大分類"
                      className="px-3 py-2 border border-gray-300 rounded-lg bg-white/70 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                    <input
                      type="text"
                      value={formData.small_category}
                      onChange={(e) => setFormData({...formData, small_category: e.target.value})}
                      placeholder="小分類"
                      className="px-3 py-2 border border-gray-300 rounded-lg bg-white/70 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                  </div>
                  <div className="flex space-x-2">
                    <button
                      type="submit"
                      disabled={actionLoading}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 text-sm"
                    >
                      {actionLoading ? '處理中...' : (editingProduct ? '更新' : '新增')}
                    </button>
                    <button
                      type="button"
                      onClick={resetForm}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                    >
                      取消
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>

        {/* 商品列表 */}
        <div className="bg-white/70 backdrop-blur-sm border border-white/50 rounded-2xl shadow-lg overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">載入中...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center">
              <div className="text-red-600 mb-4">❌ {error}</div>
              <button 
                onClick={() => fetchProducts()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                重新載入
              </button>
            </div>
          ) : products.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-600">沒有找到商品資料</p>
            </div>
          ) : (
            <>
              {/* 統計摘要 */}
              <div className="p-6 border-b border-white/50">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{pagination.total}</div>
                    <div className="text-sm text-gray-600">總商品數</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">第 {pagination.page} / {pagination.totalPages} 頁</div>
                    <div className="text-sm text-gray-600">分頁資訊</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{products.length}</div>
                    <div className="text-sm text-gray-600">當前頁數量</div>
                  </div>
                </div>
              </div>

              {/* 表格 */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">商品名稱</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">新商品名稱</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">大分類</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">小分類</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200/50">
                    {products.map((product) => (
                      <tr key={product.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {product.original_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {product.new_name || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            product.category && product.category !== '未分類' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {product.category || '未分類'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {product.small_category || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          <button
                            onClick={() => handleEdit(product)}
                            className="text-blue-600 hover:text-blue-800 transition-colors"
                          >
                            編輯
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* 分頁控制 */}
              {pagination.totalPages > 1 && (
                <div className="p-6 border-t border-white/50 flex justify-center items-center space-x-2">
                  <button 
                    onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                    disabled={pagination.page === 1}
                    className="px-3 py-2 text-sm bg-white/50 border border-gray-300/50 rounded-lg hover:bg-white/80 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    上一頁
                  </button>
                  
                  <div className="flex space-x-1">
                    {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                      const pageNum = pagination.page <= 3 ? i + 1 : pagination.page - 2 + i
                      if (pageNum > pagination.totalPages) return null
                      
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setPagination(prev => ({ ...prev, page: pageNum }))}
                          className={`px-3 py-2 text-sm rounded-lg transition-all ${
                            pageNum === pagination.page
                              ? 'bg-blue-600 text-white'
                              : 'bg-white/50 border border-gray-300/50 hover:bg-white/80'
                          }`}
                        >
                          {pageNum}
                        </button>
                      )
                    })}
                  </div>
                  
                  <button 
                    onClick={() => setPagination(prev => ({ ...prev, page: Math.min(pagination.totalPages, prev.page + 1) }))}
                    disabled={pagination.page === pagination.totalPages}
                    className="px-3 py-2 text-sm bg-white/50 border border-gray-300/50 rounded-lg hover:bg-white/80 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    下一頁
                  </button>
                </div>
              )}
            </>
          )}
        </div>
        
        {/* 說明卡片 */}
        <div className="mt-6 bg-blue-50 border-l-4 border-blue-400 rounded-2xl p-6 shadow-lg">
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-blue-900">使用說明</h3>
          </div>
          <div className="text-blue-800 space-y-2 text-sm">
            <p>• <strong>資料來源：</strong>直接從 Google Sheets 商品主檔讀取</p>
            <p>• <strong>未分類商品：</strong>自動偵測銷售資料中沒有分類的商品</p>
            <p>• <strong>分類管理：</strong>可以在此頁面為商品設定大分類和小分類</p>
            <p>• <strong>即時更新：</strong>更新後會立即反映在報表分析中</p>
            <p>• <strong>注意：</strong>目前寫入功能為模擬模式，需要設定 Google Sheets API 認證才能實際寫入</p>
          </div>
        </div>
      </div>
    </div>
  )
}