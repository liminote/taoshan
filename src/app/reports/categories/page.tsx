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
  category_id: number
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [newCategoryName, setNewCategoryName] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories')
      if (response.ok) {
        const data = await response.json()
        setCategories(data)
      }
    } catch (error) {
      console.error('取得分類資料失敗:', error)
    } finally {
      setLoading(false)
    }
  }

  const addCategory = async () => {
    if (!newCategoryName.trim()) return

    try {
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCategoryName })
      })

      if (response.ok) {
        setNewCategoryName('')
        fetchCategories()
      }
    } catch (error) {
      console.error('新增分類失敗:', error)
    }
  }

  const deleteCategory = async (id: number) => {
    if (!confirm('確定要刪除這個分類嗎？這會同時刪除所有相關的小分類。')) return

    try {
      const response = await fetch(`/api/categories/${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        fetchCategories()
      }
    } catch (error) {
      console.error('刪除分類失敗:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center">
            <p className="text-lg">載入中...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="mb-6">
            <Link href="/reports" className="text-blue-600 hover:text-blue-800">
              ← 回報表
            </Link>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            分類管理
          </h1>

          {/* 新增分類 */}
          <div className="mb-8 p-4 border rounded-lg">
            <h2 className="text-lg font-semibold mb-4">新增大分類</h2>
            <div className="flex gap-2">
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="輸入分類名稱"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                onKeyPress={(e) => e.key === 'Enter' && addCategory()}
              />
              <button
                onClick={addCategory}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                新增
              </button>
            </div>
          </div>

          {/* 分類列表 */}
          <div className="space-y-4">
            {categories.length > 0 ? (
              categories.map((category) => (
                <div key={category.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-lg font-medium">{category.name}</h3>
                    <button
                      onClick={() => deleteCategory(category.id)}
                      className="px-3 py-1 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 transition-colors"
                    >
                      刪除
                    </button>
                  </div>
                  
                  {category.subcategories && category.subcategories.length > 0 && (
                    <div className="mt-2">
                      <p className="text-sm text-gray-600 mb-1">小分類：</p>
                      <div className="flex flex-wrap gap-1">
                        {category.subcategories.map((sub) => (
                          <span
                            key={sub.id}
                            className="px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded"
                          >
                            {sub.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>尚無分類資料</p>
                <p className="text-sm mt-2">請先新增一些分類</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}