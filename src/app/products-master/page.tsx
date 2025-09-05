'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Category {
  id: number
  name: string
  subcategories?: Subcategory[]
}

interface Subcategory {
  id: number
  name: string
}

interface ProductMaster {
  id: number
  original_name: string
  new_name: string
  category_id?: number
  subcategory_id?: number
  categories?: Category
  subcategories?: Subcategory
  created_at: string
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

export default function ProductsMasterPage() {
  const [products, setProducts] = useState<ProductMaster[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 100, total: 0, totalPages: 0 })
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingProduct, setEditingProduct] = useState<ProductMaster | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  // 表單狀態
  const [formData, setFormData] = useState({
    original_name: '',
    new_name: '',
    category_id: '',
    subcategory_id: ''
  })

  useEffect(() => {
    fetchCategories()
    fetchProducts()
  }, [pagination.page, search, selectedCategory])

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories')
      if (response.ok) {
        const categoriesData = await response.json()
        setCategories(categoriesData)
      }
    } catch (err) {
      console.error('獲取分類失敗:', err)
    }
  }

  const fetchProducts = async () => {
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        search,
        category_id: selectedCategory
      })

      const response = await fetch(`/api/products-master?${params}`)
      if (!response.ok) {
        throw new Error('獲取商品主檔失敗')
      }

      const data = await response.json()
      setProducts(data.products)
      setPagination(data.pagination)
    } catch (err) {
      setError(err instanceof Error ? err.message : '未知錯誤')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (value: string) => {
    setSearch(value)
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  const handleCategoryFilter = (categoryId: string) => {
    setSelectedCategory(categoryId)
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  const resetForm = () => {
    setFormData({
      original_name: '',
      new_name: '',
      category_id: '',
      subcategory_id: ''
    })
    setEditingProduct(null)
    setShowAddForm(false)
  }

  const handleSubmit = async () => {
    if (!formData.original_name.trim()) {
      setError('商品名稱為必填')
      return
    }

    setActionLoading(true)
    try {
      const url = editingProduct ? '/api/products-master' : '/api/products-master'
      const method = editingProduct ? 'PUT' : 'POST'
      
      const submitData: Record<string, unknown> = {
        ...formData,
        category_id: formData.category_id || null,
        subcategory_id: formData.subcategory_id || null
      }

      if (editingProduct) {
        submitData.id = editingProduct.id
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '操作失敗')
      }

      resetForm()
      await fetchProducts()
    } catch (err) {
      setError(err instanceof Error ? err.message : '操作失敗')
    } finally {
      setActionLoading(false)
    }
  }

  const handleEdit = (product: ProductMaster) => {
    setEditingProduct(product)
    setFormData({
      original_name: product.original_name,
      new_name: product.new_name,
      category_id: product.category_id?.toString() || '',
      subcategory_id: product.subcategory_id?.toString() || ''
    })
    setShowAddForm(true)
  }

  const handleDelete = async (product: ProductMaster) => {
    if (!confirm(`確定要刪除商品「${product.original_name}」？`)) return

    setActionLoading(true)
    try {
      const response = await fetch(`/api/products-master?id=${product.id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('刪除失敗')
      }

      await fetchProducts()
    } catch (err) {
      setError(err instanceof Error ? err.message : '刪除失敗')
    } finally {
      setActionLoading(false)
    }
  }

  // 自動生成新商品名稱
  const handleProductNameChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      original_name: value,
      new_name: prev.new_name || (value + '-')
    }))
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 py-8 px-4 sm:px-6 lg:px-8">
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
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-green-600 rounded-2xl flex items-center justify-center shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                  商品主檔管理
                </h1>
                <p className="text-gray-600 mt-1">管理商品名稱、新商品名稱和分類</p>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4">
            <div className="text-red-600">❌ {error}</div>
            <button 
              onClick={() => setError('')}
              className="mt-2 text-sm text-red-500 hover:text-red-700"
            >
              關閉
            </button>
          </div>
        )}

        {/* 搜尋和篩選區域 */}
        <div className="bg-white/70 backdrop-blur-sm border border-white/50 rounded-2xl p-6 shadow-lg mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">搜尋商品</label>
              <input
                type="text"
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="輸入商品名稱搜尋..."
                className="w-full px-4 py-2 bg-white/50 border border-gray-200/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">分類篩選</label>
              <select
                value={selectedCategory}
                onChange={(e) => handleCategoryFilter(e.target.value)}
                className="w-full px-4 py-2 bg-white/50 border border-gray-200/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent"
              >
                <option value="all">所有分類</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => setShowAddForm(true)}
                className="w-full px-6 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors shadow-lg flex items-center justify-center space-x-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <span>新增商品</span>
              </button>
            </div>
          </div>
        </div>

        {/* 新增/編輯表單 */}
        {showAddForm && (
          <div className="bg-white/70 backdrop-blur-sm border border-white/50 rounded-2xl p-6 shadow-lg mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {editingProduct ? '編輯商品' : '新增商品'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">商品名稱 *</label>
                <input
                  type="text"
                  value={formData.original_name}
                  onChange={(e) => handleProductNameChange(e.target.value)}
                  placeholder="輸入商品名稱..."
                  className="w-full px-4 py-2 bg-white/50 border border-gray-200/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">新商品名稱</label>
                <input
                  type="text"
                  value={formData.new_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, new_name: e.target.value }))}
                  placeholder="自動生成：商品名稱-"
                  className="w-full px-4 py-2 bg-white/50 border border-gray-200/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">大分類</label>
                <select
                  value={formData.category_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, category_id: e.target.value, subcategory_id: '' }))}
                  className="w-full px-4 py-2 bg-white/50 border border-gray-200/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent"
                >
                  <option value="">請選擇大分類</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">小分類</label>
                <select
                  value={formData.subcategory_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, subcategory_id: e.target.value }))}
                  disabled={!formData.category_id}
                  className="w-full px-4 py-2 bg-white/50 border border-gray-200/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent disabled:opacity-50"
                >
                  <option value="">請選擇小分類</option>
                  {categories
                    .find(cat => cat.id.toString() === formData.category_id)
                    ?.subcategories?.map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        {sub.name}
                      </option>
                    ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end space-x-4 mt-6">
              <button
                onClick={resetForm}
                className="px-6 py-2 bg-gray-500 text-white rounded-xl hover:bg-gray-600 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSubmit}
                disabled={!formData.original_name.trim() || actionLoading}
                className="px-6 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading ? '處理中...' : (editingProduct ? '更新' : '新增')}
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">載入中...</p>
          </div>
        ) : (
          <>
            {/* 統計摘要 */}
            <div className="bg-white/70 backdrop-blur-sm border border-white/50 rounded-2xl p-6 shadow-lg mb-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{pagination.total}</div>
                  <div className="text-sm text-gray-600">總商品數</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{pagination.page}</div>
                  <div className="text-sm text-gray-600">目前頁數</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">{pagination.totalPages}</div>
                  <div className="text-sm text-gray-600">總頁數</div>
                </div>
              </div>
            </div>

            {/* 商品列表 */}
            <div className="bg-white/70 backdrop-blur-sm border border-white/50 rounded-2xl shadow-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50/50 border-b border-gray-200/50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">商品名稱</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">新商品名稱</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">大分類</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">小分類</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200/50">
                    {products.map((product) => (
                      <tr key={product.id} className="hover:bg-gray-50/50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {product.original_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {product.new_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {product.categories?.name || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {product.subcategories?.name || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleEdit(product)}
                              className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                              title="編輯"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDelete(product)}
                              className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                              title="刪除"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* 分頁控制 */}
              {pagination.totalPages > 1 && (
                <div className="bg-gray-50/50 px-6 py-4 border-t border-gray-200/50">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                      顯示 {((pagination.page - 1) * pagination.limit) + 1} 到{' '}
                      {Math.min(pagination.page * pagination.limit, pagination.total)} 筆，
                      共 {pagination.total} 筆資料
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                        disabled={pagination.page === 1}
                        className="px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        上一頁
                      </button>
                      <span className="px-4 py-2 bg-blue-600 text-white rounded-lg">
                        {pagination.page}
                      </span>
                      <button
                        onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                        disabled={pagination.page >= pagination.totalPages}
                        className="px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        下一頁
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}