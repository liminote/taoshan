'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface ImportantItem {
  id: string
  date: string
  content: string
  assignee: string
  completed: boolean
  completedAt?: string
  createdAt: string
}

export default function Home() {
  const [pendingItems, setPendingItems] = useState<ImportantItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    content: '',
    assignee: ''
  })
  const [availableTags, setAvailableTags] = useState(['Allen', 'Luis', '香師傅', 'Vanny'])
  const [newTag, setNewTag] = useState('')

  const fetchPendingItems = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/important-items')
      const result = await response.json()
      
      if (result.success) {
        const pending = result.data.filter((item: ImportantItem) => !item.completed)
        setPendingItems(pending.sort((a: ImportantItem, b: ImportantItem) => 
          new Date(a.date).getTime() - new Date(b.date).getTime()
        ))
      }
    } catch (error) {
      console.error('獲取重要事項失敗:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggleComplete = async (id: string) => {
    try {
      const response = await fetch('/api/important-items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'toggle',
          data: { id }
        })
      })
      
      if (response.ok) {
        fetchPendingItems()
      }
    } catch (error) {
      console.error('更新事項失敗:', error)
    }
  }

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.content.trim() || !formData.assignee.trim()) {
      alert('請填寫完整資訊')
      return
    }
    
    try {
      const response = await fetch('/api/important-items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'add',
          data: formData
        })
      })
      
      if (response.ok) {
        setFormData({
          date: new Date().toISOString().split('T')[0],
          content: '',
          assignee: ''
        })
        setShowAddForm(false)
        fetchPendingItems()
      }
    } catch (error) {
      console.error('新增事項失敗:', error)
    }
  }

  const getAssigneeColor = (assignee: string) => {
    const colors = {
      'Allen': 'bg-pink-200 text-pink-800',
      'Luis': 'bg-orange-200 text-orange-800',
      '香師傅': 'bg-yellow-200 text-yellow-800',
      'Vanny': 'bg-green-200 text-green-800'
    }
    return colors[assignee as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  const addNewTag = () => {
    if (newTag.trim() && !availableTags.includes(newTag.trim())) {
      setAvailableTags([...availableTags, newTag.trim()])
      setNewTag('')
    }
  }

  const removeTag = (tagToRemove: string) => {
    setAvailableTags(availableTags.filter(tag => tag !== tagToRemove))
  }

  useEffect(() => {
    fetchPendingItems()
  }, [])
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-lg mx-auto">
        
        
        {/* 重要事項清單 */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200">
          <div className="p-6 border-b border-gray-200/50">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-periwinkle rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold text-gray-900">近期重要事項</h2>
                <span className="text-sm text-gray-500">({pendingItems.length} 項待處理)</span>
              </div>
              <button 
                onClick={() => setShowAddForm(!showAddForm)}
                className="px-4 py-2 bg-pink-400 text-white text-sm rounded-lg hover:shadow-lg transition-all duration-300 hover:scale-105 flex items-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span>新增事項</span>
              </button>
            </div>

            {/* 新增表單 */}
            {showAddForm && (
              <form onSubmit={handleAddItem} className="bg-yellow-50 border border-gray-200 rounded-xl p-4 mb-4">
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">日期</label>
                    <input
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({...formData, date: e.target.value})}
                      className="w-full p-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">內容</label>
                    <input
                      type="text"
                      value={formData.content}
                      onChange={(e) => setFormData({...formData, content: e.target.value})}
                      placeholder="請輸入重要事項內容..."
                      className="w-full p-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">負責人</label>
                    <div className="space-y-3">
                      {/* 標籤選擇區域 */}
                      <div className="flex flex-wrap gap-2 p-3 bg-lemon_chiffon-50 border border-gray-300 rounded-lg min-h-[50px]">
                        {availableTags.map(tag => (
                          <div key={tag} className="flex items-center space-x-1">
                            <button
                              type="button"
                              onClick={() => setFormData({...formData, assignee: tag})}
                              className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
                                formData.assignee === tag 
                                  ? 'bg-melon text-white' 
                                  : 'bg-white border border-gray-300 hover:bg-gray-50 text-gray-700'
                              }`}
                            >
                              {tag}
                            </button>
                            <button
                              type="button"
                              onClick={() => removeTag(tag)}
                              className="w-4 h-4 rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors flex items-center justify-center text-xs"
                              title="刪除標籤"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                      
                      {/* 新增標籤區域 */}
                      <div className="flex space-x-2">
                        <input
                          type="text"
                          value={newTag}
                          onChange={(e) => setNewTag(e.target.value)}
                          placeholder="輸入新標籤名稱..."
                          className="flex-1 p-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky_blue focus:border-transparent text-sm text-gray-900 placeholder-gray-500"
                          onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addNewTag())}
                        />
                        <button
                          type="button"
                          onClick={addNewTag}
                          className="px-3 py-2 bg-tea_green text-white text-sm rounded-lg hover:bg-tea_green-600 transition-colors"
                        >
                          +
                        </button>
                      </div>
                      
                      {/* 已選擇顯示 */}
                      {formData.assignee && (
                        <div className="text-sm text-gray-600">
                          已選擇：<span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getAssigneeColor(formData.assignee)}`}>
                            {formData.assignee}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex justify-end space-x-2 mt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    儲存
                  </button>
                </div>
              </form>
            )}
          </div>

          <div className="p-6">
            {/* 待處理事項列表 */}
            {isLoading ? (
              <div className="text-center py-8 text-gray-500">
                載入中...
              </div>
            ) : pendingItems.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p>目前沒有待處理的重要事項</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingItems.map((item) => (
                  <div key={item.id} className="flex items-center space-x-3 p-3 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all">
                    <button
                      onClick={() => handleToggleComplete(item.id)}
                      className="w-6 h-6 border-2 border-sky_blue rounded-full hover:border-melon transition-colors flex items-center justify-center group"
                    >
                      <svg className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </button>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-gray-900 font-medium truncate">{item.content}</p>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ml-2 ${getAssigneeColor(item.assignee)}`}>
                          {item.assignee}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        {new Date(item.date).toLocaleDateString('zh-TW', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 歷史記錄連結 */}
            <div className="mt-6 pt-4 border-t border-gray-200/50">
              <Link 
                href="/history"
                className="inline-flex items-center space-x-2 text-blue-500 hover:text-blue-700 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>查看歷史記錄</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
