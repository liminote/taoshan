'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

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

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expandedCategories, setExpandedCategories] = useState<Set<number>>(new Set())
  const [showAddCategory, setShowAddCategory] = useState(false)
  const [showAddSubcategory, setShowAddSubcategory] = useState<number | null>(null)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newSubcategoryName, setNewSubcategoryName] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories')
      if (!response.ok) {
        throw new Error('獲取分類資料失敗')
      }
      const data = await response.json()
      setCategories(data)
      
      // 默認展開前3個分類
      setExpandedCategories(new Set([1, 2, 3]))
    } catch (err) {
      setError(err instanceof Error ? err.message : '未知錯誤')
    } finally {
      setLoading(false)
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
      case '1壽司刺身':
        return '🍣'
      case '黑板料理':
      case '2黑板料理':
        return '📋'
      case '烤炸串':
      case '3烤炸串':
        return '🍢'
      case '配菜':
      case '4配菜':
        return '🥗'
      case '主食':
      case '5主食':
        return '🍱'
      case '酒水':
      case '6酒水':
        return '🍷'
      case '便當':
      case '7便當':
        return '🍙'
      case '外帶送':
      case '8外帶送':
        return '🚚'
      case '其他':
      case '9其他':
        return '📦'
      default:
        return '🏷️'
    }
  }

  const getCategoryColor = (categoryId: number) => {
    const colors = [
      'bg-melon',
      'bg-sky_blue', 
      'bg-tea_green',
      'bg-lemon_chiffon',
      'bg-periwinkle',
      'bg-lavender_blush',
      'bg-mint_green',
      'bg-fawn',
      'bg-mauve'
    ]
    return colors[(categoryId - 1) % colors.length]
  }

  const addCategory = async () => {
    if (!newCategoryName.trim()) return
    
    setActionLoading(true)
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
      setError(err instanceof Error ? err.message : '新增失敗')
    } finally {
      setActionLoading(false)
    }
  }

  const addSubcategory = async (categoryId: number) => {
    if (!newSubcategoryName.trim()) return
    
    setActionLoading(true)
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
      setError(err instanceof Error ? err.message : '新增失敗')
    } finally {
      setActionLoading(false)
    }
  }

  const deleteCategory = async (categoryId: number, categoryName: string) => {
    if (!confirm(`確定要刪除主分類「${categoryName}」？這將同時刪除其所有子分類。`)) return
    
    setActionLoading(true)
    try {
      const response = await fetch(`/api/categories?id=${categoryId}&type=category`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('刪除主分類失敗')
      }

      await fetchCategories()
    } catch (err) {
      setError(err instanceof Error ? err.message : '刪除失敗')
    } finally {
      setActionLoading(false)
    }
  }

  const deleteSubcategory = async (subcategoryId: number, subcategoryName: string) => {
    if (!confirm(`確定要刪除子分類「${subcategoryName}」？`)) return
    
    setActionLoading(true)
    try {
      const response = await fetch(`/api/categories?id=${subcategoryId}&type=subcategory`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('刪除子分類失敗')
      }

      await fetchCategories()
    } catch (err) {
      setError(err instanceof Error ? err.message : '刪除失敗')
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* 標題區域 */}
        <div className="mb-8">
          <Link 
            href="/" 
            className="inline-flex items-center text-gray-600 hover:text-accent-600 transition-colors mb-6 group"
          >
            <svg className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            返回首頁
          </Link>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-r from-accent-500 to-accent-600 rounded-2xl flex items-center justify-center shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                  商品分類管理
                </h1>
                <p className="text-gray-600 mt-1">管理商品的主分類和子分類</p>
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-600 mx-auto mb-4"></div>
            <p className="text-gray-600">載入中...</p>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <div className="text-error-600 mb-4">❌ {error}</div>
            <button 
              onClick={fetchCategories}
              className="px-4 py-2 bg-accent-600 text-white rounded-lg hover:bg-accent-700 transition-colors"
            >
              重新載入
            </button>
          </div>
        ) : (
          <>
            {/* 統計摘要 */}
            <div className="bg-white/70 backdrop-blur-sm border border-white/50 rounded-2xl p-6 shadow-lg mb-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-accent-600">{categories.length}</div>
                  <div className="text-sm text-gray-600">主分類</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-accent-600">
                    {categories.reduce((total, cat) => total + (cat.subcategories?.length || 0), 0)}
                  </div>
                  <div className="text-sm text-gray-600">子分類</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-secondary-600">{expandedCategories.size}</div>
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
                        <div className={`w-12 h-12 bg-gradient-to-r ${getCategoryColor(category.id)} rounded-xl flex items-center justify-center shadow-md text-2xl`}>
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
                          className="p-2 text-error-500 hover:text-error-700 hover:bg-error-50 rounded-lg transition-colors"
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
                          className="px-4 py-2 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 transition-colors flex items-center space-x-2"
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
                              className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary-500/50 focus:border-transparent text-sm"
                              onKeyPress={(e) => e.key === 'Enter' && addSubcategory(category.id)}
                            />
                            <button
                              onClick={() => addSubcategory(category.id)}
                              disabled={!newSubcategoryName.trim() || actionLoading}
                              className="px-4 py-2 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {actionLoading ? '新增中...' : '確認'}
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
                                className="p-1 text-error-500 hover:text-error-700 hover:bg-error-50 rounded opacity-0 group-hover:opacity-100 transition-opacity"
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
              <div className="bg-white/70 backdrop-blur-sm border border-white/50 rounded-2xl p-6 shadow-lg mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">新增主分類</h3>
                <div className="flex space-x-4">
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="輸入主分類名稱..."
                    className="flex-1 px-4 py-2 bg-white/50 border border-gray-200/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent-500/50 focus:border-transparent"
                    onKeyPress={(e) => e.key === 'Enter' && addCategory()}
                  />
                  <button
                    onClick={addCategory}
                    disabled={!newCategoryName.trim() || actionLoading}
                    className="px-6 py-2 bg-accent-600 text-white rounded-xl hover:bg-accent-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {actionLoading ? '新增中...' : '確認'}
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
                className="px-6 py-3 bg-success-600 text-white rounded-xl hover:bg-success-700 transition-colors shadow-lg flex items-center space-x-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <span>新增主分類</span>
              </button>
              <button 
                onClick={() => setExpandedCategories(new Set(categories.map(c => c.id)))}
                className="px-6 py-3 bg-accent-600 text-white rounded-xl hover:bg-accent-700 transition-colors shadow-lg"
              >
                展開所有分類
              </button>
              <button 
                onClick={() => setExpandedCategories(new Set())}
                className="px-6 py-3 bg-gray-600 text-white rounded-xl hover:bg-gray-700 transition-colors shadow-lg"
              >
                收起所有分類
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}