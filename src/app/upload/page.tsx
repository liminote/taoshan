'use client'

import { useState } from 'react'
import { useDropzone } from 'react-dropzone'
import * as XLSX from 'xlsx'
import Link from 'next/link'

export default function UploadPage() {
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState('')

  const onDrop = async (acceptedFiles: File[]) => {
    setUploading(true)
    setMessage('')

    try {
      for (const file of acceptedFiles) {
        const data = await file.arrayBuffer()
        const workbook = XLSX.read(data)
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        const jsonData = XLSX.utils.sheet_to_json(worksheet)

        // 判斷檔案類型並處理
        if (file.name.includes('商品報表') || file.name.includes('product')) {
          await handleProductData(jsonData)
        } else if (file.name.includes('訂單報表') || file.name.includes('order')) {
          await handleOrderData(jsonData)
        } else {
          setMessage(`無法識別檔案類型: ${file.name}`)
          continue
        }
      }
      setMessage('檔案上傳成功！')
    } catch (error) {
      setMessage('上傳失敗: ' + (error instanceof Error ? error.message : '未知錯誤'))
    } finally {
      setUploading(false)
    }
  }

  const handleProductData = async (data: Record<string, any>[]) => {
    const response = await fetch('/api/upload/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data })
    })
    
    if (!response.ok) {
      throw new Error('商品資料上傳失敗')
    }
  }

  const handleOrderData = async (data: Record<string, any>[]) => {
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
    }
  })

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="mb-6">
            <Link href="/" className="text-blue-600 hover:text-blue-800">
              ← 回首頁
            </Link>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            Excel 資料上傳
          </h1>

          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive 
                ? 'border-blue-400 bg-blue-50' 
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <input {...getInputProps()} />
            <div className="space-y-4">
              <div className="text-4xl">📁</div>
              {isDragActive ? (
                <p className="text-lg text-blue-600">放開來上傳檔案...</p>
              ) : (
                <div>
                  <p className="text-lg text-gray-600">拖拽檔案到這裡，或點擊選擇檔案</p>
                  <p className="text-sm text-gray-500 mt-2">支援 .xlsx 和 .xls 格式</p>
                </div>
              )}
            </div>
          </div>

          {uploading && (
            <div className="mt-4 p-4 bg-blue-100 rounded-md">
              <p className="text-blue-800">上傳中...</p>
            </div>
          )}

          {message && (
            <div className={`mt-4 p-4 rounded-md ${
              message.includes('成功') 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              <p>{message}</p>
            </div>
          )}

          <div className="mt-8 text-sm text-gray-600">
            <h3 className="font-semibold mb-2">使用說明：</h3>
            <ul className="list-disc list-inside space-y-1">
              <li>上傳檔名包含「商品報表」的 Excel 檔案處理商品資料</li>
              <li>上傳檔名包含「訂單報表」的 Excel 檔案處理訂單資料</li>
              <li>系統會自動比對並建立新商品的分類資料</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}