'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useDropzone } from 'react-dropzone'

export default function RewardCardsContent() {
    const router = useRouter()
    const searchParams = useSearchParams()

    // Common loading states
    const [isManualRefreshing, setIsManualRefreshing] = useState(false)
    const [isUploading, setIsUploading] = useState(false)
    const [uploadStatus, setUploadStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null)

    // Reward Cards Tab State
    const [rewardCardTab, setRewardCardTab] = useState<'overall' | 'card-history' | 'point-history' | 'instruction'>('overall')
    const [rewardCardHistory, setRewardCardHistory] = useState<any[]>([])
    const [rewardPointHistory, setRewardPointHistory] = useState<any[]>([])
    const [loadingRewardCards, setLoadingRewardCards] = useState(false)

    // API response caching
    const [cachedData, setCachedData] = useState<{
        rewardCardData?: {
            cardHistory: any[]
            pointHistory: any[]
        }
    }>({})

    // Sync tab with URL
    useEffect(() => {
        const tab = searchParams.get('tab')
        if (tab && ['overall', 'card-history', 'point-history', 'instruction'].includes(tab)) {
            setRewardCardTab(tab as any)
        }
    }, [searchParams])

    const handleTabChange = (tab: 'overall' | 'card-history' | 'point-history' | 'instruction') => {
        setRewardCardTab(tab)
        const params = new URLSearchParams(searchParams.toString())
        params.set('tab', tab)
        router.push(`?${params.toString()}`)
    }

    // Fetch Reward Cards data
    const fetchRewardCardData = useCallback(async (forceRefresh = false) => {
        if (!forceRefresh && cachedData.rewardCardData) {
            setRewardCardHistory(cachedData.rewardCardData.cardHistory)
            setRewardPointHistory(cachedData.rewardCardData.pointHistory)
            return
        }

        setLoadingRewardCards(true)
        try {
            const response = await fetch('/api/reports/reward-cards')
            if (response.ok) {
                const result = await response.json()
                const cardHistory = result.cardHistory || []
                const pointHistory = result.pointHistory || []

                setRewardCardHistory(cardHistory)
                setRewardPointHistory(pointHistory)

                setCachedData(prev => ({
                    ...prev,
                    rewardCardData: { cardHistory, pointHistory }
                }))
            }
        } catch (error) {
            console.error('獲取集點卡資料失敗:', error)
        } finally {
            setLoadingRewardCards(false)
        }
    }, [cachedData.rewardCardData])

    useEffect(() => {
        fetchRewardCardData()
    }, [fetchRewardCardData])

    const handleRefresh = useCallback(() => {
        fetchRewardCardData(true)
    }, [fetchRewardCardData])

    // Dropzone setup
    const onDrop = useCallback(async (acceptedFiles: File[]) => {
        if (acceptedFiles.length === 0) return

        setIsUploading(true)
        setUploadStatus(null)

        const formData = new FormData()
        acceptedFiles.forEach(file => {
            formData.append('file', file)
        })

        try {
            const res = await fetch('/api/upload/reward-cards', {
                method: 'POST',
                body: formData
            })

            const data = await res.json()
            if (data.success) {
                setUploadStatus({ type: 'success', message: `成功將 ${acceptedFiles.length} 個檔案寫入試算表！` })
                handleRefresh()
            } else {
                setUploadStatus({ type: 'error', message: data.message || '上傳失敗，請檢查檔案格式或 GAS 設定' })
            }
        } catch (error) {
            console.error('Upload Error:', error)
            setUploadStatus({ type: 'error', message: '系統發生例外錯誤' })
        } finally {
            setIsUploading(false)
            setTimeout(() => setUploadStatus(null), 5000)
        }
    }, [handleRefresh])

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'text/csv': ['.csv']
        }
    })

    // Calculate Overall Dashboard Stats
    const overallStats = useMemo(() => {
        if (rewardCardHistory.length === 0) return null

        const latest = rewardCardHistory[0]
        const avgUsage = rewardCardHistory.reduce((acc, row) => acc + row.usageRate, 0) / rewardCardHistory.length
        const avgInflow = rewardCardHistory.reduce((acc, row) => acc + row.inflowRate, 0) / rewardCardHistory.length

        // Customer Journey (latest snapshot)
        const latestPoints = rewardPointHistory[0] || {}
        let experience = 0
        let advanced = 0
        let core = 0

        Object.keys(latestPoints).forEach(key => {
            if (key.startsWith('p')) {
                const points = parseInt(key.substring(1))
                const count = Number(latestPoints[key]) || 0
                if (points === 1) experience += count
                else if (points === 2) advanced += count
                else if (points >= 3) core += count
            }
        })

        const totalJourney = experience + advanced + core

        // Trend Data (Chronological)
        const trendData = [...rewardCardHistory].reverse()
        const maxValidCards = Math.max(...trendData.map(d => d.validCards), 1)
        const maxVouchers = Math.max(...trendData.flatMap(d => [d.newVouchersAwarded, d.newVouchersUsed]), 1)

        return {
            latestValidCards: totalJourney,
            avgUsageRate: avgUsage,
            avgInflowRate: avgInflow,
            journey: {
                experience,
                advanced,
                core,
                experiencePct: totalJourney ? (experience / totalJourney * 100).toFixed(1) : '0',
                advancedPct: totalJourney ? (advanced / totalJourney * 100).toFixed(1) : '0',
                corePct: totalJourney ? (core / totalJourney * 100).toFixed(1) : '0'
            },
            trends: {
                data: trendData,
                maxValidCards,
                maxVouchers
            }
        }
    }, [rewardCardHistory, rewardPointHistory])

    return (
        <div className="min-h-screen bg-gray-50/50 pb-20">
            {/* 頂部標題 */}
            <div className="bg-white border-b border-gray-200/50 shadow-sm sticky top-0 z-10 box-border">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
                        <div className="flex items-center space-x-4">
                            <div className="w-12 h-12 bg-primary-100 rounded-2xl flex items-center justify-center shadow-sm">
                                <svg className="w-7 h-7 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold text-[#4a5568]">
                                    集點卡統計
                                </h1>
                                <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-3 mt-1">
                                    <p className="text-gray-600">追蹤 LINE 集點卡使用狀態與點數分佈</p>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center space-x-3">
                            <button
                                onClick={handleRefresh}
                                disabled={loadingRewardCards}
                                className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-all disabled:opacity-50"
                            >
                                <svg className={`w-4 h-4 mr-2 ${loadingRewardCards ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                重新整理
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 space-y-6">
                <div className="bg-white rounded-xl shadow-sm p-1 inline-flex">
                    <button
                        onClick={() => handleTabChange('overall')}
                        className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${rewardCardTab === 'overall'
                            ? 'bg-primary-600 text-white shadow-md'
                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                            }`}
                    >
                        整體統計
                    </button>
                    <button
                        onClick={() => handleTabChange('card-history')}
                        className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${rewardCardTab === 'card-history'
                            ? 'bg-primary-600 text-white shadow-md'
                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                            }`}
                    >
                        卡片使用狀態歷史資料
                    </button>
                    <button
                        onClick={() => handleTabChange('point-history')}
                        className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${rewardCardTab === 'point-history'
                            ? 'bg-primary-600 text-white shadow-md'
                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                            }`}
                    >
                        點數使用狀態歷史資料
                    </button>
                    <button
                        onClick={() => handleTabChange('instruction')}
                        className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${rewardCardTab === 'instruction'
                            ? 'bg-primary-600 text-white shadow-md'
                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                            }`}
                    >
                        使用說明
                    </button>
                </div>

                {/* CSV 上傳區塊 */}
                <div
                    {...getRootProps()}
                    className={`mt-4 border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${isDragActive
                            ? 'border-primary-500 bg-primary-50 scale-[1.01]'
                            : 'border-gray-200 bg-white hover:border-primary-400 hover:bg-gray-50'
                        }`}
                >
                    <input {...getInputProps()} />
                    <div className="flex flex-col items-center justify-center space-y-3">
                        <div className={`p-3 rounded-full ${isDragActive ? 'bg-primary-100' : 'bg-gray-100'}`}>
                            {isUploading ? (
                                <svg className="w-8 h-8 text-primary-500 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                            ) : (
                                <svg className={`w-8 h-8 ${isDragActive ? 'text-primary-600' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                </svg>
                            )}
                        </div>
                        <div>
                            {isUploading ? (
                                <p className="text-sm font-semibold text-primary-600">正在傳送資料至 Google Sheets...</p>
                            ) : isDragActive ? (
                                <p className="text-sm font-semibold text-primary-600">放開以開始上傳處理</p>
                            ) : (
                                <>
                                    <p className="text-sm font-semibold text-gray-700">點擊或拖曳 LINE 集點卡 CSV 檔案至此</p>
                                    <p className="text-xs text-gray-500 mt-1">上傳後系統會自動更新數據（僅接受 .csv 格式）</p>
                                </>
                            )}
                        </div>
                        {uploadStatus && (
                            <div className={`mt-2 text-xs font-semibold px-3 py-1.5 rounded-full inline-block ${uploadStatus.type === 'success' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                                }`}>
                                {uploadStatus.message}
                            </div>
                        )}
                    </div>
                </div>

                {loadingRewardCards ? (
                    <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl shadow-lg border border-gray-100">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mb-4"></div>
                        <p className="text-gray-500 font-medium">載入集點卡資料中...</p>
                    </div>
                ) : rewardCardTab === 'overall' ? (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                        {overallStats ? (
                            <>
                                {/* KPI Cards */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-between">
                                        <div>
                                            <p className="text-sm font-bold text-gray-500 mb-1">品牌總活躍人數</p>
                                            <h4 className="text-4xl font-black text-[#4a5568] tabular-nums">
                                                {overallStats.latestValidCards.toLocaleString()}
                                            </h4>
                                        </div>
                                        <div className="mt-4 pt-4 border-t border-gray-50 flex items-center text-xs text-gray-400">
                                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            持卡且點數 &gt; 0 的總人數
                                        </div>
                                    </div>

                                    <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 relative overflow-hidden group">
                                        <div className={`absolute top-0 right-0 w-2 h-full ${overallStats.avgUsageRate >= 0.1 ? 'bg-primary-500' : 'bg-error-500'}`}></div>
                                        <div>
                                            <p className="text-sm font-bold text-gray-500 mb-1">平均使用率</p>
                                            <div className="flex items-baseline space-x-2">
                                                <h4 className={`text-4xl font-black tabular-nums ${overallStats.avgUsageRate >= 0.1 ? 'text-primary-600' : 'text-error-600'}`}>
                                                    {(overallStats.avgUsageRate * 100).toFixed(1)}%
                                                </h4>
                                                <span className="text-xs font-bold text-gray-400">/ 標竿 10%</span>
                                            </div>
                                        </div>
                                        <div className="mt-4">
                                            {overallStats.avgUsageRate >= 0.1 ? (
                                                <div className="bg-primary-50 text-primary-700 text-xs px-3 py-2 rounded-lg font-medium inline-flex items-center">
                                                    🟢 表現優良：獎勵品項具備吸引力
                                                </div>
                                            ) : (
                                                <div className="bg-error-50 text-error-700 text-xs px-3 py-2 rounded-lg font-medium inline-flex items-center">
                                                    🔴 待優化：建議加強或調整獎勵品項
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
                                        <div>
                                            <p className="text-sm font-bold text-gray-500 mb-1">平均引流率</p>
                                            <h4 className="text-4xl font-black text-secondary-600 tabular-nums">
                                                {(overallStats.avgInflowRate * 100).toFixed(1)}%
                                            </h4>
                                        </div>
                                        <div className="mt-4 pt-4 border-t border-gray-50 flex items-center text-xs text-gray-400">
                                            衡量平日進店客轉化為會員的效率
                                        </div>
                                    </div>
                                </div>

                                {/* Customer Journey Segmentation */}
                                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                                    <div className="px-8 py-6 border-b border-gray-50 flex items-center justify-between">
                                        <h3 className="text-lg font-bold text-[#4a5568]">顧客旅程分佈 (Customer Journey)</h3>
                                        <span className="text-xs text-gray-400 font-medium italic">基於最新數據快照</span>
                                    </div>
                                    <div className="p-8">
                                        <div className="flex h-12 rounded-2xl overflow-hidden mb-8 shadow-inner bg-gray-100">
                                            <div style={{ width: `${overallStats.journey.experiencePct}%` }} className="bg-primary-400 transition-all hover:brightness-110" title={`體驗層: ${overallStats.journey.experiencePct}%`}></div>
                                            <div style={{ width: `${overallStats.journey.advancedPct}%` }} className="bg-secondary-400 transition-all hover:brightness-110" title={`進階層: ${overallStats.journey.advancedPct}%`}></div>
                                            <div style={{ width: `${overallStats.journey.corePct}%` }} className="bg-accent-500 transition-all hover:brightness-110" title={`熟客層: ${overallStats.journey.corePct}%`}></div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                            <div className="space-y-3">
                                                <div className="flex items-center space-x-2">
                                                    <div className="w-3 h-3 bg-primary-400 rounded-full"></div>
                                                    <p className="font-bold text-gray-700">體驗層 (1 點)</p>
                                                </div>
                                                <div className="pl-5">
                                                    <p className="text-2xl font-black text-[#4a5568]">{overallStats.journey.experience} <span className="text-sm font-normal text-gray-500">人</span></p>
                                                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">初次嘗試集點的客人，是未來回流的種子群。</p>
                                                </div>
                                            </div>

                                            <div className="space-y-3">
                                                <div className="flex items-center space-x-2">
                                                    <div className="w-3 h-3 bg-secondary-400 rounded-full"></div>
                                                    <p className="font-bold text-gray-700">進階層 (2 點)</p>
                                                </div>
                                                <div className="pl-5">
                                                    <p className="text-2xl font-black text-[#4a5568]">{overallStats.journey.advanced} <span className="text-sm font-normal text-gray-500">人</span></p>
                                                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">已產生一次回購，具有極高潛力達成滿點獎勵。</p>
                                                </div>
                                            </div>

                                            <div className="space-y-3">
                                                <div className="flex items-center space-x-2">
                                                    <div className="w-3 h-3 bg-accent-500 rounded-full"></div>
                                                    <p className="font-bold text-gray-700">熟客層 (3 點↑)</p>
                                                </div>
                                                <div className="pl-5">
                                                    <p className="text-2xl font-black text-[#4a5568]">{overallStats.journey.core} <span className="text-sm font-normal text-gray-500">人</span></p>
                                                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">核心熟客群，代表已完成完整的商務回流循環。</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Growth Trends Section */}
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                    {/* Line Chart: Valid Cards Growth */}
                                    <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
                                        <div className="flex items-center justify-between mb-8">
                                            <div>
                                                <h3 className="text-lg font-bold text-[#4a5568]">有效卡數成長趨勢</h3>
                                                <p className="text-xs text-gray-400 mt-1">追蹤平日會員規模的擴張路徑</p>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <div className="w-2 h-2 bg-primary-500 rounded-full"></div>
                                                <span className="text-xs font-bold text-primary-600">有效卡數</span>
                                            </div>
                                        </div>
                                        <div className="h-48 w-full relative">
                                            <svg className="w-full h-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
                                                {/* Grid Lines */}
                                                {[0, 25, 50, 75, 100].map(val => (
                                                    <line key={val} x1="0" y1={val} x2="100" y2={val} stroke="#f3f4f6" strokeWidth="0.5" />
                                                ))}
                                                {/* Line Path */}
                                                <path
                                                    d={overallStats.trends.data.map((d, i) => {
                                                        const x = (i / (overallStats.trends.data.length - 1)) * 100
                                                        const y = 100 - (d.validCards / overallStats.trends.maxValidCards) * 100
                                                        return `${i === 0 ? 'M' : 'L'} ${x} ${y}`
                                                    }).join(' ')}
                                                    fill="none"
                                                    stroke="#5E7182"
                                                    strokeWidth="3"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    className="drop-shadow-[0_2px_4px_rgba(16,185,129,0.3)]"
                                                />
                                                {/* Points */}
                                                {overallStats.trends.data.map((d, i) => {
                                                    const x = (i / (overallStats.trends.data.length - 1)) * 100
                                                    const y = 100 - (d.validCards / overallStats.trends.maxValidCards) * 100
                                                    return (
                                                        <circle
                                                            key={i}
                                                            cx={x}
                                                            cy={y}
                                                            r="3"
                                                            fill="white"
                                                            stroke="#5E7182"
                                                            strokeWidth="2"
                                                        />
                                                    )
                                                })}
                                            </svg>
                                        </div>
                                        <div className="flex justify-between mt-4">
                                            {overallStats.trends.data.map((d, i) => (
                                                <span key={i} className="text-[10px] text-gray-400 font-medium rotate-45 origin-left">
                                                    {d.periodLabel.split(' ')[0]}
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Bar Chart: Voucher Performance */}
                                    <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
                                        <div className="flex items-center justify-between mb-8">
                                            <div>
                                                <h3 className="text-lg font-bold text-[#4a5568]">獎勵券效能對照</h3>
                                                <p className="text-xs text-gray-400 mt-1">發券數 (左) 與核銷數 (右) 的對比</p>
                                            </div>
                                            <div className="flex space-x-4">
                                                <div className="flex items-center space-x-1.5">
                                                    <div className="w-2 h-2 bg-secondary-400 rounded-sm"></div>
                                                    <span className="text-[10px] font-bold text-gray-500 uppercase">發券</span>
                                                </div>
                                                <div className="flex items-center space-x-1.5">
                                                    <div className="w-2 h-2 bg-primary-500 rounded-sm"></div>
                                                    <span className="text-[10px] font-bold text-gray-500 uppercase">核銷</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="h-48 flex items-end justify-between space-x-2">
                                            {overallStats.trends.data.map((d, i) => (
                                                <div key={i} className="flex-1 flex items-end justify-center space-x-1 h-full relative group">
                                                    <div
                                                        style={{ height: `${(d.newVouchersAwarded / overallStats.trends.maxVouchers) * 100}%` }}
                                                        className="w-1.5 bg-secondary-400/80 rounded-t-sm transition-all group-hover:bg-secondary-400"
                                                    ></div>
                                                    <div
                                                        style={{ height: `${(d.newVouchersUsed / overallStats.trends.maxVouchers) * 100}%` }}
                                                        className="w-1.5 bg-primary-500/80 rounded-t-sm transition-all group-hover:bg-primary-500"
                                                    ></div>
                                                    {/* Tooltip on hover */}
                                                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20 shadow-xl">
                                                        獲贈: {d.newVouchersAwarded} | 核銷: {d.newVouchersUsed}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="flex justify-between mt-4">
                                            {overallStats.trends.data.map((d, i) => (
                                                <span key={i} className="text-[10px] text-gray-400 font-medium rotate-45 origin-left">
                                                    {d.periodLabel.split(' ')[0]}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="bg-white rounded-2xl shadow-lg p-16 text-center border border-gray-100">
                                <p className="text-gray-500">尚無足夠資料產生整體統計</p>
                            </div>
                        )}
                    </div>
                ) : rewardCardTab === 'card-history' ? (
                    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">歸屬區間</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">資料日期</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">卡片管理</th>
                                        <th className="px-6 py-4 text-right text-xs font-bold text-primary-600 uppercase tracking-wider">使用率</th>
                                        <th className="px-6 py-4 text-right text-xs font-bold text-secondary-600 uppercase tracking-wider">周間訂單</th>
                                        <th className="px-6 py-4 text-right text-xs font-bold text-accent-600 uppercase tracking-wider">引流率</th>
                                        <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">有效卡數</th>
                                        <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">已發行</th>
                                        <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">來店點數</th>
                                        <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">歡迎點數</th>
                                        <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">過期點數</th>
                                        <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">發出券數</th>
                                        <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">核銷券數</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {rewardCardHistory.map((row, idx) => (
                                        <tr key={idx} className="hover:bg-primary-50/30 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-bold text-primary-700 bg-primary-50 px-2 py-1 rounded inline-block">
                                                    {row.periodLabel}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-xs text-gray-500 tabular-nums">
                                                    {row.date}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-medium">{row.name}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-primary-600">
                                                {(row.usageRate * 100).toFixed(1)}%
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-secondary-600">
                                                {row.tueThuOrders.toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-accent-600">
                                                {(row.inflowRate * 100).toFixed(1)}%
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-[#2d3748] text-right">{row.validCards}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-[#2d3748] text-right">{row.issuedCards}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-[#2d3748] text-right">{row.storeVisitPoints}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-[#2d3748] text-right">{row.WelcomeBonusesAwarded}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-[#2d3748] text-right text-error-500">{row.expiredPoints}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-[#2d3748] text-right">
                                                <div className="font-medium">{row.vouchersAwarded}</div>
                                                <div className="text-[10px] text-gray-400">本期 +{row.newVouchersAwarded}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-[#2d3748] text-right text-primary-600">
                                                <div className="font-medium">{row.vouchersUsed}</div>
                                                <div className="text-[10px] text-primary-400">本期 +{row.newVouchersUsed}</div>
                                            </td>
                                        </tr>
                                    ))}
                                    {rewardCardHistory.length === 0 && (
                                        <tr>
                                            <td colSpan={13} className="px-6 py-12 text-center text-gray-500 italic">尚無歷史資料資料</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : rewardCardTab === 'point-history' ? (
                    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">日期</th>
                                        {(() => {
                                            const points = new Set<number>()
                                            rewardPointHistory.forEach(row => {
                                                Object.keys(row).forEach(key => {
                                                    if (key.startsWith('p')) {
                                                        const val = parseInt(key.substring(1))
                                                        if (!isNaN(val)) points.add(val)
                                                    }
                                                })
                                            })
                                            const sortedPoints = Array.from(points).sort((a, b) => b - a)
                                            return sortedPoints.map(p => (
                                                <th key={p} className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider min-w-[100px]">{p} 點</th>
                                            ))
                                        })()}
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {rewardPointHistory.map((row, idx) => {
                                        const points = new Set<number>()
                                        rewardPointHistory.forEach(r => {
                                            Object.keys(r).forEach(key => {
                                                if (key.startsWith('p')) {
                                                    const val = parseInt(key.substring(1))
                                                    if (!isNaN(val)) points.add(val)
                                                }
                                            })
                                        })
                                        const sortedPoints = Array.from(points).sort((a, b) => b - a)

                                        return (
                                            <tr key={idx} className="hover:bg-primary-50/30 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-[#2d3748] sticky left-0 bg-white shadow-[2px_0_5px_rgba(0,0,0,0.05)]">{row.date}</td>
                                                {sortedPoints.map(p => (
                                                    <td key={p} className="px-6 py-4 whitespace-nowrap text-sm text-[#2d3748] text-right tabular-nums">
                                                        {row[`p${p}`] ? `${row[`p${p}`]} 人` : '-'}
                                                    </td>
                                                ))}
                                            </tr>
                                        )
                                    })}
                                    {rewardPointHistory.length === 0 && (
                                        <tr>
                                            <td colSpan={10} className="px-6 py-12 text-center text-gray-500 italic">尚無歷史資料資料</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                        {/* 核心指標說明 */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-gradient-to-br from-primary-50 to-white p-8 rounded-3xl border border-primary-100 shadow-sm relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-primary-200/20 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110 duration-500"></div>
                                <div className="relative">
                                    <div className="flex items-center space-x-3 mb-6">
                                        <div className="p-3 bg-white rounded-2xl shadow-sm">
                                            <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                            </svg>
                                        </div>
                                        <h3 className="text-xl font-bold text-[#4a5568]">1. 核心經營指標：引流率</h3>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="bg-white/60 p-4 rounded-xl">
                                            <p className="text-sm font-bold text-primary-700 mb-1">計算公式：</p>
                                            <p className="text-gray-700 font-mono text-sm bg-white p-2 rounded border border-primary-50">本期新增發出券數 / 本期周間訂單總數</p>
                                        </div>
                                        <div className="space-y-3">
                                            <p className="text-sm text-gray-600 leading-relaxed italic">衡量「平日進店客人」轉化為「集點會員」的成效。</p>
                                            <div className="grid grid-cols-1 gap-3">
                                                <div className="flex items-start space-x-2">
                                                    <span className="w-1.5 h-1.5 bg-primary-400 rounded-full mt-2"></span>
                                                    <p className="text-sm text-gray-600"><span className="font-bold text-primary-600">高引流率：</span>代表平日客群對集點獎勵很有感，且店員推廣到位。</p>
                                                </div>
                                                <div className="flex items-start space-x-2">
                                                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2"></span>
                                                    <p className="text-sm text-gray-600"><span className="font-bold text-gray-600">低引流率：</span>代表平日客群可能不在意福利，或平均消費未達門檻。</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-gradient-to-br from-secondary-50 to-white p-8 rounded-3xl border border-secondary-100 shadow-sm relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-secondary-200/20 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110 duration-500"></div>
                                <div className="relative">
                                    <div className="flex items-center space-x-3 mb-6">
                                        <div className="p-3 bg-white rounded-2xl shadow-sm">
                                            <svg className="w-6 h-6 text-secondary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                            </svg>
                                        </div>
                                        <h3 className="text-xl font-bold text-[#4a5568]">2. 回流指標：使用率</h3>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="bg-white/60 p-4 rounded-xl">
                                            <p className="text-sm font-bold text-secondary-700 mb-1">計算公式：</p>
                                            <p className="text-gray-700 font-mono text-sm bg-white p-2 rounded border border-secondary-50">本期核銷券數 / 本期發出券數 × 100%</p>
                                        </div>
                                        <div className="space-y-3">
                                            <p className="text-sm text-gray-600 leading-relaxed italic">衡量「獎勵品項」對顧客回訪的真實吸力。</p>
                                            <div className="p-3 bg-secondary-100/50 rounded-lg">
                                                <p className="text-xs text-secondary-700 font-bold mb-1">優化門檻：</p>
                                                <p className="text-sm text-secondary-800">建議將目標設在 <span className="text-lg font-black underline">15%</span> 以上，若長期偏低，應考慮升級獎勵品項。</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 詳細數據說明 */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                                <h4 className="text-lg font-bold text-[#4a5568] mb-4 pb-2 border-b border-gray-50 flex items-center">
                                    <span className="w-2 h-6 bg-primary-500 rounded-full mr-3"></span>
                                    基礎參與數據
                                </h4>
                                <ul className="space-y-4">
                                    <li className="space-y-1">
                                        <p className="text-sm font-bold text-[#4a5568]">有效卡片 (Active Cards)</p>
                                        <p className="text-xs text-gray-500 leading-relaxed">目前「持有集點卡且點數 &gt; 0」的顧客數。代表平日實際集點的真實客群規模。</p>
                                    </li>
                                    <li className="space-y-1">
                                        <p className="text-sm font-bold text-[#4a5568]">已發行卡片 (Cards Issued)</p>
                                        <p className="text-xs text-gray-500 leading-relaxed">曾點開過集點卡的總人數。與有效卡片的差值為「領卡後未到店」的潛在對象。</p>
                                    </li>
                                    <li className="space-y-1">
                                        <p className="text-sm font-bold text-[#4a5568]">來店點數 (Total Points)</p>
                                        <p className="text-xs text-gray-500 leading-relaxed">發出的總點數。計算方式：來店點數 × 1,000 元 = 平日集點帶來的預估營業額。</p>
                                    </li>
                                </ul>
                            </div>

                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                                <h4 className="text-lg font-bold text-[#4a5568] mb-4 pb-2 border-b border-gray-50 flex items-center">
                                    <span className="w-2 h-6 bg-secondary-500 rounded-full mr-3"></span>
                                    優惠券與獎勵數據
                                </h4>
                                <ul className="space-y-4">
                                    <li className="space-y-1">
                                        <p className="text-sm font-bold text-[#4a5568]">已發行優惠券 (Rewards Issued)</p>
                                        <p className="text-xs text-gray-500 leading-relaxed">獎勵券總數。每達 3 點產出一張。代表「獎勵達標次數」，而非人數。</p>
                                    </li>
                                    <li className="space-y-1">
                                        <p className="text-sm font-bold text-[#4a5568]">已使用優惠券 (Rewards Redeemed)</p>
                                        <p className="text-xs text-gray-500 leading-relaxed">顧客回店並核銷獎勵的次數。是衡量「平日回流成效」最核心的指標。</p>
                                    </li>
                                    <li className="space-y-1">
                                        <p className="text-sm font-bold text-[#4a5568]">有效期限 (3 個月)</p>
                                        <p className="text-xs text-gray-500 leading-relaxed">點數與獎勵券時限。只要在三個月內有再次集點，舊點數期限會自動延長。</p>
                                    </li>
                                </ul>
                            </div>

                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                                <h4 className="text-lg font-bold text-[#4a5568] mb-4 pb-2 border-b border-gray-50 flex items-center">
                                    <span className="w-2 h-6 bg-accent-500 rounded-full mr-3"></span>
                                    顧客行為分佈
                                </h4>
                                <div className="space-y-4">
                                    <div className="p-4 bg-accent-50 rounded-xl">
                                        <p className="text-sm font-bold text-accent-800 mb-2">點數分佈（第 3 頁簽）：</p>
                                        <ul className="space-y-3">
                                            <li className="flex items-start space-x-2">
                                                <span className="text-accent-600 font-bold text-xs mt-0.5">3點:</span>
                                                <p className="text-xs text-gray-600">代表多數客人在消費約 3,000 元後尚未回訪。</p>
                                            </li>
                                            <li className="flex items-start space-x-2">
                                                <span className="text-accent-600 font-bold text-xs mt-0.5">6點↑:</span>
                                                <p className="text-xs text-gray-600">核心熟客，代表已完成兩次以上的平日回訪。</p>
                                            </li>
                                        </ul>
                                    </div>
                                    <div className="p-4 bg-warning-50 rounded-xl">
                                        <p className="text-sm font-bold text-warning-800 mb-1">特別規則：</p>
                                        <p className="text-xs text-gray-600 leading-relaxed">由於卡片上限為 3 點，所有的獎勵券本質上都是「滿點禮」。</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
