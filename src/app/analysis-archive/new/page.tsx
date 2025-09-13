'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function NewAnalysisArchivePage() {
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    summary: '',
    tags: ''
  })
  const [saving, setSaving] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.title.trim() || !formData.content.trim()) {
      alert('請填寫標題和內容')
      return
    }

    setSaving(true)
    
    try {
      const tags = formData.tags.split(',').map(tag => tag.trim()).filter(Boolean)
      
      const response = await fetch('/api/analysis-archive', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: formData.title.trim(),
          content: formData.content.trim(),
          summary: formData.summary.trim() || undefined,
          tags
        })
      })
      
      const result = await response.json()
      
      if (result.success) {
        alert('分析存檔已成功儲存')
        router.push('/analysis-archive')
      } else {
        alert(result.error || '儲存失敗')
      }
    } catch (error) {
      console.error('儲存分析存檔失敗:', error)
      alert('儲存失敗，請稍後再試')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    if (formData.title || formData.content || formData.summary || formData.tags) {
      if (confirm('確定要離開嗎？未儲存的內容將會遺失。')) {
        router.push('/analysis-archive')
      }
    } else {
      router.push('/analysis-archive')
    }
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
            返回分析存檔
          </button>
        </div>

        {/* 頁面標題 */}
        <div className="mb-8">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg" style={{ backgroundColor: '#A8E6CF' }}>
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-800">新增分析存檔</h1>
              <p className="text-gray-600 mt-1">記錄重要的分析發現和洞察</p>
            </div>
          </div>
        </div>

        {/* 新增表單 */}
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

            {/* 摘要 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                摘要
              </label>
              <input
                type="text"
                value={formData.summary}
                onChange={(e) => setFormData({...formData, summary: e.target.value})}
                placeholder="簡短描述這個分析的重點..."
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500"
              />
            </div>

            {/* 標籤 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                標籤
              </label>
              <input
                type="text"
                value={formData.tags}
                onChange={(e) => setFormData({...formData, tags: e.target.value})}
                placeholder="請輸入標籤，以逗號分隔（例如：客戶分析,營收,趨勢）"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                標籤可幫助您快速分類和搜尋存檔
              </p>
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
                    <span>儲存中...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                    </svg>
                    <span>儲存存檔</span>
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