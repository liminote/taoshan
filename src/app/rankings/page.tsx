'use client'

import { useState, useEffect } from 'react'

interface RankingItem {
  rank: number
  name: string
  quantity: number
  amount: number
  category: string
}

interface RankingData {
  quantityRanking: RankingItem[]
  amountRanking: RankingItem[]
  alcoholRanking: RankingItem[]
  totals: {
    totalQuantity: number
    totalAmount: number
    totalProducts: number
  }
}

export default function RankingsPage() {
  const [data, setData] = useState<RankingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7))

  const fetchRankings = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/reports/rankings?month=${selectedMonth}`)
      const result = await response.json()
      
      if (result.success) {
        setData(result.data)
      } else {
        setError(result.error || '載入失敗')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '載入失敗')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRankings()
  }, [selectedMonth])

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('zh-TW').format(num)
  }

  const formatDate = (month: string) => {
    const date = new Date(`${month}-01`)
    return date.toLocaleDateString('zh-TW', { 
      year: 'numeric', 
      month: 'long' 
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl text-gray-600">載入中...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl text-red-600">錯誤: {error}</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* 頁面標題 */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-gray-900">當月數字</h1>
            <div className="flex items-center space-x-4">
              <label className="text-sm font-medium text-gray-700">選擇月份：</label>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <p className="text-gray-600">{formatDate(selectedMonth)} 商品銷售排行榜</p>
        </div>

        {/* 總計摘要 */}
        {data && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-2xl font-bold text-blue-600">{formatNumber(data.totals.totalQuantity)}</div>
              <div className="text-sm text-gray-600">總銷量</div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-2xl font-bold text-green-600">{formatNumber(data.totals.totalAmount)}</div>
              <div className="text-sm text-gray-600">總銷額</div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-2xl font-bold text-purple-600">{formatNumber(data.totals.totalProducts)}</div>
              <div className="text-sm text-gray-600">商品種類</div>
            </div>
          </div>
        )}

        {/* 排名表格 */}
        {data && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* 銷量排名 */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="bg-yellow-400 px-6 py-4">
                <h2 className="text-lg font-semibold text-gray-900">銷量排名</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">排名</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">商品名稱</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">數量</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">結帳金額</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {data.quantityRanking.map((item, index) => (
                      <tr key={index} className={`${index < 3 ? 'bg-yellow-50' : ''}`}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {item.rank}.
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 max-w-xs truncate">
                          {item.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                          {formatNumber(item.quantity)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                          {formatNumber(item.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 銷額排名 */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="bg-green-400 px-6 py-4">
                <h2 className="text-lg font-semibold text-gray-900">銷額排名</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">排名</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">商品名稱</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">數量</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">結帳金額 ↓</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {data.amountRanking.map((item, index) => (
                      <tr key={index} className={`${index < 3 ? 'bg-green-50' : ''}`}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {item.rank}.
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 max-w-xs truncate">
                          {item.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                          {formatNumber(item.quantity)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                          {formatNumber(item.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* 酒水排名 */}
        {data && data.alcoholRanking.length > 0 && (
          <div className="mt-8">
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="bg-cyan-400 px-6 py-4">
                <h2 className="text-lg font-semibold text-gray-900">酒水排名</h2>
                <p className="text-sm text-gray-700">大分類為 6酒水</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">大分類</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">商品名稱</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">商品銷量</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">結帳金額</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {data.alcoholRanking.map((item, index) => (
                      <tr key={index} className={`${index < 3 ? 'bg-cyan-50' : ''}`}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.category}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 max-w-xs truncate">
                          {item.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                          {formatNumber(item.quantity)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                          {formatNumber(item.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 空狀態 */}
        {data && data.alcoholRanking.length === 0 && (
          <div className="mt-8">
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <div className="text-gray-500">本月無酒水類商品銷售記錄</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}