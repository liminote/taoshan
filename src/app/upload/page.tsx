'use client'

import { useState } from 'react'
import { useDropzone } from 'react-dropzone'
import * as XLSX from 'xlsx'
import Link from 'next/link'

export default function UploadPage() {
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState('')
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([])

  const onDrop = async (acceptedFiles: File[]) => {
    setUploading(true)
    setMessage('')
    setUploadedFiles([])

    try {
      const processedFiles = []
      for (const file of acceptedFiles) {
        const data = await file.arrayBuffer()
        const workbook = XLSX.read(data)
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        const jsonData = XLSX.utils.sheet_to_json(worksheet)

        // 判斷檔案類型並處理
        if (file.name.includes('商品報表') || file.name.includes('product')) {
          await handleProductData(jsonData as Record<string, string | number>[])
          processedFiles.push(`✓ ${file.name} (商品報表)`)
        } else if (file.name.includes('訂單報表') || file.name.includes('order')) {
          await handleOrderData(jsonData as Record<string, string | number>[])
          processedFiles.push(`✓ ${file.name} (訂單報表)`)
        } else {
          processedFiles.push(`⚠ ${file.name} (無法識別類型)`)
        }
      }
      
      setUploadedFiles(processedFiles)
      setMessage('檔案處理完成！')
    } catch (error) {
      setMessage('上傳失敗: ' + (error instanceof Error ? error.message : '未知錯誤'))
    } finally {
      setUploading(false)
    }
  }

  const handleProductData = async (data: Record<string, string | number>[]) => {
    const response = await fetch('/api/upload/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data })
    })
    
    if (!response.ok) {
      throw new Error('商品資料上傳失敗')
    }
  }

  const handleOrderData = async (data: Record<string, string | number>[]) => {
    const response = await fetch('/api/upload/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data })
    })
    
    if (!response.ok) {
      throw new Error('訂單資料上傳失敗')
    }
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls']
    },
    multiple: true
  })

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
            <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                資料上傳
              </h1>
              <p className="text-gray-600 mt-1">上傳 Excel 報表檔案</p>
            </div>
          </div>
        </div>

        {/* 上傳區域 */}
        <div className="bg-white/70 backdrop-blur-sm border border-white/50 rounded-2xl p-8 shadow-lg mb-6">
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-300 ${
              isDragActive 
                ? 'border-blue-500 bg-blue-50/50 scale-105' 
                : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50/30'
            } ${uploading ? 'pointer-events-none opacity-50' : ''}`}
          >
            <input {...getInputProps()} />
            
            <div className="space-y-6">
              {uploading ? (
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mb-4 animate-pulse">
                    <svg className="w-8 h-8 text-white animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </div>
                  <p className="text-xl font-semibold text-gray-700">處理檔案中...</p>
                  <p className="text-sm text-gray-500">請稍候，正在解析 Excel 資料</p>
                </div>
              ) : (
                <>
                  <div className="w-20 h-20 bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg">
                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {isDragActive ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      )}
                    </svg>
                  </div>
                  
                  {isDragActive ? (
                    <div>
                      <p className="text-xl font-semibold text-blue-600">放開來上傳檔案</p>
                      <p className="text-sm text-blue-500 mt-2">準備處理你的 Excel 檔案</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-xl font-semibold text-gray-700 mb-2">拖拽檔案到這裡</p>
                      <p className="text-lg text-gray-600">或點擊選擇檔案</p>
                      <p className="text-sm text-gray-500 mt-3">支援 .xlsx 和 .xls 格式，可同時上傳多個檔案</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* 上傳結果 */}
        {message && (
          <div className={`mb-6 p-6 rounded-2xl backdrop-blur-sm ${
            message.includes('成功') || message.includes('完成')
              ? 'bg-green-50/70 border border-green-200/50 text-green-800' 
              : 'bg-red-50/70 border border-red-200/50 text-red-800'
          }`}>
            <div className="flex items-center space-x-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                message.includes('成功') || message.includes('完成')
                  ? 'bg-green-500' 
                  : 'bg-red-500'
              }`}>
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {message.includes('成功') || message.includes('完成') ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  )}
                </svg>
              </div>
              <p className="font-semibold">{message}</p>
            </div>
            
            {uploadedFiles.length > 0 && (
              <div className="mt-4 space-y-2">
                {uploadedFiles.map((file, index) => (
                  <div key={index} className="flex items-center space-x-2 text-sm">
                    <span>{file}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 使用說明 */}
        <div className="bg-white/70 backdrop-blur-sm border border-white/50 rounded-2xl p-6 shadow-lg">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-gray-900">使用說明</h3>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              </div>
              <div>
                <p className="font-medium text-gray-900">商品報表</p>
                <p className="text-sm text-gray-600">檔名包含「商品報表」的 Excel 檔案會被識別為商品資料</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              </div>
              <div>
                <p className="font-medium text-gray-900">訂單報表</p>
                <p className="text-sm text-gray-600">檔名包含「訂單報表」的 Excel 檔案會被識別為訂單資料</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              </div>
              <div>
                <p className="font-medium text-gray-900">自動分類</p>
                <p className="text-sm text-gray-600">系統會自動比對並建立新商品的分類資料</p>
              </div>
            </div>
          </div>
          
          <div className="mt-6 pt-4 border-t border-gray-200/50">
            <Link 
              href="/reports" 
              className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all duration-300 hover:scale-105"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              查看報表
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}