'use client'

import { useState, useEffect, useMemo } from 'react'
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
    date: '',
    content: '',
    assignee: ''
  })
  const [availableTags, setAvailableTags] = useState(['Allen', 'Luis', '香師傅', '馬姐', 'All'])
  const [newTag, setNewTag] = useState('')
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null)
  const [editingItem, setEditingItem] = useState<ImportantItem | null>(null)
  const [editForm, setEditForm] = useState({ content: '', date: '', assignee: '' })
  const [isSavingEdit, setIsSavingEdit] = useState(false)

  const canonicalAssignee = (name: string) => {
    const mapping: Record<string, string> = {
      'Louis': 'Luis',
      'Vanny': '馬姐',
      '馬姐': '馬姐',
      '外場團隊': 'Allen',
      '全體': 'All',
      'all': 'All',
      '所有人': 'All'
    }
    const trimmed = name?.trim()
    if (!trimmed) return '其他'
    return mapping[trimmed] || trimmed
  }

  const boardAssignees = ['Allen', 'Luis', '馬姐', '香師傅', 'All']
  const boardSections = [...boardAssignees, '其他']
  const groupedItems = useMemo(() => {
    const map: Record<string, ImportantItem[]> = {}
    boardSections.forEach(name => {
      map[name] = []
    })
    pendingItems.forEach(item => {
      const normalized = canonicalAssignee(item.assignee)
      const key = boardAssignees.includes(normalized) ? normalized : '其他'
      if (!map[key]) map[key] = []
      map[key].push({ ...item, assignee: normalized })
    })
    return map
  }, [pendingItems])

  // 顯示通知的輔助函數
  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message })
    setTimeout(() => setNotification(null), 3000) // 3秒後自動隱藏
  }

  const fetchPendingItems = async (forceRefresh = false) => {
    try {
      setIsLoading(true)

      // 使用優化後的API參數
      const queryParams = new URLSearchParams({
        pending: 'true',
        limit: '50'
      })

      if (forceRefresh) {
        queryParams.set('refresh', 'true')
      }

      const response = await fetch(`/api/important-items?${queryParams}`)
      const result = await response.json()

      if (result.success) {
        // API已經過濾和排序，直接使用結果
        setPendingItems(result.data)

        // 顯示快取狀態
        if (result.cached) {
          console.log('✅ 使用快取數據，快取時間:', new Date(result.cacheTimestamp).toLocaleTimeString())
        } else {
          console.log('🔄 使用最新數據')
        }
      }
    } catch (error) {
      console.error('獲取重要事項失敗:', error)
      showNotification('error', '載入重要事項失敗，請稍後再試')
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
        showNotification('success', '事項狀態已更新')
        fetchPendingItems(true) // 強制刷新以獲取最新數據
      }
    } catch (error) {
      console.error('更新事項失敗:', error)
      showNotification('error', '更新事項失敗，請稍後再試')
    }
  }

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.content.trim() || !formData.assignee.trim() || !formData.date.trim()) {
      alert('請填寫完整資訊（包含預計完成時間）')
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
        showNotification('success', '重要事項已成功新增')
        setFormData({
          date: '',
          content: '',
          assignee: ''
        })
        setShowAddForm(false)
        fetchPendingItems(true) // 強制刷新以獲取最新數據
      }
    } catch (error) {
      console.error('新增事項失敗:', error)
      showNotification('error', '新增事項失敗，請稍後再試')
    }
  }

  const openEditModal = (item: ImportantItem) => {
    const normalizedAssignee = canonicalAssignee(item.assignee)
    setEditingItem(item)
    setEditForm({
      content: item.content,
      date: item.date,
      assignee: normalizedAssignee
    })
  }

  const closeEditModal = () => {
    setEditingItem(null)
    setEditForm({ content: '', date: '', assignee: '' })
    setIsSavingEdit(false)
  }

  const handleEditChange = (field: 'content' | 'date' | 'assignee', value: string) => {
    setEditForm(prev => ({ ...prev, [field]: value }))
  }

  const handleEditSave = async () => {
    if (!editingItem) return
    if (!editForm.content.trim() || !editForm.date || !editForm.assignee.trim()) {
      alert('請填寫完整資訊')
      return
    }
    try {
      setIsSavingEdit(true)
      const response = await fetch('/api/important-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update',
          data: {
            id: editingItem.id,
            content: editForm.content.trim(),
            date: editForm.date.trim(),
            assignee: editForm.assignee.trim()
          }
        })
      })
      if (!response.ok) {
        throw new Error('更新失敗')
      }
      showNotification('success', '事項已更新')
      closeEditModal()
      fetchPendingItems(true)
    } catch (error) {
      console.error('edit error', error)
      showNotification('error', '更新事項失敗，請稍後重試')
    } finally {
      setIsSavingEdit(false)
    }
  }

  const getAssigneeColor = (assignee: string) => {
    const colors = {
      'Allen': 'bg-melon-100 text-gray-800',
      'Luis': 'bg-fawn-100 text-gray-800',
      '香師傅': 'bg-lemon_chiffon-100 text-gray-800',
      '馬姐': 'bg-mint_green-100 text-gray-800',
      'All': 'bg-lavender_blush-100 text-gray-800'
    }
    return colors[assignee as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  const formatDueDate = (value?: string) => (value && value.trim().length > 0 ? value : '未設定')

  const formatCreatedDate = (value?: string) => {
    if (!value) return '—'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return value
    return date.toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
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
      <div className="max-w-6xl mx-auto">

        {/* 通知訊息 */}
        {notification && (
          <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg transition-all duration-300 ${notification.type === 'success'
            ? 'bg-green-500 text-white'
            : 'bg-red-500 text-white'
            }`}>
            <div className="flex items-center space-x-2">
              {notification.type === 'success' ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
              <span className="text-sm font-medium">{notification.message}</span>
            </div>
          </div>
        )}

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

                {/* 刷新按鈕 */}
                <button
                  onClick={() => fetchPendingItems(true)}
                  disabled={isLoading}
                  className="ml-2 p-1.5 text-gray-400 hover:text-gray-600 disabled:text-gray-300 transition-colors"
                  title="刷新數據"
                >
                  <svg
                    className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                </button>
              </div>
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 hover:shadow-lg transition-all duration-300 hover:scale-105 flex items-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span>新增事項</span>
              </button>
            </div>

            {/* 新增表單 */}
            {showAddForm && (
              <form onSubmit={handleAddItem} className="bg-lemon_chiffon-50 border border-gray-200 rounded-xl p-4 mb-4">
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">預計完成時間</label>
                    <input
                      type="text"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      placeholder="例如：下週起、11/30 前"
                      className="w-full p-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-gray-900"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">內容</label>
                    <input
                      type="text"
                      value={formData.content}
                      onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                      placeholder="請輸入重要事項內容..."
                      className="w-full p-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-gray-900 placeholder-gray-500"
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
                              onClick={() => setFormData({ ...formData, assignee: tag })}
                              className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${formData.assignee === tag
                                ? 'bg-melon text-white'
                                : 'bg-white border border-gray-300 hover:bg-gray-50 text-gray-700'
                                }`}
                            >
                              {tag}
                            </button>
                            <button
                              type="button"
                              onClick={() => removeTag(tag)}
                              className="w-4 h-4 rounded-full bg-melon text-white hover:bg-melon-600 transition-colors flex items-center justify-center text-xs"
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
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-md font-medium"
                  >
                    儲存
                  </button>
                </div>
              </form>
            )}
          </div>

          <div className="p-6">
            {/* Trello style board */}
            {isLoading ? (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-4">
                {boardSections.map(name => (
                  <div key={name} className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <div className="h-4 bg-gray-200 rounded w-32 animate-pulse"></div>
                      <div className="h-4 bg-gray-200 rounded w-10 animate-pulse"></div>
                    </div>
                    <div className="space-y-3">
                      {[1, 2].map(card => (
                        <div key={card} className="h-24 bg-gray-50 border border-dashed border-gray-200 rounded-xl animate-pulse"></div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col space-y-6">
                {boardSections.map(section => {
                  const items = groupedItems[section] || []
                  return (
                    <div key={section} className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
                      <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-2">
                        <div className="flex items-center space-x-2">
                          <h3 className="text-lg font-semibold text-gray-900">{section}</h3>
                          <span className="text-sm text-gray-500">({items.length} 項)</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {items.length === 0 ? (
                          <div className="col-span-full border border-dashed border-gray-300 rounded-lg px-4 py-6 text-center text-sm text-gray-400">
                            尚無待辦事項
                          </div>
                        ) : (
                          items.map(item => (
                            <div
                              key={item.id}
                              className="relative flex flex-col bg-white border border-gray-200 rounded-xl shadow-sm p-4 cursor-pointer hover:border-blue-300 transition-colors"
                              onClick={() => openEditModal(item)}
                            >
                              <p className="text-gray-900 font-medium whitespace-pre-line pr-10">{item.content.replace(/^\*/, '').trim()}</p>
                              <span className={`mt-3 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getAssigneeColor(item.assignee)} w-fit`}>
                                {item.assignee}
                              </span>
                              <div className="mt-4 text-sm text-gray-600 space-y-1">
                                <div className="text-xs text-gray-500 uppercase tracking-wide">預計完成</div>
                                <div className="text-base font-semibold text-gray-900">{formatDueDate(item.date)}</div>
                                {item.createdAt && (
                                  <div className="text-xs text-gray-400">建立：{formatCreatedDate(item.createdAt)}</div>
                                )}
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleToggleComplete(item.id)
                                }}
                                className="absolute top-3 right-3 inline-flex items-center px-2 py-1 text-xs font-medium bg-emerald-500 hover:bg-emerald-600 text-white rounded-md transition-colors"
                              >
                                完成
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* 歷史記錄連結 */}
            <div className="mt-8 pt-4 border-t border-gray-200/50">
              <Link
                href="/history"
                className="inline-flex items-center space-x-2 text-primary hover:text-primary-700 transition-colors"
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

      {editingItem && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-lg rounded-2xl p-6 shadow-xl">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="text-sm text-gray-500">編輯重要事項</div>
                <h3 className="text-xl font-semibold text-gray-900">{editingItem.assignee}</h3>
              </div>
              <button
                onClick={closeEditModal}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">事項內容</label>
                <textarea
                  value={editForm.content}
                  onChange={e => handleEditChange('content', e.target.value)}
                  rows={4}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">預計完成時間</label>
                <input
                  type="text"
                  value={editForm.date}
                  onChange={e => handleEditChange('date', e.target.value)}
                  placeholder="輸入例如：下週起、12/5完成"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">負責人</label>
                <select
                  value={editForm.assignee}
                  onChange={e => handleEditChange('assignee', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">選擇負責人</option>
                  {availableTags.concat(boardSections.filter(tag => !availableTags.includes(tag))).filter((value, index, self) => self.indexOf(value) === index).map(tag => (
                    <option key={tag} value={tag}>{tag}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-2">
              <button
                onClick={closeEditModal}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handleEditSave}
                disabled={isSavingEdit}
                className={`px-4 py-2 rounded-lg text-white ${isSavingEdit ? 'bg-blue-300 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600'}`}
              >
                {isSavingEdit ? '儲存中...' : '儲存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
