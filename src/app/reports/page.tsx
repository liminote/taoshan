'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface SalesData {
  month: string
  amount: number
  quantity: number
}

export default function ReportsPage() {
  const [salesData, setSalesData] = useState<SalesData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSalesData()
  }, [])

  const fetchSalesData = async () => {
    try {
      const response = await fetch('/api/reports/monthly-sales')
      if (response.ok) {
        const data = await response.json()
        setSalesData(data)
      }
    } catch (error) {
      console.error('取得報表資料失敗:', error)
    } finally {
      setLoading(false)
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
            <Link href="/" className="text-blue-600 hover:text-blue-800">
              ← 回首頁
            </Link>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            銷售報表
          </h1>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 月銷售金額 */}
            <div className="bg-white border rounded-lg p-4">
              <h2 className="text-lg font-semibold mb-4">月銷售金額</h2>
              {salesData.length > 0 ? (
                <div className="space-y-2">
                  {salesData.map((item, index) => (
                    <div key={index} className="flex justify-between items-center py-2 border-b">
                      <span>{item.month}</span>
                      <span className="font-medium">NT$ {item.amount.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">暫無資料</p>
              )}
            </div>

            {/* 月銷售數量 */}
            <div className="bg-white border rounded-lg p-4">
              <h2 className="text-lg font-semibold mb-4">月銷售數量</h2>
              {salesData.length > 0 ? (
                <div className="space-y-2">
                  {salesData.map((item, index) => (
                    <div key={index} className="flex justify-between items-center py-2 border-b">
                      <span>{item.month}</span>
                      <span className="font-medium">{item.quantity.toLocaleString()} 件</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">暫無資料</p>
              )}
            </div>
          </div>

          {/* 操作按鈕 */}
          <div className="mt-8 flex flex-wrap gap-4">
            <Link 
              href="/reports/categories"
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              分類管理
            </Link>
            
            <button 
              onClick={fetchSalesData}
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
            >
              重新整理資料
            </button>
          </div>

          {salesData.length === 0 && (
            <div className="mt-8 p-4 bg-yellow-100 rounded-md">
              <p className="text-yellow-800">
                尚無資料顯示。請先<Link href="/upload" className="underline font-medium">上傳 Excel 檔案</Link>來導入資料。
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}