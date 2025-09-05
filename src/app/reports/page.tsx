'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

interface MonthlySalesData {
  month: string
  monthDisplay: string
  amount: number
  orderCount: number
  avgOrderValue: number
  productItemCount: number
}

interface DiscountData {
  month: string
  monthDisplay: string
  discountAmount: number
}

interface CategoryData {
  category: string
  amount: number
  percentage: number
}

export default function ReportsPage() {
  const [salesData, setSalesData] = useState<MonthlySalesData[]>([])
  const [discountData, setDiscountData] = useState<DiscountData[]>([])
  const [categoryData, setCategoryData] = useState<CategoryData[]>([])
  const [smallCategoryData, setSmallCategoryData] = useState<CategoryData[]>([])
  const [loading, setLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null)
  const [cachedData, setCachedData] = useState<{
    salesData?: MonthlySalesData[]
    discountData?: DiscountData[]
    categoryData?: CategoryData[]
    smallCategoryData?: CategoryData[]
    timestamp?: Date
  }>({})

  // 設計系統 10 色配色盤
  const chartColors = [
    '#90DBF4', // 天空藍
    '#FFCFD2', // 蜜瓜粉
    '#98F5E1', // 薄荷綠
    '#A3C4F3', // 長春花藍
    '#FDE4CF', // 淺鹿色
    '#8EECF5', // 海藍綠
    '#F1C0E8', // 薰衣草粉
    '#B9FBC0', // 茶綠色
    '#CFBAF0', // 淺紫色
    '#FBF8CC'  // 檸檬黃
  ]

  useEffect(() => {
    fetchAllData()
  }, [])

  const fetchAllData = useCallback(async (forceRefresh = false) => {
    const now = new Date()
    const cacheExpireTime = 5 * 60 * 1000 // 5分鐘緩存
    
    // 檢查是否有有效的緩存資料
    if (!forceRefresh && cachedData.timestamp && (now.getTime() - cachedData.timestamp.getTime() < cacheExpireTime)) {
      setSalesData(cachedData.salesData || [])
      setDiscountData(cachedData.discountData || [])
      setCategoryData(cachedData.categoryData || [])
      setSmallCategoryData(cachedData.smallCategoryData || [])
      setLoading(false)
      return
    }

    if (forceRefresh) {
      setIsRefreshing(true)
    }
    
    try {
      const [salesResponse, discountResponse, categoryResponse, smallCategoryResponse] = await Promise.all([
        fetch('/api/reports/monthly-sales'),
        fetch('/api/reports/discount-trends'),
        fetch('/api/reports/category-distribution'),
        fetch('/api/reports/small-category-distribution')
      ])

      let newSalesData: MonthlySalesData[] = []
      let newDiscountData: DiscountData[] = []
      let newCategoryData: CategoryData[] = []
      let newSmallCategoryData: CategoryData[] = []

      if (salesResponse.ok) {
        const salesResult = await salesResponse.json()
        newSalesData = salesResult.data || salesResult
        setSalesData(newSalesData)
      }

      if (discountResponse.ok) {
        const discountResult = await discountResponse.json()
        newDiscountData = discountResult.data || discountResult
        setDiscountData(newDiscountData)
      }

      if (categoryResponse.ok) {
        const categoryResult = await categoryResponse.json()
        newCategoryData = categoryResult.data || categoryResult
        setCategoryData(newCategoryData)
      }

      if (smallCategoryResponse.ok) {
        const smallCategoryResult = await smallCategoryResponse.json()
        newSmallCategoryData = smallCategoryResult.data || smallCategoryResult
        setSmallCategoryData(newSmallCategoryData)
      }

      // 更新緩存
      setCachedData({
        salesData: newSalesData,
        discountData: newDiscountData,
        categoryData: newCategoryData,
        smallCategoryData: newSmallCategoryData,
        timestamp: now
      })
      
      setLastRefreshTime(now)
    } catch (error) {
      console.error('取得報表資料失敗:', error)
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }, [cachedData])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 shadow-lg animate-pulse" style={{ backgroundColor: '#A3C4F3' }}>
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <p className="text-xl text-gray-600">載入報表資料中...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
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
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-purple-400 rounded-2xl flex items-center justify-center shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-800">
                  銷售報表
                </h1>
                <p className="text-gray-600 mt-1">追蹤你的餐廳業績表現</p>
              </div>
            </div>
            
            {/* 緩存狀態和手動刷新按鈕 */}
            <div className="flex items-center space-x-4">
              {lastRefreshTime && (
                <div className="text-sm text-gray-500">
                  <p>上次更新：{lastRefreshTime.toLocaleTimeString('zh-TW')}</p>
                  <p className="text-xs">數據緩存5分鐘</p>
                </div>
              )}
              <button 
                onClick={() => fetchAllData(true)}
                disabled={isRefreshing}
                className="group inline-flex items-center px-4 py-2 bg-pink-400 text-white rounded-xl hover:shadow-lg transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className={`w-4 h-4 mr-2 transition-transform duration-300 ${isRefreshing ? 'animate-spin' : 'group-hover:rotate-180'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span className="text-sm font-semibold">
                  {isRefreshing ? '更新中...' : '更新數據'}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* 報表圖表區域 */}
        <div className="space-y-8 mb-8">
          {/* 1. 月銷售金額趨勢圖 */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-lg">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 bg-pink-400 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-900">月銷售金額</h2>
            </div>
            
            {salesData.length > 0 ? (
              <div className="h-80">
                <div className="flex items-end justify-between h-64 px-2 py-4 space-x-1">
                  {salesData.slice().reverse().map((item, index) => {
                    const maxAmount = Math.max(...salesData.map(s => s.amount))
                    const height = maxAmount > 0 ? (item.amount / maxAmount) * 240 : 0
                    
                    return (
                      <div key={index} className="flex flex-col items-center flex-1 group">
                        <div 
                          className="w-full rounded-t-sm transition-all duration-300 relative"
                          style={{ 
                            height: `${height}px`,
                            backgroundColor: '#FFCFD2'
                          }}
                        >
                          <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-gray-900 text-xs font-medium whitespace-nowrap">
                            {Math.round(item.amount).toLocaleString()}
                          </div>
                        </div>
                        <div className="text-xs text-gray-600 mt-2 transform -rotate-45 origin-left whitespace-nowrap">
                          {item.monthDisplay}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <p>暫無銷售資料</p>
              </div>
            )}
          </div>

          {/* 2. 平均單價趨勢圖 */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-lg">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 bg-orange-400 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-900">平均單價</h2>
            </div>
            
            {salesData.length > 0 ? (
              <div className="h-80">
                <div className="flex items-end justify-between h-64 px-2 py-4 space-x-1">
                  {salesData.slice().reverse().map((item, index) => {
                    const maxAvg = Math.max(...salesData.map(s => s.avgOrderValue))
                    const height = maxAvg > 0 ? (item.avgOrderValue / maxAvg) * 240 : 0
                    
                    return (
                      <div key={index} className="flex flex-col items-center flex-1 group">
                        <div 
                          className="w-full rounded-t-sm transition-all duration-300 relative"
                          style={{ 
                            height: `${height}px`,
                            backgroundColor: '#FDE4CF'
                          }}
                        >
                          <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-gray-900 text-xs font-medium whitespace-nowrap">
                            {Math.round(item.avgOrderValue).toLocaleString()}
                          </div>
                        </div>
                        <div className="text-xs text-gray-600 mt-2 transform -rotate-45 origin-left whitespace-nowrap">
                          {item.monthDisplay}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <p>暫無平均單價資料</p>
              </div>
            )}
          </div>

          {/* 3. 折扣金額趨勢圖 */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-lg">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#FBF8CC' }}>
                <svg className="w-5 h-5 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-900">折扣金額</h2>
            </div>
            
            {discountData.length > 0 ? (
              <div className="h-80">
                <div className="flex items-end justify-between h-64 px-2 py-4 space-x-1">
                  {discountData.slice().reverse().map((item, index) => {
                    const maxDiscount = Math.max(...discountData.map(s => s.discountAmount))
                    const height = maxDiscount > 0 ? (item.discountAmount / maxDiscount) * 240 : 0
                    
                    return (
                      <div key={index} className="flex flex-col items-center flex-1 group">
                        <div 
                          className="w-full rounded-t-sm transition-all duration-300 group-hover:opacity-80 relative"
                          style={{ height: `${height}px`, backgroundColor: '#FBF8CC' }}
                        >
                          <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-gray-900 text-xs font-medium whitespace-nowrap">
                            {Math.round(item.discountAmount).toLocaleString()}
                          </div>
                        </div>
                        <div className="text-xs text-gray-600 mt-2 transform -rotate-45 origin-left whitespace-nowrap">
                          {item.monthDisplay}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <p>暫無折扣資料</p>
              </div>
            )}
          </div>

          {/* 4. 分類佔比圓餅圖 - 大分類與小分類並排 */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* 大分類佔比 */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-lg">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 bg-pink-400 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-gray-900">大分類佔比</h2>
              </div>
              
              {categoryData.length > 0 ? (
                <div className="h-80 flex flex-col items-center">
                  {/* 圓餅圖 */}
                  <div className="relative w-48 h-48 mb-4">
                    <svg width="192" height="192" className="transform -rotate-90">
                      {(() => {
                        let currentAngle = 0
                        const radius = 80
                        const centerX = 96
                        const centerY = 96
                        
                        return categoryData.slice(0, 8).map((item, index) => {
                          const angle = (item.percentage / 100) * 360
                          const startAngle = currentAngle
                          const endAngle = currentAngle + angle
                          currentAngle += angle
                          
                          const startAngleRad = (startAngle * Math.PI) / 180
                          const endAngleRad = (endAngle * Math.PI) / 180
                          
                          const x1 = centerX + radius * Math.cos(startAngleRad)
                          const y1 = centerY + radius * Math.sin(startAngleRad)
                          const x2 = centerX + radius * Math.cos(endAngleRad)
                          const y2 = centerY + radius * Math.sin(endAngleRad)
                          
                          const largeArcFlag = angle > 180 ? 1 : 0
                          
                          const pathData = `M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`
                          
                          return (
                            <path
                              key={index}
                              d={pathData}
                              fill={chartColors[index % chartColors.length]}
                              stroke="white"
                              strokeWidth="2"
                              className="hover:opacity-80 transition-opacity"
                            />
                          )
                        })
                      })()}
                    </svg>
                  </div>
                  
                  {/* 圖例 */}
                  <div className="w-full">
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {categoryData.slice(0, 8).map((item, index) => (
                        <div key={index} className="flex justify-between items-center p-1 bg-gray-50 rounded text-xs">
                          <div className="flex items-center space-x-2">
                            <div 
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: chartColors[index % chartColors.length] }}
                            ></div>
                            <span className="font-medium text-gray-700">{item.category}</span>
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-gray-900">{item.percentage.toFixed(1)}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <p>暫無大分類資料</p>
                </div>
              )}
            </div>

            {/* 小分類佔比 */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-lg">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 bg-pink-400 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-gray-900">小分類佔比</h2>
              </div>
              
              {smallCategoryData.length > 0 ? (
                <div className="h-96 flex flex-col items-center">
                  {/* 圓餅圖 */}
                  <div className="relative w-64 h-64 mb-4">
                    <svg width="256" height="256" className="transform -rotate-90">
                      {(() => {
                        // 處理數據：取前8名，其餘合併為「其他」
                        let processedData = [...smallCategoryData]
                        if (processedData.length > 9) {
                          const top8 = processedData.slice(0, 8)
                          const others = processedData.slice(8)
                          const othersTotal = others.reduce((sum, item) => sum + item.amount, 0)
                          const othersPercentage = others.reduce((sum, item) => sum + item.percentage, 0)
                          
                          processedData = [
                            ...top8,
                            {
                              category: '其他',
                              amount: othersTotal,
                              percentage: othersPercentage
                            }
                          ]
                        }
                        
                        let currentAngle = 0
                        const radius = 110
                        const centerX = 128
                        const centerY = 128
                        
                        return processedData.map((item, index) => {
                          const angle = (item.percentage / 100) * 360
                          const startAngle = currentAngle
                          const endAngle = currentAngle + angle
                          currentAngle += angle
                          
                          const startAngleRad = (startAngle * Math.PI) / 180
                          const endAngleRad = (endAngle * Math.PI) / 180
                          
                          const x1 = centerX + radius * Math.cos(startAngleRad)
                          const y1 = centerY + radius * Math.sin(startAngleRad)
                          const x2 = centerX + radius * Math.cos(endAngleRad)
                          const y2 = centerY + radius * Math.sin(endAngleRad)
                          
                          const largeArcFlag = angle > 180 ? 1 : 0
                          
                          const pathData = `M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`
                          
                          return (
                            <g key={index}>
                              <path
                                d={pathData}
                                fill={chartColors[index % chartColors.length]}
                                stroke="white"
                                strokeWidth="2"
                                className="hover:opacity-80 transition-opacity cursor-pointer"
                              />
                              <title>
                                {item.category}: {Math.round(item.amount).toLocaleString()} ({item.percentage.toFixed(1)}%)
                              </title>
                            </g>
                          )
                        })
                      })()}
                    </svg>
                  </div>
                  
                  {/* 圖例 */}
                  <div className="w-full">
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {(() => {
                        // 處理數據：取前8名，其餘合併為「其他」
                        let processedData = [...smallCategoryData]
                        if (processedData.length > 9) {
                          const top8 = processedData.slice(0, 8)
                          const others = processedData.slice(8)
                          const othersTotal = others.reduce((sum, item) => sum + item.amount, 0)
                          const othersPercentage = others.reduce((sum, item) => sum + item.percentage, 0)
                          
                          processedData = [
                            ...top8,
                            {
                              category: '其他',
                              amount: othersTotal,
                              percentage: othersPercentage
                            }
                          ]
                        }
                        
                        return processedData.map((item, index) => (
                        <div key={index} className="flex justify-between items-center p-1 bg-gray-50 rounded text-xs">
                          <div className="flex items-center space-x-2">
                            <div 
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: chartColors[index % chartColors.length] }}
                            ></div>
                            <span className="font-medium text-gray-700">{item.category}</span>
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-gray-900">{item.percentage.toFixed(1)}%</span>
                          </div>
                        </div>
                        ))
                      })()}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <p>暫無小分類資料</p>
                </div>
              )}
            </div>
          </div>

          {/* 6. 商品品項數趨勢圖 */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-lg">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 bg-green-400 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-900">商品品項數</h2>
            </div>
            
            {salesData.length > 0 ? (
              <div className="h-80">
                <div className="flex items-end justify-between h-64 px-2 py-4 space-x-1">
                  {salesData.slice().reverse().map((item, index) => {
                    const maxItems = Math.max(...salesData.map(s => s.productItemCount))
                    const height = maxItems > 0 ? (item.productItemCount / maxItems) * 240 : 1 // 至少1px高度以顯示條
                    
                    return (
                      <div key={index} className="flex flex-col items-center flex-1 group">
                        <div 
                          className="w-full rounded-t-sm transition-all duration-300 relative"
                          style={{ 
                            height: `${height}px`,
                            backgroundColor: '#98F5E1'
                          }}
                        >
                          <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-gray-900 text-xs font-medium whitespace-nowrap">
                            {item.productItemCount} 種
                          </div>
                        </div>
                        <div className="text-xs text-gray-600 mt-2 transform -rotate-45 origin-left whitespace-nowrap">
                          {item.monthDisplay}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <p>暫無商品品項資料</p>
              </div>
            )}
          </div>
        </div>

        {/* 操作按鈕區域 */}
        <div className="flex flex-wrap gap-4 mb-8">
          <Link 
            href="/reports/categories"
            className="group inline-flex items-center px-6 py-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:shadow-lg transition-all duration-300 hover:scale-105"
          >
            <svg className="w-5 h-5 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
            <span className="font-semibold text-gray-900 group-hover:text-purple-600 transition-colors">分類管理</span>
          </Link>
          
          <button 
            onClick={() => fetchAllData(true)}
            disabled={isRefreshing}
            className="group inline-flex items-center px-6 py-3 bg-pink-400 text-white rounded-lg hover:shadow-lg transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className={`w-5 h-5 mr-2 transition-transform duration-300 ${isRefreshing ? 'animate-spin' : 'group-hover:rotate-180'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span className="font-semibold">
              {isRefreshing ? '更新中...' : '重新整理'}
            </span>
          </button>
        </div>

        {/* 空狀態提示 */}
        {salesData.length === 0 && (
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-8 text-center">
            <div className="w-16 h-16 bg-pink-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">尚無報表資料</h3>
            <p className="text-gray-600 mb-4">
              請先上傳 Excel 檔案來導入銷售資料，才能查看報表統計。
            </p>
            <Link 
              href="/upload" 
              className="inline-flex items-center px-6 py-3 bg-pink-400 text-white rounded-lg hover:shadow-lg transition-all duration-300 hover:scale-105"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <span className="font-semibold">立即上傳資料</span>
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}