'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function ImportPage() {
  const [importing, setImporting] = useState(false)
  const [message, setMessage] = useState('')

  // 播放完成提示音
  const playNotificationSound = (isSuccess = true) => {
    try {
      const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()
      
      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)
      
      if (isSuccess) {
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime) // 高音
        oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1) // 低音
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3)
        oscillator.stop(audioContext.currentTime + 0.3)
      } else {
        oscillator.frequency.setValueAtTime(300, audioContext.currentTime) // 低音錯誤音
        gainNode.gain.setValueAtTime(0.2, audioContext.currentTime)
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5)
        oscillator.stop(audioContext.currentTime + 0.5)
      }
      
      oscillator.start(audioContext.currentTime)
    } catch (err) {
      console.log('無法播放提示音:', err)
    }
  }

  const importSampleData = async () => {
    setImporting(true)
    setMessage('')
    
    try {
      const response = await fetch('/api/import-sample', {
        method: 'POST'
      })
      
      const result = await response.json()
      
      if (response.ok) {
        setMessage('✅ ' + result.message)
        // 播放成功提示音
        setTimeout(() => playNotificationSound(true), 100)
      } else {
        setMessage('❌ 匯入失敗: ' + result.error)
        // 播放失敗提示音
        setTimeout(() => playNotificationSound(false), 100)
      }
    } catch (error) {
      setMessage('❌ 匯入失敗: ' + (error instanceof Error ? error.message : '未知錯誤'))
      // 播放失敗提示音
      setTimeout(() => playNotificationSound(false), 100)
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
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
          
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-pink-600 rounded-2xl flex items-center justify-center shadow-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                匯入範例資料
              </h1>
              <p className="text-gray-600 mt-1">匯入你的 Google Sheets 餐廳資料</p>
            </div>
          </div>
        </div>

        {/* 匯入區域 */}
        <div className="bg-white/70 backdrop-blur-sm border border-white/50 rounded-2xl p-8 shadow-lg mb-6">
          <div className="text-center">
            <div className="w-20 h-20 bg-gradient-to-r from-orange-500 to-pink-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {importing ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" className="animate-spin" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                )}
              </svg>
            </div>
            
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              準備匯入你的餐廳資料
            </h2>
            <p className="text-gray-600 mb-8">
              包含 3 筆訂單範例資料，來自你的 Google Sheets
            </p>
            
            <button
              onClick={importSampleData}
              disabled={importing}
              className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-orange-500 to-pink-600 text-white rounded-2xl hover:shadow-lg transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none text-lg font-semibold"
            >
              {importing ? (
                <>
                  <svg className="w-6 h-6 mr-3 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  匯入中...
                </>
              ) : (
                <>
                  <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  開始匯入資料
                </>
              )}
            </button>
          </div>
        </div>

        {/* 結果顯示 */}
        {message && (
          <div className={`mb-6 p-6 rounded-2xl backdrop-blur-sm ${
            message.includes('✅')
              ? 'bg-green-50/70 border border-green-200/50 text-green-800' 
              : 'bg-red-50/70 border border-red-200/50 text-red-800'
          }`}>
            <div className="flex items-center space-x-3">
              <p className="text-lg font-semibold">{message}</p>
            </div>
            
            {message.includes('✅') && (
              <div className="mt-6 flex flex-wrap gap-3">
                <Link 
                  href="/reports"
                  className="inline-flex items-center px-4 py-2 bg-white/50 border border-green-200/50 rounded-xl hover:bg-white/80 transition-all"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  查看報表
                </Link>
                
                <Link 
                  href="/reports/categories"
                  className="inline-flex items-center px-4 py-2 bg-white/50 border border-green-200/50 rounded-xl hover:bg-white/80 transition-all"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  管理分類
                </Link>
              </div>
            )}
          </div>
        )}

        {/* 說明 */}
        <div className="bg-white/70 backdrop-blur-sm border border-white/50 rounded-2xl p-6 shadow-lg">
          <h3 className="text-lg font-bold text-gray-900 mb-4">匯入資料說明</h3>
          <div className="space-y-3 text-gray-700">
            <p>• <strong>訂單資料</strong>：3 筆 2023年12月 的餐廳訂單</p>
            <p>• <strong>商品資料</strong>：自動解析品項並建立商品比對表</p>
            <p>• <strong>報表功能</strong>：匯入後可立即查看月銷售統計</p>
            <p>• <strong>分類管理</strong>：可為商品新增大分類和小分類</p>
          </div>
        </div>
      </div>
    </div>
  )
}