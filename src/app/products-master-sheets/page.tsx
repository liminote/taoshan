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

interface Subcategory {
  id: number
  name: string
  category_id: number
}

interface Category {
  id: number
  name: string
  subcategories?: Subcategory[]
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
  const [activeTab, setActiveTab] = useState('products') // 'products' 或 'categories'
  
  // 分類管理相關狀態
  const [categories, setCategories] = useState<Category[]>([])
  const [categoriesLoading, setCategoriesLoading] = useState(false)
  const [categoriesError, setCategoriesError] = useState('')
  const [expandedCategories, setExpandedCategories] = useState<Set<number>>(new Set())
  const [showAddCategory, setShowAddCategory] = useState(false)
  const [showAddSubcategory, setShowAddSubcategory] = useState<number | null>(null)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newSubcategoryName, setNewSubcategoryName] = useState('')
  const [categoryActionLoading, setCategoryActionLoading] = useState(false)

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
  
  useEffect(() => {
    if (activeTab === 'categories' && categories.length === 0) {
      fetchCategories()
    }
  }, [activeTab])

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

  // 分類管理相關函數
  const fetchCategories = async () => {
    try {
      setCategoriesLoading(true)
      const response = await fetch('/api/categories')
      if (!response.ok) {
        throw new Error('獲取分類資料失敗')
      }
      const data = await response.json()
      setCategories(data)
      
      // 默認展開前3個分類
      setExpandedCategories(new Set([1, 2, 3]))
    } catch (err) {
      setCategoriesError(err instanceof Error ? err.message : '未知錯誤')
    } finally {
      setCategoriesLoading(false)
    }
  }

  const toggleCategory = (categoryId: number) => {
    const newExpanded = new Set(expandedCategories)
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId)
    } else {
      newExpanded.add(categoryId)
    }
    setExpandedCategories(newExpanded)
  }

  const getCategoryIcon = (categoryName: string) => {
    switch (categoryName) {
      case '壽司刺身':
        return '🍣'
      case '黑板料理':
        return '📋'
      case '烤炸串':
        return '🍢'
      case '配菜':
        return '🥗'
      case '主食':
        return '🍱'
      case '酒水':
        return '🍷'
      case '便當':
        return '🍙'
      case '外帶送':
        return '🚚'
      case '其他':
        return '📦'
      default:
        return '🏷️'
    }
  }

  const getCategoryColor = (categoryId: number) => {
    const colors = [
      'bg-sky_blue',      // 天藍色
      'bg-melon',         // 粉色
      'bg-mint_green',    // 薄荷綠
      'bg-periwinkle',    // 淺紫色
      'bg-fawn',          // 小鹿色
      'bg-aquamarine',    // 海藍色
      'bg-lavender_blush',// 薰衣草紅
      'bg-tea_green',     // 茶綠色
      'bg-mauve',         // 淡紫色
      'bg-lemon_chiffon'  // 檸檬色
    ]
    return colors[(categoryId - 1) % colors.length]
  }

  const addCategory = async () => {
    if (!newCategoryName.trim()) return
    
    setCategoryActionLoading(true)
    try {
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCategoryName.trim(), type: 'category' })
      })

      if (!response.ok) {
        throw new Error('新增主分類失敗')
      }

      setNewCategoryName('')
      setShowAddCategory(false)
      await fetchCategories()
    } catch (err) {
      setCategoriesError(err instanceof Error ? err.message : '新增失敗')
    } finally {
      setCategoryActionLoading(false)
    }
  }

  const addSubcategory = async (categoryId: number) => {
    if (!newSubcategoryName.trim()) return
    
    setCategoryActionLoading(true)
    try {
      const response = await fetch('/api/subcategories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newSubcategoryName.trim(), category_id: categoryId })
      })

      if (!response.ok) {
        throw new Error('新增子分類失敗')
      }

      setNewSubcategoryName('')
      setShowAddSubcategory(null)
      await fetchCategories()
    } catch (err) {
      setCategoriesError(err instanceof Error ? err.message : '新增失敗')
    } finally {
      setCategoryActionLoading(false)
    }
  }

  const deleteCategory = async (categoryId: number, categoryName: string) => {
    if (!confirm(`確定要刪除主分類「${categoryName}」？這將同時刪除其所有子分類。`)) return
    
    setCategoryActionLoading(true)
    try {
      const response = await fetch(`/api/categories?id=${categoryId}&type=category`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('刪除主分類失敗')
      }

      await fetchCategories()
    } catch (err) {
      setCategoriesError(err instanceof Error ? err.message : '刪除失敗')
    } finally {
      setCategoryActionLoading(false)
    }
  }

  const deleteSubcategory = async (subcategoryId: number, subcategoryName: string) => {
    if (!confirm(`確定要刪除子分類「${subcategoryName}」？`)) return
    
    setCategoryActionLoading(true)
    try {
      const response = await fetch(`/api/categories?id=${subcategoryId}&type=subcategory`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('刪除子分類失敗')
      }

      await fetchCategories()
    } catch (err) {
      setCategoriesError(err instanceof Error ? err.message : '刪除失敗')
    } finally {
      setCategoryActionLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
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
              <div className="w-12 h-12 bg-melon rounded-2xl flex items-center justify-center shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-800">
                  商品主檔管理
                </h1>
                <div className="flex items-center mt-1 space-x-4">
                  <p className="text-gray-600">管理商品資料和分類設定</p>
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
                className="inline-flex items-center px-4 py-2 bg-sky_blue text-white rounded-xl hover:shadow-lg transition-all duration-300 hover:scale-105 disabled:opacity-50"
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
                className="inline-flex items-center px-4 py-2 bg-fawn text-white rounded-xl hover:shadow-lg transition-all duration-300 hover:scale-105 disabled:opacity-50"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.728-.833-2.498 0L4.316 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                {uncategorizedLoading ? '分析中...' : `未分類商品 ${showUncategorized ? '隱藏' : '顯示'}`}
              </button>
              
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="inline-flex items-center px-4 py-2 bg-tea_green text-white rounded-xl hover:shadow-lg transition-all duration-300 hover:scale-105"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                新增商品
              </button>
            </div>
          </div>
        </div>

        {/* 選項卡 */}
        <div className="mb-6">
          <div className="flex space-x-1 bg-gray-100 backdrop-blur-sm p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('products')}
              className={`px-6 py-3 text-sm font-medium rounded-lg transition-all duration-200 flex items-center space-x-2 ${
                activeTab === 'products'
                  ? 'bg-white text-melon shadow-sm'
                  : 'text-gray-600 hover:text-melon'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <span>商品主檔</span>
            </button>
            <button
              onClick={() => setActiveTab('categories')}
              className={`px-6 py-3 text-sm font-medium rounded-lg transition-all duration-200 flex items-center space-x-2 ${
                activeTab === 'categories'
                  ? 'bg-white text-fawn shadow-sm'
                  : 'text-gray-600 hover:text-fawn'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              <span>分類管理</span>
            </button>
          </div>
        </div>

        {activeTab === 'products' && (
          <>
        {/* 未分類商品區域 */}
        {showUncategorized && (
          <div className="bg-yellow-50 border-l-4 border-orange-400 rounded-2xl p-6 shadow-lg mb-6">
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
                        className="ml-2 px-2 py-1 bg-fawn text-white text-xs rounded hover:bg-fawn-600 transition-colors"
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
        <div className="bg-white/80 backdrop-blur-sm border border-orange-200/30 rounded-2xl p-6 shadow-lg mb-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 搜尋區域 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">搜尋商品</label>
              <input
                type="text"
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="輸入商品名稱、分類等..."
                className="w-full px-3 py-2 border border-orange-200 rounded-lg bg-white/70 focus:ring-2 focus:ring-melon/50 focus:border-melon text-gray-900"
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
                      className="px-3 py-2 border border-orange-200 rounded-lg bg-white/70 focus:ring-2 focus:ring-melon/50 focus:border-melon text-sm text-gray-900"
                    />
                    <input
                      type="text"
                      value={formData.new_name}
                      onChange={(e) => setFormData({...formData, new_name: e.target.value})}
                      placeholder="新商品名稱"
                      className="px-3 py-2 border border-orange-200 rounded-lg bg-white/70 focus:ring-2 focus:ring-melon/50 focus:border-melon text-sm text-gray-900"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      value={formData.category}
                      onChange={(e) => setFormData({...formData, category: e.target.value})}
                      placeholder="大分類"
                      className="px-3 py-2 border border-orange-200 rounded-lg bg-white/70 focus:ring-2 focus:ring-melon/50 focus:border-melon text-sm text-gray-900"
                    />
                    <input
                      type="text"
                      value={formData.small_category}
                      onChange={(e) => setFormData({...formData, small_category: e.target.value})}
                      placeholder="小分類"
                      className="px-3 py-2 border border-orange-200 rounded-lg bg-white/70 focus:ring-2 focus:ring-melon/50 focus:border-melon text-sm text-gray-900"
                    />
                  </div>
                  <div className="flex space-x-2">
                    <button
                      type="submit"
                      disabled={actionLoading}
                      className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors disabled:opacity-50 text-sm"
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
        <div className="bg-white/80 backdrop-blur-sm border border-orange-200/30 rounded-2xl shadow-lg overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600 mx-auto mb-4"></div>
              <p className="text-gray-600">載入中...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center">
              <div className="text-red-600 mb-4">❌ {error}</div>
              <button 
                onClick={() => fetchProducts()}
                className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors"
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
                    className="px-3 py-2 text-sm bg-white/50 border border-orange-200/50 rounded-lg hover:bg-white/80 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
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
                              ? 'bg-pink-600 text-white'
                              : 'bg-white/50 border border-orange-200/50 hover:bg-white/80'
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
                    className="px-3 py-2 text-sm bg-white/50 border border-orange-200/50 rounded-lg hover:bg-white/80 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    下一頁
                  </button>
                </div>
              )}
            </>
          )}
        </div>
        
        {/* 說明卡片 */}
        <div className="mt-6 bg-orange-50 border-l-4 border-orange-400 rounded-2xl p-6 shadow-lg">
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-orange-900">使用說明</h3>
          </div>
          <div className="text-orange-800 space-y-2 text-sm">
            <p>• <strong>資料來源：</strong>直接從 Google Sheets 商品主檔讀取</p>
            <p>• <strong>未分類商品：</strong>自動偵測銷售資料中沒有分類的商品</p>
            <p>• <strong>分類管理：</strong>可以在此頁面為商品設定大分類和小分類</p>
            <p>• <strong>即時更新：</strong>更新後會立即反映在報表分析中</p>
            <p>• <strong>注意：</strong>目前寫入功能為模擬模式，需要設定 Google Sheets API 認證才能實際寫入</p>
          </div>
        </div>
          </>
        )}

        {activeTab === 'categories' && (
          <>
            {categoriesLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
                <p className="text-gray-600">載入中...</p>
              </div>
            ) : categoriesError ? (
              <div className="text-center py-12">
                <div className="text-red-600 mb-4">❌ {categoriesError}</div>
                <button 
                  onClick={fetchCategories}
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                >
                  重新載入
                </button>
              </div>
            ) : (
              <>
                {/* 統計摘要 */}
                <div className="bg-white/80 backdrop-blur-sm border border-orange-200/30 rounded-2xl p-6 shadow-lg mb-6">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">{categories.length}</div>
                      <div className="text-sm text-gray-600">主分類</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-pink-600">
                        {categories.reduce((total, cat) => total + (cat.subcategories?.length || 0), 0)}
                      </div>
                      <div className="text-sm text-gray-600">子分類</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-indigo-600">{expandedCategories.size}</div>
                      <div className="text-sm text-gray-600">展開的分類</div>
                    </div>
                  </div>
                </div>

                {/* 分類列表 */}
                <div className="space-y-4">
                  {categories.map((category) => (
                    <div 
                      key={category.id}
                      className="bg-white/70 backdrop-blur-sm border border-white/50 rounded-2xl shadow-lg overflow-hidden"
                    >
                      {/* 主分類標題 */}
                      <div 
                        className="p-6 cursor-pointer hover:bg-white/50 transition-colors"
                        onClick={() => toggleCategory(category.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className={`w-12 h-12 ${getCategoryColor(category.id)} rounded-xl flex items-center justify-center shadow-md text-2xl`}>
                              {getCategoryIcon(category.name)}
                            </div>
                            <div>
                              <h2 className="text-xl font-bold text-gray-900">{category.name}</h2>
                              <p className="text-gray-600 text-sm">
                                {category.subcategories?.length || 0} 個子分類
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                deleteCategory(category.id, category.name)
                              }}
                              className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                              title="刪除主分類"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                            <span className="text-sm text-gray-500">
                              {expandedCategories.has(category.id) ? '收起' : '展開'}
                            </span>
                            <svg 
                              className={`w-5 h-5 text-gray-400 transform transition-transform ${
                                expandedCategories.has(category.id) ? 'rotate-180' : ''
                              }`} 
                              fill="none" 
                              stroke="currentColor" 
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </div>
                      </div>

                      {/* 子分類列表 */}
                      {expandedCategories.has(category.id) && category.subcategories && (
                        <div className="border-t border-white/50 bg-gray-50/50 p-6">
                          {/* 新增子分類按鈕 */}
                          <div className="mb-4 flex justify-end">
                            <button
                              onClick={() => setShowAddSubcategory(category.id)}
                              className="px-4 py-2 bg-pink-600 text-white text-sm rounded-lg hover:bg-pink-700 transition-colors flex items-center space-x-2"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                              </svg>
                              <span>新增子分類</span>
                            </button>
                          </div>

                          {/* 新增子分類表單 */}
                          {showAddSubcategory === category.id && (
                            <div className="mb-4 bg-white/50 rounded-xl p-4 border border-gray-200/50">
                              <h4 className="font-medium text-gray-900 mb-3">新增子分類到「{category.name}」</h4>
                              <div className="flex space-x-3">
                                <input
                                  type="text"
                                  value={newSubcategoryName}
                                  onChange={(e) => setNewSubcategoryName(e.target.value)}
                                  placeholder="輸入子分類名稱..."
                                  className="flex-1 px-3 py-2 bg-white border border-orange-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500/50 focus:border-transparent text-sm text-gray-900"
                                  onKeyPress={(e) => e.key === 'Enter' && addSubcategory(category.id)}
                                />
                                <button
                                  onClick={() => addSubcategory(category.id)}
                                  disabled={!newSubcategoryName.trim() || categoryActionLoading}
                                  className="px-4 py-2 bg-pink-600 text-white text-sm rounded-lg hover:bg-pink-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {categoryActionLoading ? '新增中...' : '確認'}
                                </button>
                                <button
                                  onClick={() => {
                                    setShowAddSubcategory(null)
                                    setNewSubcategoryName('')
                                  }}
                                  className="px-4 py-2 bg-gray-500 text-white text-sm rounded-lg hover:bg-gray-600 transition-colors"
                                >
                                  取消
                                </button>
                              </div>
                            </div>
                          )}

                          {/* 子分類網格 */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {category.subcategories.map((subcategory) => (
                              <div 
                                key={subcategory.id}
                                className="bg-white/80 rounded-xl p-4 border border-gray-200/50 hover:shadow-md transition-all hover:scale-105 group"
                              >
                                <div className="flex items-center space-x-3">
                                  <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                                    <span className="text-xs font-medium text-gray-600">
                                      {subcategory.id}
                                    </span>
                                  </div>
                                  <div className="flex-1">
                                    <h3 className="font-medium text-gray-900 text-sm leading-tight">
                                      {subcategory.name}
                                    </h3>
                                  </div>
                                  <button
                                    onClick={() => deleteSubcategory(subcategory.id, subcategory.name)}
                                    className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                    title="刪除子分類"
                                  >
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* 新增主分類表單 */}
                {showAddCategory && (
                  <div className="bg-white/80 backdrop-blur-sm border border-orange-200/30 rounded-2xl p-6 shadow-lg mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">新增主分類</h3>
                    <div className="flex space-x-4">
                      <input
                        type="text"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        placeholder="輸入主分類名稱..."
                        className="flex-1 px-4 py-2 bg-white/50 border border-orange-200/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-transparent text-gray-900"
                        onKeyPress={(e) => e.key === 'Enter' && addCategory()}
                      />
                      <button
                        onClick={addCategory}
                        disabled={!newCategoryName.trim() || categoryActionLoading}
                        className="px-6 py-2 bg-orange-600 text-white rounded-xl hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {categoryActionLoading ? '新增中...' : '確認'}
                      </button>
                      <button
                        onClick={() => {
                          setShowAddCategory(false)
                          setNewCategoryName('')
                        }}
                        className="px-6 py-2 bg-gray-500 text-white rounded-xl hover:bg-gray-600 transition-colors"
                      >
                        取消
                      </button>
                    </div>
                  </div>
                )}

                {/* 操作按鈕 */}
                <div className="mt-8 flex flex-wrap justify-center gap-4">
                  <button 
                    onClick={() => setShowAddCategory(true)}
                    className="px-6 py-3 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors shadow-lg flex items-center space-x-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    <span>新增主分類</span>
                  </button>
                  <button 
                    onClick={() => setExpandedCategories(new Set(categories.map(c => c.id)))}
                    className="px-6 py-3 bg-orange-600 text-white rounded-xl hover:bg-orange-700 transition-colors shadow-lg"
                  >
                    展開所有分類
                  </button>
                  <button 
                    onClick={() => setExpandedCategories(new Set())}
                    className="px-6 py-3 bg-gray-500 text-white rounded-xl hover:bg-gray-600 transition-colors shadow-lg"
                  >
                    收起所有分類
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}