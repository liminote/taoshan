'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import ReactMarkdown from 'react-markdown'

interface AnalysisArchive {
  id: string
  title: string
  content: string
  createdAt: string
  tags: string[]
  summary?: string
}

export default function AnalysisArchiveDetailPage() {
  const [archive, setArchive] = useState<AnalysisArchive | null>(null)
  const [loading, setLoading] = useState(true)
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

  const handleDelete = async () => {
    if (!confirm('確定要刪除這個分析存檔嗎？此操作無法復原。')) {
      return
    }

    try {
      const response = await fetch(`/api/analysis-archive?id=${id}`, {
        method: 'DELETE'
      })
      
      const result = await response.json()
      
      if (result.success) {
        alert('分析存檔已刪除')
        router.push('/analysis-archive')
      } else {
        alert(result.error || '刪除失敗')
      }
    } catch (error) {
      console.error('刪除分析存檔失敗:', error)
      alert('刪除失敗，請稍後再試')
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getTagColor = (tag: string) => {
    const colors = [
      'bg-blue-100 text-blue-800',
      'bg-green-100 text-green-800', 
      'bg-purple-100 text-purple-800',
      'bg-orange-100 text-orange-800',
      'bg-pink-100 text-pink-800',
      'bg-indigo-100 text-indigo-800'
    ]
    const hash = tag.split('').reduce((a, b) => a + b.charCodeAt(0), 0)
    return colors[hash % colors.length]
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
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
              <div className="space-y-4">
                <div className="h-4 bg-gray-200 rounded w-full"></div>
                <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                <div className="h-4 bg-gray-200 rounded w-4/5"></div>
              </div>
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
          <Link 
            href="/analysis-archive" 
            className="inline-flex items-center text-gray-600 hover:text-primary transition-colors mb-6 group"
          >
            <svg className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            返回分析存檔
          </Link>
          
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-12 text-center">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.728-.833-2.498 0L4.316 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">找不到分析存檔</h2>
            <p className="text-gray-600 mb-6">{error || '指定的分析存檔不存在或已被刪除'}</p>
            <Link 
              href="/analysis-archive"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              返回列表
            </Link>
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
          <Link 
            href="/analysis-archive" 
            className="inline-flex items-center text-gray-600 hover:text-primary transition-colors group"
          >
            <svg className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            返回分析存檔
          </Link>
        </div>

        {/* 分析內容 */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200">
          
          {/* 標題區域 */}
          <div className="p-8 border-b border-gray-200">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-gray-900 mb-4">
                  {archive.title}
                </h1>
                
                <div className="flex items-center space-x-6 text-sm text-gray-500">
                  <span className="flex items-center">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    建立時間：{formatDate(archive.createdAt)}
                  </span>
                  
                  {archive.tags.length > 0 && (
                    <div className="flex items-center space-x-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                      <div className="flex flex-wrap gap-1">
                        {archive.tags.map((tag, index) => (
                          <span
                            key={index}
                            className={`px-2 py-1 rounded-full text-xs font-medium ${getTagColor(tag)}`}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* 操作按鈕 */}
              <div className="flex items-center space-x-3 ml-6">
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors flex items-center space-x-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  <span>刪除</span>
                </button>
              </div>
            </div>
          </div>

          {/* 內容區域 */}
          <div className="p-8">
            <div className="prose prose-lg max-w-none">
              <ReactMarkdown 
                className="text-gray-800 leading-relaxed"
                components={{
                  h1: ({children}) => <h1 className="text-2xl font-bold text-gray-900 mt-8 mb-4 first:mt-0">{children}</h1>,
                  h2: ({children}) => <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-3">{children}</h2>,
                  h3: ({children}) => <h3 className="text-lg font-medium text-gray-900 mt-4 mb-2">{children}</h3>,
                  p: ({children}) => <p className="text-gray-700 mb-4 leading-relaxed">{children}</p>,
                  ul: ({children}) => <ul className="list-disc list-inside mb-4 space-y-1">{children}</ul>,
                  ol: ({children}) => <ol className="list-decimal list-inside mb-4 space-y-1">{children}</ol>,
                  li: ({children}) => <li className="text-gray-700">{children}</li>,
                  strong: ({children}) => <strong className="font-semibold text-gray-900">{children}</strong>,
                  code: ({children}) => <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono">{children}</code>,
                  blockquote: ({children}) => <blockquote className="border-l-4 border-blue-200 pl-4 italic text-gray-600 mb-4">{children}</blockquote>
                }}
              >
                {archive.content}
              </ReactMarkdown>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}