'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'

interface AnalysisArchive {
  id: string
  title: string
  content: string
  createdAt: string
}

export default function EditAnalysisArchivePage() {
  const [archive, setArchive] = useState<AnalysisArchive | null>(null)
  const [formData, setFormData] = useState({
    title: '',
    content: ''
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const fetchArchive = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/analysis-archive?id=${id}`)
      const result = await response.json()
      
      if (result.success) {
        setArchive(result.data)
        setFormData({
          title: result.data.title,
          content: result.data.content
        })
      } else {
        setError(result.error || '獲取分析存檔失敗')
      }
    } catch (error) {
      console.error('獲取分析存檔失敗:', error)
      setError('獲取分析存檔失敗')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.title.trim() || !formData.content.trim()) {
      alert('請填寫標題和內容')
      return
    }

    setSaving(true)
    
    try {
      const response = await fetch(`/api/analysis-archive?id=${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: formData.title.trim(),
          content: formData.content.trim()
        })
      })
      
      const result = await response.json()
      
      if (result.success) {
        alert('分析存檔已更新')
        router.push(`/analysis-archive/${id}`)
      } else {
        alert(result.error || '更新失敗')
      }
    } catch (error) {
      console.error('更新分析存檔失敗:', error)
      alert('更新失敗，請稍後再試')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    if (archive && (formData.title !== archive.title || formData.content !== archive.content)) {
      if (confirm('確定要離開嗎？未儲存的變更將會遺失。')) {
        router.push(`/analysis-archive/${id}`)
      }
    } else {
      router.push(`/analysis-archive/${id}`)
    }
  }

  useEffect(() => {
    if (id) {
      fetchArchive()
    }
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
              <div className="h-8 bg-gray-200 rounded w-3/4 mb-4"></div>
              <div className="h-64 bg-gray-200 rounded w-full"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !archive) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => router.push('/analysis-archive')}
            className="inline-flex items-center text-gray-600 hover:text-primary transition-colors mb-6 group"
          >
            <svg className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            返回分析存檔
          </button>
          
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-12 text-center">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.728-.833-2.498 0L4.316 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">找不到分析存檔</h2>
            <p className="text-gray-600 mb-6">{error || '指定的分析存檔不存在或已被刪除'}</p>
            <button
              onClick={() => router.push('/analysis-archive')}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              返回列表
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        
        {/* 導航 */}
        <div className="mb-6">
          <button
            onClick={handleCancel}
            className="inline-flex items-center text-gray-600 hover:text-primary transition-colors group"
          >
            <svg className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            返回詳情
          </button>
        </div>

        {/* 頁面標題 */}
        <div className="mb-8">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg" style={{ backgroundColor: '#A8E6CF' }}>
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-800">編輯分析存檔</h1>
              <p className="text-gray-600 mt-1">修改標題和內容</p>
            </div>
          </div>
        </div>

        {/* 編輯表單 */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg border border-gray-200">
          <div className="p-8 space-y-6">
            
            {/* 標題 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                標題 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                placeholder="請輸入分析存檔標題..."
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500"
                required
              />
            </div>

            {/* 內容 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                內容 <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData({...formData, content: e.target.value})}
                placeholder="請輸入分析內容...&#10;&#10;支援 Markdown 格式：&#10;# 標題&#10;## 子標題&#10;**粗體文字**&#10;- 清單項目&#10;1. 編號清單"
                rows={20}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500 font-mono text-sm resize-vertical"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                支援 Markdown 語法，可用於格式化文字
              </p>
            </div>
          </div>

          {/* 操作按鈕 */}
          <div className="px-8 py-6 bg-gray-50 border-t border-gray-200 rounded-b-2xl">
            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={handleCancel}
                className="px-6 py-3 bg-gray-500 text-white rounded-xl hover:bg-gray-600 transition-colors"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={saving || !formData.title.trim() || !formData.content.trim()}
                className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {saving ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>更新中...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                    </svg>
                    <span>更新存檔</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}