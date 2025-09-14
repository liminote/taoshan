'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'

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

interface PaymentData {
  method: string
  count: number
  amount: number
  percentage: number
}

interface OrderTypeData {
  type: string
  count: number
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

interface CustomerAnalysisData {
  rank: number
  customerName: string
  customerPhone: string
  orderCount: number
  averageOrderAmount: number
  totalOrderAmount: number
  amountPercentage?: number
  cumulativePercentage?: number
  hasAlcohol?: boolean
  isNewCustomer?: boolean
  hasReturnedAfterNew?: boolean
}

export default function ReportsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // Tab state with URL sync
  const [activeTab, setActiveTab] = useState<'trends' | 'monthly' | 'customer-analysis' | 'ai-chat'>(() => {
    const tab = searchParams.get('tab')
    return (tab === 'monthly' || tab === 'trends' || tab === 'customer-analysis' || tab === 'ai-chat') ? tab : 'trends'
  })
  
  // Common loading states
  const [loading, setLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isManualRefreshing, setIsManualRefreshing] = useState(false)
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null)
  const [, setCacheStatus] = useState<{cached: boolean; items: unknown[]} | null>(null)
  
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
  const [paymentData, setPaymentData] = useState<PaymentData[]>([])
  const [orderTypeData, setOrderTypeData] = useState<OrderTypeData[]>([])
  const [rankingData, setRankingData] = useState<RankingData | null>(null)
  
  // Customer analysis data (filtered by selected month for customer analysis tab)
  const [customerAnalysisMonth, setCustomerAnalysisMonth] = useState<string>(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  const [customerSpendingRanking, setCustomerSpendingRanking] = useState<CustomerAnalysisData[]>([])
  const [customerFrequencyRanking, setCustomerFrequencyRanking] = useState<CustomerAnalysisData[]>([])

  // Customer details modal state
  const [showCustomerModal, setShowCustomerModal] = useState(false)
  const [selectedCustomerPhone, setSelectedCustomerPhone] = useState<string>('')
  const [selectedCustomerName, setSelectedCustomerName] = useState<string>('')
  const [customerDetails, setCustomerDetails] = useState<any>(null)
  const [loadingCustomerDetails, setLoadingCustomerDetails] = useState(false)

  // Cache for trends data
  const [cachedData, setCachedData] = useState<{
    salesData?: MonthlySalesData[]
    discountData?: DiscountData[]
    timestamp?: Date
  }>({})
  
  // AI Chat state
  const [chatInput, setChatInput] = useState('')
  const [loadingChat, setLoadingChat] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [selectedModel, setSelectedModel] = useState<string>('groq')
  const [availableModels, setAvailableModels] = useState<{id: string, name: string, provider: string}[]>([])
  const [answer, setAnswer] = useState<string>('')

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

  // 獲取可用的AI模型列表
  useEffect(() => {
    const fetchAvailableModels = async () => {
      try {
        const response = await fetch('/api/ai-chat')
        if (response.ok) {
          const result = await response.json()
          setAvailableModels(result.models || [])
        }
      } catch (error) {
        console.error('獲取模型列表失敗:', error)
        // 設置默認模型列表
        setAvailableModels([
          { id: 'gemini', name: 'Google Gemini 1.5 Flash', provider: 'google' }
        ])
      }
    }
    fetchAvailableModels()
  }, [])

  // AI Chat functions
  const sendChatMessage = useCallback(async (message: string) => {
    if (!message.trim() || loadingChat) return
    
    setAnswer('')
    setLoadingChat(true)
    
    try {
      // 使用生產API端點，基於現有內部數據
      const response = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          conversationHistory: [],
          category: selectedCategory,
          model: selectedModel
        })
      })

      if (response.ok) {
        const result = await response.json()
        const responseText = result.response || '抱歉，我暫時無法處理您的問題'
        setAnswer(responseText)
        setChatInput('') // 只有在成功時才清空輸入框
      } else {
        const errorResult = await response.json()
        setAnswer(`抱歉，處理您的問題時發生錯誤：${errorResult.error || '未知錯誤'}`)
      }
    } catch (error) {
      console.error('Chat error:', error)
      setAnswer('抱歉，連接服務時發生錯誤，請稍後再試')
    } finally {
      setLoadingChat(false)
    }
  }, [loadingChat, selectedCategory, selectedModel])


  const handleSendMessage = useCallback(() => {
    if (chatInput.trim()) {
      sendChatMessage(chatInput)
    }
  }, [chatInput, sendChatMessage])

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }, [handleSendMessage])

  // Fetch monthly category data (used for 當月數字 tab)
  const fetchMonthlyCategoryData = useCallback(async (month: string) => {
    try {
      const [categoryResponse, smallCategoryResponse, paymentResponse, orderTypeResponse, rankingResponse] = await Promise.all([
        fetch(`/api/reports/category-distribution?month=${month}`),
        fetch(`/api/reports/small-category-distribution?month=${month}`),
        fetch(`/api/reports/payment-distribution?month=${month}`),
        fetch(`/api/reports/order-type-distribution?month=${month}`),
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

      if (paymentResponse.ok) {
        const paymentResult = await paymentResponse.json()
        setPaymentData(paymentResult.data || paymentResult)
      } else {
        setPaymentData([])
      }

      if (orderTypeResponse.ok) {
        const orderTypeResult = await orderTypeResponse.json()
        setOrderTypeData(orderTypeResult.data || orderTypeResult)
      } else {
        setOrderTypeData([])
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
      setPaymentData([])
      setOrderTypeData([])
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

  // Handle view customer details
  const handleViewCustomerDetails = async (phone: string, name: string) => {
    setSelectedCustomerPhone(phone)
    setSelectedCustomerName(name)
    setShowCustomerModal(true)
    setLoadingCustomerDetails(true)
    setCustomerDetails(null)

    try {
      const response = await fetch(`/api/reports/customer-details?phone=${phone}&month=${customerAnalysisMonth}`)
      const result = await response.json()

      if (result.success) {
        setCustomerDetails(result.data)
      } else {
        console.error('獲取客戶明細失敗:', result.error)
        alert('獲取客戶明細失敗')
      }
    } catch (error) {
      console.error('獲取客戶明細時發生錯誤:', error)
      alert('獲取客戶明細時發生錯誤')
    } finally {
      setLoadingCustomerDetails(false)
    }
  }

  // Fetch customer analysis data (used for 顧客分析 tab)
  const fetchCustomerAnalysisData = useCallback(async (month: string) => {
    try {
      const [spendingResponse, frequencyResponse] = await Promise.all([
        fetch(`/api/reports/customer-spending-ranking?month=${month}`),
        fetch(`/api/reports/customer-frequency-ranking?month=${month}`)
      ])

      if (spendingResponse.ok) {
        const spendingResult = await spendingResponse.json()
        setCustomerSpendingRanking(spendingResult.data || spendingResult)
      } else {
        setCustomerSpendingRanking([])
      }

      if (frequencyResponse.ok) {
        const frequencyResult = await frequencyResponse.json()
        setCustomerFrequencyRanking(frequencyResult.data || frequencyResult)
      } else {
        setCustomerFrequencyRanking([])
      }
    } catch (error) {
      console.error('獲取顧客分析資料失敗:', error)
      setCustomerSpendingRanking([])
      setCustomerFrequencyRanking([])
    }
  }, [])

  // Fetch customer analysis data when selected month changes
  useEffect(() => {
    if (activeTab === 'customer-analysis') {
      fetchCustomerAnalysisData(customerAnalysisMonth)
    }
  }, [customerAnalysisMonth, activeTab, fetchCustomerAnalysisData])

  // Manual cache refresh handler
  const handleManualRefresh = async () => {
    setIsManualRefreshing(true)
    try {
      const response = await fetch('/api/cache/refresh', { method: 'POST' })
      const result = await response.json()
      
      if (result.success) {
        // 清除本地狀態，強制重新載入
        setSalesData([])
        setDiscountData([])
        setMonthlyCategoryData([])
        setMonthlySmallCategoryData([])
        setPaymentData([])
        setOrderTypeData([])
        setRankingData(null)
        setCustomerSpendingRanking([])
        setCustomerFrequencyRanking([])
        setCachedData({})
        
        // 重新載入當前標籤頁的資料
        if (activeTab === 'trends') {
          await fetchTrendsData(true)
        } else if (activeTab === 'monthly') {
          await fetchMonthlyCategoryData(selectedMonth)
        } else if (activeTab === 'customer-analysis') {
          await fetchCustomerAnalysisData(customerAnalysisMonth)
        }
        
        setLastRefreshTime(new Date())
        alert('✅ 資料已更新！所有報表資料已刷新為最新版本。')
      } else {
        alert('❌ 更新失敗：' + (result.error || '未知錯誤'))
      }
    } catch (error) {
      console.error('手動刷新失敗:', error)
      alert('❌ 更新失敗：網路錯誤')
    } finally {
      setIsManualRefreshing(false)
    }
  }

  // Quick refresh handler (original)
  const handleRefresh = () => {
    if (activeTab === 'trends') {
      fetchTrendsData(true)
    } else if (activeTab === 'monthly') {
      fetchMonthlyCategoryData(selectedMonth)
    } else if (activeTab === 'customer-analysis') {
      fetchCustomerAnalysisData(customerAnalysisMonth)
    }
  }

  // Check cache status on load
  useEffect(() => {
    const checkCacheStatus = async () => {
      try {
        const response = await fetch('/api/cache/refresh')
        const result = await response.json()
        setCacheStatus(result)
      } catch (error) {
        console.error('檢查快取狀態失敗:', error)
      }
    }
    checkCacheStatus()
  }, [])

  // Generate SVG bar chart for trends
  const generateBarChart = (data: MonthlySalesData[] | DiscountData[], dataKey: string, height: number = 200, color: string) => {
    if (!data || data.length === 0) return null

    // 取最新13個月並反轉順序（最新在左邊）
    const chartData = data.slice(-13).reverse()
    const maxValue = Math.max(...chartData.map(item => (item as unknown as Record<string, number>)[dataKey]))
    
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
              const barHeight = ((item as unknown as Record<string, number>)[dataKey] / actualMax) * height
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
                    {Math.floor((item as unknown as Record<string, number>)[dataKey]).toLocaleString()}
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

  // Generate SVG pie chart for payment methods
  const generatePaymentPieChart = (data: PaymentData[], size: number = 200) => {
    if (!data || data.length === 0) return null

    const radius = size / 2 - 10
    const centerX = size / 2
    const centerY = size / 2
    
    let currentAngle = 0
    
    return (
      <svg width={size} height={size} className="drop-shadow-sm">
        {data.map((item, index) => {
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
              key={item.method}
              d={pathData}
              fill={chartColors[index % chartColors.length]}
              className="hover:opacity-80 transition-opacity cursor-pointer"
            >
              <title>{`${item.method}: ${item.count} 筆 (${item.percentage}%)`}</title>
            </path>
          )
        })}
      </svg>
    )
  }

  // Generate SVG pie chart for order types
  const generateOrderTypePieChart = (data: OrderTypeData[], size: number = 200) => {
    if (!data || data.length === 0) return null

    const radius = size / 2 - 10
    const centerX = size / 2
    const centerY = size / 2
    
    let currentAngle = 0
    
    return (
      <svg width={size} height={size} className="drop-shadow-sm">
        {data.map((item, index) => {
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
              key={item.type}
              d={pathData}
              fill={chartColors[index % chartColors.length]}
              className="hover:opacity-80 transition-opacity cursor-pointer"
            >
              <title>{`${item.type}: ${item.count} 筆 (${item.percentage}%)`}</title>
            </path>
          )
        })}
      </svg>
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
            className="inline-flex items-center text-gray-600 hover:text-emerald-600 transition-colors mb-6 group"
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
            
            <div className="flex space-x-3">
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
                {isRefreshing ? '重新載入...' : '重新載入'}
              </button>
              
              <button
                onClick={handleManualRefresh}
                disabled={isManualRefreshing}
                className="inline-flex items-center px-4 py-2 bg-purple-500 text-white rounded-xl shadow-sm hover:shadow-md transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                <svg 
                  className={`w-4 h-4 mr-2 ${isManualRefreshing ? 'animate-spin' : ''}`} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4-4m0 0L8 8m4-4v12" />
                </svg>
                {isManualRefreshing ? '更新資料中...' : '更新最新資料'}
              </button>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div className="bg-white rounded-xl shadow-sm p-1 inline-flex">
              <button
                onClick={() => {
                  setActiveTab('trends')
                  router.push('/reports?tab=trends', { scroll: false })
                }}
                className={`px-6 py-3 rounded-lg font-medium transition-all ${
                  activeTab === 'trends'
                    ? 'bg-secondary text-gray-800 shadow-sm'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                }`}
              >
                趨勢觀測
              </button>
              <button
                onClick={() => {
                  setActiveTab('monthly')
                  router.push('/reports?tab=monthly', { scroll: false })
                }}
                className={`px-6 py-3 rounded-lg font-medium transition-all ${
                  activeTab === 'monthly'
                    ? 'bg-secondary text-gray-800 shadow-sm'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                }`}
              >
                當月數字
              </button>
              <button
                onClick={() => {
                  setActiveTab('customer-analysis')
                  router.push('/reports?tab=customer-analysis', { scroll: false })
                }}
                className={`px-6 py-3 rounded-lg font-medium transition-all ${
                  activeTab === 'customer-analysis'
                    ? 'bg-secondary text-gray-800 shadow-sm'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                }`}
              >
                顧客分析
              </button>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-1">
              <button
                onClick={() => {
                  setActiveTab('ai-chat')
                  router.push('/reports?tab=ai-chat', { scroll: false })
                }}
                className={`px-6 py-3 rounded-lg font-medium transition-all flex items-center space-x-2 ${
                  activeTab === 'ai-chat'
                    ? 'text-gray-800 shadow-sm'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                }`}
                style={activeTab === 'ai-chat' ? { backgroundColor: '#98F5E1' } : {}}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                <span>AI問答（不能用）</span>
              </button>
            </div>
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

        {/* AI Chat Tab Content */}
        {activeTab === 'ai-chat' && (
          <div className="space-y-6">
            {/* AI 問答界面標題 */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
              <div className="flex items-center justify-center space-x-3 mb-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#98F5E1' }}>
                  <svg className="w-6 h-6 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-gray-800">AI 智能問答（不能用）</h2>
                  <p className="text-gray-600 mt-1">基於餐廳銷售數據的智能分析助手 • Powered by {availableModels.find(m => m.id === selectedModel)?.name || 'Gemini'}</p>
                </div>
              </div>
              
              {/* 步驟指示器 */}
              <div className="flex items-center justify-center space-x-4 mt-6">
                <div className="flex items-center space-x-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    selectedCategory ? 'bg-mint_green-500 text-white' : 'bg-mint_green-200 text-gray-800'
                  }`}>
                    1
                  </div>
                  <span className={`text-sm font-medium ${selectedCategory ? 'text-mint_green-600' : 'text-gray-500'}`}>
                    選擇問題分類
                  </span>
                </div>
                <div className="w-8 h-px bg-gray-300"></div>
                <div className="flex items-center space-x-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    selectedCategory && chatInput.trim() ? 'bg-mint_green-500 text-white' : 'bg-gray-200 text-gray-600'
                  }`}>
                    2
                  </div>
                  <span className={`text-sm font-medium ${selectedCategory && chatInput.trim() ? 'text-mint_green-600' : 'text-gray-500'}`}>
                    輸入問題
                  </span>
                </div>
                <div className="w-8 h-px bg-gray-300"></div>
                <div className="flex items-center space-x-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    answer ? 'bg-mint_green-500 text-white' : 'bg-gray-200 text-gray-600'
                  }`}>
                    3
                  </div>
                  <span className={`text-sm font-medium ${answer ? 'text-mint_green-600' : 'text-gray-500'}`}>
                    AI 回答
                  </span>
                </div>
              </div>
            </div>

            {/* 步驟1：問題分類選擇 */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100">
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-8 h-8 rounded-full bg-mint_green-500 text-white flex items-center justify-center text-sm font-medium">
                    1
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800">選擇問題分類</h3>
                </div>
                <p className="text-sm text-gray-600 mb-4">請先選擇您想要查詢的問題類型，系統將根據您的選擇載入對應的數據源：</p>
              </div>
              
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <button
                    onClick={() => setSelectedCategory('product')}
                    className={`p-4 rounded-xl border-2 transition-all text-left group ${
                      selectedCategory === 'product'
                        ? 'border-sky_blue bg-sky_blue-50 shadow-lg'
                        : 'border-gray-200 bg-white hover:border-sky_blue-200 hover:shadow-md'
                    }`}
                  >
                    <div className="flex items-center space-x-3 mb-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        selectedCategory === 'product' ? 'bg-sky_blue text-white' : 'bg-sky_blue-100 text-sky_blue-600'
                      }`}>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                      </div>
                      <div>
                        <div className="font-semibold text-gray-800">A. 商品銷售問題</div>
                        <div className="text-xs text-gray-600">Product Sales Analysis</div>
                      </div>
                    </div>
                    <div className="text-sm text-gray-700 mb-2">
                      查詢範圍：商品銷售排名與商品主檔
                    </div>
                    <div className="text-xs text-gray-500">
                      適用問題：特定商品銷售表現、商品排名、銷量趨勢分析等
                    </div>
                  </button>
                  
                  <button
                    onClick={() => setSelectedCategory('order')}
                    className={`p-4 rounded-xl border-2 transition-all text-left group ${
                      selectedCategory === 'order'
                        ? 'border-periwinkle bg-periwinkle-50 shadow-lg'
                        : 'border-gray-200 bg-white hover:border-periwinkle-200 hover:shadow-md'
                    }`}
                  >
                    <div className="flex items-center space-x-3 mb-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        selectedCategory === 'order' ? 'bg-periwinkle text-white' : 'bg-periwinkle-100 text-periwinkle-600'
                      }`}>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div>
                        <div className="font-semibold text-gray-800">B. 訂單問題</div>
                        <div className="text-xs text-gray-600">Order Analysis</div>
                      </div>
                    </div>
                    <div className="text-sm text-gray-700 mb-2">
                      查詢範圍：月銷售統計與訂單資料
                    </div>
                    <div className="text-xs text-gray-500">
                      適用問題：訂單趨勢、支付方式分析、時段分析、客戶行為等
                    </div>
                  </button>
                  
                  <button
                    onClick={() => setSelectedCategory('category')}
                    className={`p-4 rounded-xl border-2 transition-all text-left group ${
                      selectedCategory === 'category'
                        ? 'border-mint_green bg-mint_green-50 shadow-lg'
                        : 'border-gray-200 bg-white hover:border-mint_green-200 hover:shadow-md'
                    }`}
                  >
                    <div className="flex items-center space-x-3 mb-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        selectedCategory === 'category' ? 'bg-mint_green text-white' : 'bg-mint_green-100 text-mint_green-600'
                      }`}>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                        </svg>
                      </div>
                      <div>
                        <div className="font-semibold text-gray-800">C. 商品分類問題</div>
                        <div className="text-xs text-gray-600">Category Analysis</div>
                      </div>
                    </div>
                    <div className="text-sm text-gray-700 mb-2">
                      查詢範圍：分類分佈+商品排名+商品主檔
                    </div>
                    <div className="text-xs text-gray-500">
                      適用問題：分類表現比較、跨分類分析、商品分類統計等
                    </div>
                  </button>
                </div>
              </div>
            </div>

            {/* 步驟2：問題輸入（只有選擇分類後才顯示） */}
            {selectedCategory && (
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100">
                <div className="p-6 border-b border-gray-100">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-8 h-8 rounded-full bg-mint_green-500 text-white flex items-center justify-center text-sm font-medium">
                      2
                    </div>
                    <h3 className="text-lg font-semibold text-gray-800">輸入您的問題</h3>
                  </div>
                  <p className="text-sm text-gray-600">
                    已選擇：
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ml-2 ${
                      selectedCategory === 'product' ? 'bg-sky_blue-100 text-sky_blue-800' :
                      selectedCategory === 'order' ? 'bg-periwinkle-100 text-periwinkle-800' :
                      'bg-mint_green-100 text-mint_green-800'
                    }`}>
                      {selectedCategory === 'product' ? 'A. 商品銷售問題' :
                       selectedCategory === 'order' ? 'B. 訂單問題' :
                       'C. 商品分類問題'}
                    </span>
                  </p>
                </div>
                
                <div className="p-6">
                  {/* AI模型選擇 */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      🤖 選擇AI模型
                    </label>
                    <select
                      value={selectedModel}
                      onChange={(e) => setSelectedModel(e.target.value)}
                      className="w-full max-w-sm p-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-mint_green/50 focus:border-mint_green/50 transition-all text-gray-900"
                      disabled={loadingChat}
                    >
                      {availableModels.map((model) => (
                        <option key={model.id} value={model.id}>
                          {model.name} ({model.provider})
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      選擇不同AI模型可能有不同的回答風格和速度
                    </p>
                  </div>
                  
                  <div className="flex items-end space-x-3">
                    <div className="flex-1">
                      <textarea
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={handleKeyPress}
                        placeholder={
                          selectedCategory === 'product' ? 
                          '請輸入您想了解的商品銷售相關問題...' :
                          selectedCategory === 'order' ?
                          '請輸入您想了解的訂單相關問題...' :
                          '請輸入您想了解的商品分類相關問題...'
                        }
                        className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl resize-none focus:outline-none focus:bg-white focus:ring-2 focus:ring-mint_green/50 focus:border-mint_green/50 transition-all text-gray-900 placeholder-gray-500"
                        rows={3}
                        disabled={loadingChat}
                      />
                    </div>
                    <button 
                      onClick={handleSendMessage}
                      disabled={!chatInput.trim() || !selectedCategory || loadingChat}
                      className="px-6 py-4 bg-mint_green-600 text-white rounded-xl hover:bg-mint_green-700 transition-colors flex items-center space-x-2 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loadingChat ? (
                        <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                      )}
                      <span>{loadingChat ? '分析中...' : '送出問題'}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 步驟3：AI回答區域 */}
            {(loadingChat || answer) && (
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100">
                <div className="p-6 border-b border-gray-100">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-mint_green-500 text-white flex items-center justify-center text-sm font-medium">
                      3
                    </div>
                    <h3 className="text-lg font-semibold text-gray-800">AI 分析結果</h3>
                  </div>
                </div>
                
                <div className="p-6">
                  {/* 載入狀態 */}
                  {loadingChat && (
                    <div className="flex items-start space-x-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center bg-mint_green-200">
                        <svg className="w-5 h-5 text-gray-800 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <div className="p-4 rounded-xl bg-mint_green-50 border border-mint_green-200">
                          <p className="text-gray-800 font-medium">🔍 正在獲取餐廳數據並分析您的問題...</p>
                          <div className="flex items-center space-x-2 mt-2 text-sm text-gray-600">
                            <div className="flex space-x-1">
                              <div className="w-1 h-1 bg-mint_green-400 rounded-full animate-bounce"></div>
                              <div className="w-1 h-1 bg-mint_green-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                              <div className="w-1 h-1 bg-mint_green-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                            </div>
                            <span>AI正在處理中</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 回答顯示 */}
                  {answer && !loadingChat && (
                    <div className="flex items-start space-x-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center bg-mint_green-500">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
                          <div className="prose prose-sm max-w-none">
                            <p className="whitespace-pre-wrap text-gray-800 leading-relaxed">{answer}</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between mt-3">
                          <div className="text-xs text-gray-500">
                            🤖 AI 助手 • 基於餐廳最新數據分析
                          </div>
                          <button
                            onClick={() => {
                              setAnswer('')
                              setChatInput('')
                            }}
                            className="text-xs text-mint_green-600 hover:text-mint_green-700 font-medium"
                          >
                            重新提問
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 空狀態提示 */}
            {!selectedCategory && !loadingChat && !answer && (
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-12">
                <div className="text-center">
                  <div className="w-20 h-20 rounded-full bg-mint_green-100 mx-auto mb-4 flex items-center justify-center">
                    <svg className="w-10 h-10 text-mint_green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">開始您的數據分析之旅</h3>
                  <p className="text-gray-600 mb-4">請先在上方選擇問題分類，系統將為您載入對應的數據源</p>
                  <div className="text-sm text-gray-500">
                    💫 支援即時數據分析 • 🎯 精準問題解答 • 📊 多維度數據洞察
                  </div>
                </div>
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

            {/* 支付方式和訂單類型分布 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* 支付方式分布 */}
              <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#A8E6CF' }}>
                    <svg className="w-5 h-5 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                  </div>
                  <h2 className="text-xl font-bold text-gray-900">支付方式</h2>
                </div>

                <div className="flex flex-col lg:flex-row items-center lg:items-start space-y-6 lg:space-y-0 lg:space-x-8">
                  <div className="flex-shrink-0">
                    {generatePaymentPieChart(paymentData, 200)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="space-y-3">
                      {paymentData.map((item, index) => (
                        <div
                          key={item.method}
                          className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <div
                            className="w-4 h-4 rounded-full flex-shrink-0"
                            style={{ backgroundColor: chartColors[index % chartColors.length] }}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-900">{item.method}</div>
                            <div className="text-sm text-gray-600">
                              {formatNumber(item.count)} 筆 ({item.percentage}%)
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* 訂單類型分布 */}
              <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#B5E7A0' }}>
                    <svg className="w-5 h-5 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <h2 className="text-xl font-bold text-gray-900">訂單類型</h2>
                </div>

                <div className="flex flex-col lg:flex-row items-center lg:items-start space-y-6 lg:space-y-0 lg:space-x-8">
                  <div className="flex-shrink-0">
                    {generateOrderTypePieChart(orderTypeData, 200)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="space-y-3">
                      {orderTypeData.map((item, index) => (
                        <div
                          key={item.type}
                          className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <div
                            className="w-4 h-4 rounded-full flex-shrink-0"
                            style={{ backgroundColor: chartColors[index % chartColors.length] }}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-900">{item.type}</div>
                            <div className="text-sm text-gray-600">
                              {formatNumber(item.count)} 筆 ({item.percentage}%)
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
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
                    <div className="text-center p-4 bg-emerald-50 rounded-xl">
                      <div className="text-2xl font-bold text-emerald-600">{formatNumber(rankingData.totals.totalQuantity)}</div>
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
                            <tr key={index} className={`${index < 3 ? 'bg-emerald-50' : ''} hover:bg-gray-50 transition-colors`}>
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
                      <h3 className="text-lg font-semibold text-gray-900">酒水排名 TOP 20（總金額最高）</h3>
                      <p className="text-sm text-gray-700 mt-1">大分類為 6酒水，按總金額排序</p>
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

        {/* Customer Analysis Tab Content */}
        {activeTab === 'customer-analysis' && (
          <div className="space-y-8">
            {/* 月份篩選器 */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
              <div className="flex items-center space-x-4">
                <label htmlFor="customer-month-select" className="text-lg font-medium text-gray-700">
                  選擇月份：
                </label>
                <select
                  id="customer-month-select"
                  value={customerAnalysisMonth}
                  onChange={(e) => setCustomerAnalysisMonth(e.target.value)}
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

            {/* 顧客排名表格 */}
            <div className="space-y-8">
              
              {/* 客戶消費金額 Top 30 */}
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                <div className="px-6 py-4" style={{ backgroundColor: '#90DBF4' }}>
                  <h3 className="text-lg font-semibold text-gray-900">客戶消費金額 TOP 30</h3>
                  <p className="text-sm text-gray-700 mt-1">依訂單總金額排序</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">名次</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">顧客姓名</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">顧客電話</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">喝酒</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">新客</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">訂單張數</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">平均訂單金額</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">訂單總金額 ↓</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">金額佔比</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">累計佔比</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">消費明細</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {customerSpendingRanking.slice(0, 30).map((customer, index) => (
                        <tr key={customer.customerPhone} className={`${index < 3 ? 'bg-emerald-50' : ''} hover:bg-gray-50 transition-colors`}>
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                            {index < 3 ? (
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold text-white" 
                                    style={{ backgroundColor: index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : '#CD7F32' }}>
                                {customer.rank}
                              </span>
                            ) : (
                              `${customer.rank}.`
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900 max-w-xs truncate" title={customer.customerName}>
                            {customer.customerName}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {customer.customerPhone}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {customer.hasAlcohol && (
                              <span className="text-lg" title="此客戶有酒類消費">🍷</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {customer.isNewCustomer && (
                              <span 
                                className={`text-xs font-medium px-2 py-1 rounded-full ${
                                  customer.hasReturnedAfterNew 
                                    ? 'text-blue-700 bg-blue-100' 
                                    : 'text-green-600 bg-green-100'
                                }`}
                                title={customer.hasReturnedAfterNew ? "新客戶且已回訪" : "新客戶"}
                              >
                                {customer.hasReturnedAfterNew ? '新回' : '新'}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right">
                            {formatNumber(customer.orderCount)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 text-right">
                            {formatNumber(customer.averageOrderAmount)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                            {formatNumber(customer.totalOrderAmount)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 text-right">
                            {customer.amountPercentage ? `${customer.amountPercentage}%` : '--'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 text-right">
                            {customer.cumulativePercentage ? `${customer.cumulativePercentage}%` : '--'}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button 
                              className="text-emerald-600 hover:text-emerald-700 transition-colors hover:bg-transparent"
                              onClick={() => handleViewCustomerDetails(customer.customerPhone, customer.customerName)}
                              title="查看消費明細"
                            >
                              🔍
                            </button>
                          </td>
                        </tr>
                      ))}
                      {customerSpendingRanking.length === 0 && (
                        <tr>
                          <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                            暫無資料
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 客戶消費次數 Top 30 */}
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                <div className="px-6 py-4" style={{ backgroundColor: '#FFCFD2' }}>
                  <h3 className="text-lg font-semibold text-gray-900">客戶消費次數 TOP 30</h3>
                  <p className="text-sm text-gray-700 mt-1">依訂單張數排序</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">名次</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">顧客姓名</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">顧客電話</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">喝酒</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">新客</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">訂單張數 ↓</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">平均訂單金額</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">訂單總金額</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">金額佔比</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">累計佔比</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">消費明細</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {customerFrequencyRanking.slice(0, 30).map((customer, index) => (
                        <tr key={customer.customerPhone} className={`${index < 3 ? 'bg-red-50' : ''} hover:bg-gray-50 transition-colors`}>
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                            {index < 3 ? (
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold text-white" 
                                    style={{ backgroundColor: index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : '#CD7F32' }}>
                                {customer.rank}
                              </span>
                            ) : (
                              `${customer.rank}.`
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900 max-w-xs truncate" title={customer.customerName}>
                            {customer.customerName}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {customer.customerPhone}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {customer.hasAlcohol && (
                              <span className="text-lg" title="此客戶有酒類消費">🍷</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {customer.isNewCustomer && (
                              <span 
                                className={`text-xs font-medium px-2 py-1 rounded-full ${
                                  customer.hasReturnedAfterNew 
                                    ? 'text-blue-700 bg-blue-100' 
                                    : 'text-green-600 bg-green-100'
                                }`}
                                title={customer.hasReturnedAfterNew ? "新客戶且已回訪" : "新客戶"}
                              >
                                {customer.hasReturnedAfterNew ? '新回' : '新'}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                            {formatNumber(customer.orderCount)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 text-right">
                            {formatNumber(customer.averageOrderAmount)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right">
                            {formatNumber(customer.totalOrderAmount)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 text-right">
                            {customer.amountPercentage ? `${customer.amountPercentage}%` : '--'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 text-right">
                            {customer.cumulativePercentage ? `${customer.cumulativePercentage}%` : '--'}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button 
                              className="text-emerald-600 hover:text-emerald-700 transition-colors hover:bg-transparent"
                              onClick={() => handleViewCustomerDetails(customer.customerPhone, customer.customerName)}
                              title="查看消費明細"
                            >
                              🔍
                            </button>
                          </td>
                        </tr>
                      ))}
                      {customerFrequencyRanking.length === 0 && (
                        <tr>
                          <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                            暫無資料
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          </div>
        )}
      </div>
      
      {/* 客戶消費明細 Modal */}
      {showCustomerModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">
                  客戶消費明細
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {selectedCustomerName} ({selectedCustomerPhone}) • {customerAnalysisMonth}
                </p>
              </div>
              <button 
                onClick={() => setShowCustomerModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[70vh]">
              {loadingCustomerDetails ? (
                <div className="flex items-center justify-center py-12">
                  <div className="flex items-center space-x-3">
                    <svg className="w-6 h-6 text-purple-600 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span className="text-gray-600">載入消費明細中...</span>
                  </div>
                </div>
              ) : customerDetails ? (
                <div className="space-y-6">
                  {/* 摘要統計 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-emerald-50 rounded-xl">
                      <div className="text-2xl font-bold text-emerald-600">{customerDetails.summary.totalOrders}</div>
                      <div className="text-sm text-gray-600 mt-1">總訂單數</div>
                    </div>
                    <div className="text-center p-4 bg-purple-50 rounded-xl">
                      <div className="text-2xl font-bold text-purple-600">NT$ {customerDetails.summary.totalAmount}</div>
                      <div className="text-sm text-gray-600 mt-1">總金額</div>
                    </div>
                  </div>

                  {/* 訂單明細 */}
                  <div className="space-y-4">
                    <h4 className="text-lg font-semibold text-gray-800">訂單明細</h4>
                    {customerDetails.orders.map((order: any, index: number) => (
                      <div key={index} className="border border-gray-200 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <div className="font-medium text-gray-900">
                              訂單編號: {order.orderId}
                            </div>
                            <div className="text-sm text-gray-600">
                              {order.orderTime}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold text-gray-900">
                              NT$ {order.totalAmount}
                            </div>
                          </div>
                        </div>
                        
                        {/* 品項列表 */}
                        <div className="space-y-2">
                          {order.items.map((item: any, itemIndex: number) => (
                            <div key={itemIndex} className="grid grid-cols-12 gap-2 items-center p-2 bg-gray-50 rounded">
                              <span className="text-sm text-gray-700 col-span-7">{item.name}</span>
                              <span className="text-sm font-medium text-gray-900 col-span-3 text-right font-mono">
                                NT$ {item.price}
                              </span>
                              <span className="text-sm text-emerald-600 font-medium col-span-2 text-center font-mono">
                                {item.quantity > 1 ? `x${item.quantity}` : ''}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}

                    {customerDetails.orders.length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        該月份暫無訂單記錄
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-gray-500">無法載入消費明細</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}