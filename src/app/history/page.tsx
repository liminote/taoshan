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

export default function HistoryPage() {
  const [completedItems, setCompletedItems] = useState<ImportantItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchCompletedItems = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/important-items')
      const result = await response.json()
      
      if (result.success) {
        const completed = result.data.filter((item: ImportantItem) => item.completed)
        setCompletedItems(completed.sort((a: ImportantItem, b: ImportantItem) => 
          new Date(b.completedAt || b.createdAt).getTime() - new Date(a.completedAt || a.createdAt).getTime()
        ))
      }
    } catch (error) {
      console.error('獲取歷史記錄失敗:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchCompletedItems()
  }, [])

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getAssigneeColor = (assignee: string) => {
    const colors = {
      'Allen': 'bg-melon text-white',
      'Luis': 'bg-fawn text-[#4a5568]',
      '香師傅': 'bg-lemon_chiffon text-[#4a5568]',
      'Vanny': 'bg-success-200 text-green-800',
      '店長': 'bg-periwinkle text-white',
      '經理': 'bg-lavender_blush text-[#4a5568]',
      '會計': 'bg-mauve text-white',
      '廚師': 'bg-success-200 text-green-800',
      '服務員': 'bg-sky_blue text-white'
    }
    return colors[assignee as keyof typeof colors] || 'bg-gray-100 text-[#4a5568]'
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* 頁面標題 */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-aquamarine rounded-2xl mb-6 shadow-lg">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-[#4a5568] mb-3">
            歷史記錄
          </h1>
          <p className="text-gray-600 text-lg">已完成的重要事項記錄</p>
        </div>

        {/* 返回按鈕 */}
        <div className="mb-6">
          <Link 
            href="/"
            className="inline-flex items-center space-x-2 px-4 py-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:shadow-lg transition-all duration-300"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>返回主頁</span>
          </Link>
        </div>

        {/* 歷史記錄列表 */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-lg">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-[#2d3748] flex items-center space-x-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
              <span>已完成事項 ({completedItems.length})</span>
            </h2>
          </div>

          <div className="p-6">
            {isLoading ? (
              <div className="text-center py-8 text-gray-500">
                載入中...
              </div>
            ) : completedItems.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
                <p>尚無歷史記錄</p>
              </div>
            ) : (
              <div className="space-y-4">
                {completedItems.map((item) => (
                  <div key={item.id} className="bg-white border border-gray-200 rounded-xl p-4 hover:bg-gray-50 transition-all">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <div className="w-6 h-6 bg-success-200 rounded-full flex items-center justify-center">
                            <svg className="w-4 h-4 text-success-600" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <span className="text-lg font-medium text-[#2d3748]">{item.content}</span>
                        </div>
                        
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          <div className="flex items-center space-x-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span>{new Date(item.date).toLocaleDateString('zh-TW')}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>完成於 {formatDate(item.completedAt || item.createdAt)}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="ml-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getAssigneeColor(item.assignee)}`}>
                          {item.assignee}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}