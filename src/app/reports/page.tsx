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

export default function ReportsPage() {
  // Tab state
  const [activeTab, setActiveTab] = useState<'trends' | 'monthly'>('trends')
  
  // Common loading states
  const [loading, setLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null)
  
  // Trends tab data (all time data - no filtering)
  const [salesData, setSalesData] = useState<MonthlySalesData[]>([])
  const [discountData, setDiscountData] = useState<DiscountData[]>([])
  
  // Monthly tab data (filtered by selected month)
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const currentDate = new Date()
    return `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`
  })
  const [monthlyCategoryData, setMonthlyCategoryData] = useState<CategoryData[]>([])
  const [monthlySmallCategoryData, setMonthlySmallCategoryData] = useState<CategoryData[]>([])
  const [rankingData, setRankingData] = useState<RankingData | null>(null)

  // Cache for trends data
  const [cachedData, setCachedData] = useState<{
    salesData?: MonthlySalesData[]
    discountData?: DiscountData[]
    timestamp?: Date
  }>({})

  // 設計系統 10 色配色盤
  const chartColors = [
    '#90DBF4', // 天空藍
    '#FFCFD2', // 蜜瓜粉
    '#98F5E1', // 薄荷綠
    '#A3C4F3', // 長春花藍
    '#CFBCF2', // 淡紫色
    '#A8E6CF', // 水綠色
    '#FFE5CC', // 淺桃色
    '#B5E7A0', // 茶綠色
    '#D7A3D7', // 淡紫羅蘭
    '#FFFACD'  // 檸檬薄荷色
  ]

  // 格式化數字
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('zh-TW').format(num)
  }

  // Fetch trends data (used for 趨勢觀測 tab)
  const fetchTrendsData = useCallback(async (forceRefresh = false) => {
    const now = new Date()
    const cacheExpireTime = 5 * 60 * 1000 // 5分鐘緩存
    
    // 檢查是否有有效的緩存資料
    if (!forceRefresh && cachedData.timestamp && (now.getTime() - cachedData.timestamp.getTime() < cacheExpireTime)) {
      setSalesData(cachedData.salesData || [])
      setDiscountData(cachedData.discountData || [])
      setLoading(false)
      return
    }

    if (forceRefresh) {
      setIsRefreshing(true)
    }

    try {
      const [salesResponse, discountResponse] = await Promise.all([
        fetch('/api/reports/monthly-sales'),
        fetch('/api/reports/discount-trends')
      ])

      let newSalesData: MonthlySalesData[] = []
      let newDiscountData: DiscountData[] = []

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

      // 更新緩存
      setCachedData({
        salesData: newSalesData,
        discountData: newDiscountData,
        timestamp: now
      })

      setLastRefreshTime(now)
    } catch (error) {
      console.error('獲取趨勢資料失敗:', error)
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }, [cachedData])

  // Fetch monthly category data (used for 當月數字 tab)
  const fetchMonthlyCategoryData = useCallback(async (month: string) => {
    try {
      const [categoryResponse, smallCategoryResponse, rankingResponse] = await Promise.all([
        fetch(`/api/reports/category-distribution?month=${month}`),
        fetch(`/api/reports/small-category-distribution?month=${month}`),
        fetch(`/api/reports/rankings?month=${month}`)
      ])

      if (categoryResponse.ok) {
        const categoryResult = await categoryResponse.json()
        setMonthlyCategoryData(categoryResult.data || categoryResult)
      } else {
        setMonthlyCategoryData([])
      }

      if (smallCategoryResponse.ok) {
        const smallCategoryResult = await smallCategoryResponse.json()
        setMonthlySmallCategoryData(smallCategoryResult.data || smallCategoryResult)
      } else {
        setMonthlySmallCategoryData([])
      }

      if (rankingResponse.ok) {
        const rankingResult = await rankingResponse.json()
        setRankingData(rankingResult.data || null)
      } else {
        setRankingData(null)
      }
    } catch (error) {
      console.error('獲取月份分類資料失敗:', error)
      setMonthlyCategoryData([])
      setMonthlySmallCategoryData([])
      setRankingData(null)
    }
  }, [])

  // Initial data fetch and setup
  useEffect(() => {
    fetchTrendsData()
  }, [fetchTrendsData])

  // Fetch category data when selected month changes
  useEffect(() => {
    if (activeTab === 'monthly') {
      fetchMonthlyCategoryData(selectedMonth)
    }
  }, [selectedMonth, activeTab, fetchMonthlyCategoryData])

  // Refresh handler
  const handleRefresh = () => {
    if (activeTab === 'trends') {
      fetchTrendsData(true)
    } else {
      fetchMonthlyCategoryData(selectedMonth)
    }
  }

  // Generate SVG bar chart for trends
  const generateBarChart = (data: MonthlySalesData[] | DiscountData[], dataKey: string, height: number = 200, color: string) => {
    if (!data || data.length === 0) return null

    // 取最新13個月並反轉順序（最新在左邊）
    const chartData = data.slice(-13).reverse()
    const maxValue = Math.max(...chartData.map(item => item[dataKey]))
    
    return (
      <div className="w-full">
        <svg width="100%" height={height + 80} className="drop-shadow-sm" viewBox={`0 0 1700 ${height + 80}`}>
          {/* Y axis labels */}
          {(() => {
            // 計算合適的刻度間隔
            const getTickInterval = (max: number) => {
              // 目標是產生約 4-6 個刻度
              const roughInterval = max / 5
              
              // 找到適當的 10 的次方作為基數
              const magnitude = Math.pow(10, Math.floor(Math.log10(roughInterval)))
              
              // 將粗略間隔標準化為 1, 2, 5 的倍數
              const normalized = roughInterval / magnitude
              
              let niceInterval
              if (normalized <= 1) {
                niceInterval = magnitude
              } else if (normalized <= 2) {
                niceInterval = 2 * magnitude
              } else if (normalized <= 5) {
                niceInterval = 5 * magnitude
              } else {
                niceInterval = 10 * magnitude
              }
              
              return niceInterval
            }
            
            const tickInterval = getTickInterval(maxValue)
            const tickCount = Math.ceil(maxValue / tickInterval)
            const actualMax = tickCount * tickInterval
            
            const ticks = []
            for (let i = 0; i <= tickCount; i++) {
              ticks.push(i * tickInterval)
            }
            
            return ticks.map((tickValue, index) => {
              const y = height - (tickValue / actualMax) * height + 20
              return (
                <g key={index}>
                  <line x1="120" y1={y} x2="1620" y2={y} stroke="#e5e7eb" strokeWidth="1" />
                  <text x="75" y={y + 4} textAnchor="end" className="text-sm fill-gray-500">
                    {Math.floor(tickValue).toLocaleString()}
                  </text>
                </g>
              )
            })
          })()}
          
          {/* Bars */}
          {(() => {
            // 重新計算 actualMax 用於柱子高度
            const getTickInterval = (max: number) => {
              // 目標是產生約 4-6 個刻度
              const roughInterval = max / 5
              
              // 找到適當的 10 的次方作為基數
              const magnitude = Math.pow(10, Math.floor(Math.log10(roughInterval)))
              
              // 將粗略間隔標準化為 1, 2, 5 的倍數
              const normalized = roughInterval / magnitude
              
              let niceInterval
              if (normalized <= 1) {
                niceInterval = magnitude
              } else if (normalized <= 2) {
                niceInterval = 2 * magnitude
              } else if (normalized <= 5) {
                niceInterval = 5 * magnitude
              } else {
                niceInterval = 10 * magnitude
              }
              
              return niceInterval
            }
            
            const tickInterval = getTickInterval(maxValue)
            const tickCount = Math.ceil(maxValue / tickInterval)
            const actualMax = tickCount * tickInterval
            
            return chartData.map((item, index) => {
              const barHeight = (item[dataKey] / actualMax) * height
              const barWidth = 80 // 固定柱子寬度
              const spacing = 40 // 固定間距
              const x = 120 + index * (barWidth + spacing)
              const y = height - barHeight + 20
              
              return (
                <g key={index}>
                  {/* Bar */}
                  <rect
                    x={x}
                    y={y}
                    width={barWidth}
                    height={barHeight}
                    fill={color}
                    className="hover:opacity-80 transition-opacity"
                  />
                  
                  {/* Value on top of bar */}
                  <text
                    x={x + barWidth / 2}
                    y={y - 5}
                    textAnchor="middle"
                    className="text-base fill-gray-700 font-medium"
                  >
                    {Math.floor(item[dataKey]).toLocaleString()}
                  </text>
                  
                  {/* Month label */}
                  <text
                    x={x + barWidth / 2}
                    y={height + 45}
                    textAnchor="middle"
                    className="text-sm fill-gray-600"
                  >
                    {item.monthDisplay.replace('年', '/').replace('月', '')}
                  </text>
                </g>
              )
            })
          })()}
        </svg>
      </div>
    )
  }

  // Generate SVG pie chart
  const generatePieChart = (data: CategoryData[], size: number = 200) => {
    if (!data || data.length === 0) return null

    // 如果超過9個分類，將第9名之後的合併成「其他」
    let chartData = [...data]
    if (chartData.length > 9) {
      const top8 = chartData.slice(0, 8)
      const others = chartData.slice(8)
      const othersAmount = others.reduce((sum, item) => sum + item.amount, 0)
      const othersPercentage = others.reduce((sum, item) => sum + item.percentage, 0)
      
      chartData = [
        ...top8,
        {
          category: '其他',
          amount: othersAmount,
          percentage: Math.round(othersPercentage * 10) / 10
        }
      ]
    }

    const radius = size / 2 - 10
    const centerX = size / 2
    const centerY = size / 2
    
    let currentAngle = 0
    
    return (
      <svg width={size} height={size} className="drop-shadow-sm">
        {chartData.map((item, index) => {
          const percentage = item.percentage
          const angle = (percentage / 100) * 360
          const startAngle = currentAngle
          const endAngle = currentAngle + angle
          
          const x1 = centerX + radius * Math.cos((startAngle - 90) * Math.PI / 180)
          const y1 = centerY + radius * Math.sin((startAngle - 90) * Math.PI / 180)
          const x2 = centerX + radius * Math.cos((endAngle - 90) * Math.PI / 180)
          const y2 = centerY + radius * Math.sin((endAngle - 90) * Math.PI / 180)
          
          const largeArcFlag = angle > 180 ? 1 : 0
          
          const pathData = [
            `M ${centerX} ${centerY}`,
            `L ${x1} ${y1}`,
            `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
            'Z'
          ].join(' ')
          
          currentAngle += angle
          
          return (
            <path
              key={item.category}
              d={pathData}
              fill={chartColors[index % chartColors.length]}
              className="hover:opacity-80 transition-opacity cursor-pointer"
            >
              <title>{`${item.category}: NT$ ${item.amount.toLocaleString()} (${item.percentage}%)`}</title>
            </path>
          )
        })}
      </svg>
    )
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-400 rounded-2xl mb-4 shadow-lg animate-pulse">
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
                  報表管理
                </h1>
                <p className="text-gray-600 mt-1">數據分析與報表檢視</p>
              </div>
            </div>
            
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="inline-flex items-center px-4 py-2 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              <svg 
                className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {isRefreshing ? '更新中...' : '刷新資料'}
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mb-8">
          <div className="bg-white rounded-xl shadow-sm p-1 inline-flex">
            <button
              onClick={() => setActiveTab('trends')}
              className={`px-6 py-3 rounded-lg font-medium transition-all ${
                activeTab === 'trends'
                  ? 'bg-purple-400 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              趨勢觀測
            </button>
            <button
              onClick={() => setActiveTab('monthly')}
              className={`px-6 py-3 rounded-lg font-medium transition-all ${
                activeTab === 'monthly'
                  ? 'bg-purple-400 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              當月數字
            </button>
          </div>
        </div>

        {/* Trends Tab Content */}
        {activeTab === 'trends' && (
          <div className="space-y-8">
            {/* 月銷售統計 */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#90DBF4' }}>
                  <svg className="w-5 h-5 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-gray-900">月銷售統計</h2>
              </div>

              {generateBarChart(salesData, 'amount', 200, '#90DBF4')}
            </div>

            {/* 平均單價統計 */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#FFCFD2' }}>
                  <svg className="w-5 h-5 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-gray-900">平均單價統計</h2>
              </div>

              {generateBarChart(salesData, 'avgOrderValue', 200, '#FFCFD2')}
            </div>

            {/* 折扣金額統計 */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#FFFACD' }}>
                  <svg className="w-5 h-5 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-gray-900">折扣金額統計</h2>
              </div>

              {generateBarChart(discountData, 'discountAmount', 200, '#FFFACD')}
            </div>

            {/* 商品品項數統計 */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#98F5E1' }}>
                  <svg className="w-5 h-5 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-gray-900">商品品項數統計</h2>
              </div>

              {generateBarChart(salesData, 'productItemCount', 200, '#98F5E1')}
            </div>

            {lastRefreshTime && (
              <div className="text-center text-sm text-gray-500">
                最後更新時間：{lastRefreshTime.toLocaleString('zh-TW')}
              </div>
            )}
          </div>
        )}

        {/* Monthly Tab Content */}
        {activeTab === 'monthly' && (
          <div className="space-y-8">
            {/* 月份篩選器 */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
              <div className="flex items-center space-x-4">
                <label htmlFor="month-select" className="text-lg font-medium text-gray-700">
                  選擇月份：
                </label>
                <select
                  id="month-select"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="px-4 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent text-gray-900 min-w-[140px]"
                >
                  {/* 生成最近13個月的選項 */}
                  {Array.from({ length: 13 }, (_, i) => {
                    const date = new Date()
                    date.setMonth(date.getMonth() - i)
                    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
                    const monthDisplay = `${date.getFullYear()}年${String(date.getMonth() + 1).padStart(2, '0')}月`
                    return (
                      <option key={monthKey} value={monthKey}>
                        {monthDisplay}
                      </option>
                    )
                  })}
                </select>
              </div>
            </div>

            {/* 大分類分布 */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#A3C4F3' }}>
                  <svg className="w-5 h-5 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-gray-900">大分類分布</h2>
              </div>

              <div className="flex flex-col lg:flex-row items-center lg:items-start space-y-6 lg:space-y-0 lg:space-x-8">
                <div className="flex-shrink-0">
                  {generatePieChart(monthlyCategoryData, 260)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {monthlyCategoryData.map((item, index) => (
                      <div
                        key={item.category}
                        className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div
                          className="w-4 h-4 rounded-full flex-shrink-0"
                          style={{ backgroundColor: chartColors[index % chartColors.length] }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900 truncate">{item.category}</div>
                          <div className="text-sm text-gray-600">
                            {item.amount.toLocaleString()} ({item.percentage}%)
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* 小分類分布 */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#CFBCF2' }}>
                  <svg className="w-5 h-5 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-gray-900">小分類分布</h2>
              </div>

              <div className="flex flex-col lg:flex-row items-center lg:items-start space-y-6 lg:space-y-0 lg:space-x-8">
                <div className="flex-shrink-0">
                  {generatePieChart(monthlySmallCategoryData, 260)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {monthlySmallCategoryData.slice(0, 9).map((item, index) => (
                      <div
                        key={item.category}
                        className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div
                          className="w-4 h-4 rounded-full flex-shrink-0"
                          style={{ backgroundColor: chartColors[index % chartColors.length] }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900 truncate">{item.category}</div>
                          <div className="text-sm text-gray-600">
                            {item.amount.toLocaleString()} ({item.percentage}%)
                          </div>
                        </div>
                      </div>
                    ))}
                    {monthlySmallCategoryData.length > 9 && (
                      <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                        <div
                          className="w-4 h-4 rounded-full flex-shrink-0"
                          style={{ backgroundColor: chartColors[8] }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900 truncate">其他</div>
                          <div className="text-sm text-gray-600">
                            {monthlySmallCategoryData.slice(8).reduce((sum, item) => sum + item.amount, 0).toLocaleString()} 
                            ({Math.round(monthlySmallCategoryData.slice(8).reduce((sum, item) => sum + item.percentage, 0) * 10) / 10}%)
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* 商品排名 */}
            {rankingData && (
              <div className="space-y-8">
                {/* 總計摘要 */}
                <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#FFE5CC' }}>
                      <svg className="w-5 h-5 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <h2 className="text-xl font-bold text-gray-900">銷售總計</h2>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="text-center p-4 bg-blue-50 rounded-xl">
                      <div className="text-2xl font-bold text-blue-600">{formatNumber(rankingData.totals.totalQuantity)}</div>
                      <div className="text-sm text-gray-600 mt-1">總銷量</div>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-xl">
                      <div className="text-2xl font-bold text-green-600">NT$ {formatNumber(rankingData.totals.totalAmount)}</div>
                      <div className="text-sm text-gray-600 mt-1">總銷額</div>
                    </div>
                    <div className="text-center p-4 bg-purple-50 rounded-xl">
                      <div className="text-2xl font-bold text-purple-600">{formatNumber(rankingData.totals.totalProducts)}</div>
                      <div className="text-sm text-gray-600 mt-1">商品種類</div>
                    </div>
                  </div>
                </div>

                {/* 排名表格 */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                  
                  {/* 銷量排名 */}
                  <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                    <div className="px-6 py-4" style={{ backgroundColor: '#90DBF4' }}>
                      <h3 className="text-lg font-semibold text-gray-900">銷量排名 TOP 20</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">排名</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">商品名稱</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">數量</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">金額</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {rankingData.quantityRanking.slice(0, 20).map((item, index) => (
                            <tr key={index} className={`${index < 3 ? 'bg-blue-50' : ''} hover:bg-gray-50 transition-colors`}>
                              <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                                {index < 3 ? (
                                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold text-white" 
                                        style={{ backgroundColor: index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : '#CD7F32' }}>
                                    {item.rank}
                                  </span>
                                ) : (
                                  `${item.rank}.`
                                )}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900 max-w-xs truncate" title={item.name}>
                                {item.name}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                                {formatNumber(item.quantity)}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 text-right">
                                {formatNumber(item.amount)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* 銷額排名 */}
                  <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                    <div className="px-6 py-4" style={{ backgroundColor: '#FFCFD2' }}>
                      <h3 className="text-lg font-semibold text-gray-900">銷額排名 TOP 20</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">排名</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">商品名稱</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">數量</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">金額 ↓</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {rankingData.amountRanking.slice(0, 20).map((item, index) => (
                            <tr key={index} className={`${index < 3 ? 'bg-red-50' : ''} hover:bg-gray-50 transition-colors`}>
                              <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                                {index < 3 ? (
                                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold text-white" 
                                        style={{ backgroundColor: index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : '#CD7F32' }}>
                                    {item.rank}
                                  </span>
                                ) : (
                                  `${item.rank}.`
                                )}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900 max-w-xs truncate" title={item.name}>
                                {item.name}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 text-right">
                                {formatNumber(item.quantity)}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                                {formatNumber(item.amount)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                </div>

                {/* 酒水排名 */}
                {rankingData.alcoholRanking && rankingData.alcoholRanking.length > 0 && (
                  <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                    <div className="px-6 py-4" style={{ backgroundColor: '#98F5E1' }}>
                      <h3 className="text-lg font-semibold text-gray-900">酒水排名 TOP 20</h3>
                      <p className="text-sm text-gray-700 mt-1">大分類為 6酒水</p>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">排名</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">大分類</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">商品名稱</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">銷量</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">金額</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {rankingData.alcoholRanking.slice(0, 20).map((item, index) => (
                            <tr key={index} className={`${index < 3 ? 'bg-teal-50' : ''} hover:bg-gray-50 transition-colors`}>
                              <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                                {index < 3 ? (
                                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold text-white" 
                                        style={{ backgroundColor: index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : '#CD7F32' }}>
                                    {item.rank}
                                  </span>
                                ) : (
                                  `${item.rank}.`
                                )}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                {item.category}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900 max-w-xs truncate" title={item.name}>
                                {item.name}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                                {formatNumber(item.quantity)}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 text-right">
                                {formatNumber(item.amount)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}