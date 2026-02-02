'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export default function RewardCardsContent() {
    const router = useRouter()
    const searchParams = useSearchParams()

    // Common loading states
    const [isManualRefreshing, setIsManualRefreshing] = useState(false)

    // Reward Cards Tab State
    const [rewardCardTab, setRewardCardTab] = useState<'overall' | 'card-history' | 'point-history'>('overall')
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

    const handleRefresh = () => {
        fetchRewardCardData(true)
    }

    return (
        <div className="min-h-screen bg-gray-50/50 pb-20">
            {/* 頂部標題 */}
            <div className="bg-white border-b border-gray-200/50 shadow-sm sticky top-0 z-10 box-border">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
                        <div className="flex items-center space-x-4">
                            <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center shadow-sm">
                                <svg className="w-7 h-7 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold text-gray-800">
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
                                className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all disabled:opacity-50"
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
                        onClick={() => setRewardCardTab('overall')}
                        className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${rewardCardTab === 'overall'
                            ? 'bg-emerald-600 text-white shadow-md'
                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                            }`}
                    >
                        整體統計
                    </button>
                    <button
                        onClick={() => setRewardCardTab('card-history')}
                        className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${rewardCardTab === 'card-history'
                            ? 'bg-emerald-600 text-white shadow-md'
                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                            }`}
                    >
                        卡片使用狀態歷史資料
                    </button>
                    <button
                        onClick={() => setRewardCardTab('point-history')}
                        className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${rewardCardTab === 'point-history'
                            ? 'bg-emerald-600 text-white shadow-md'
                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                            }`}
                    >
                        點數使用狀態歷史資料
                    </button>
                </div>

                {loadingRewardCards ? (
                    <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl shadow-lg border border-gray-100">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mb-4"></div>
                        <p className="text-gray-500 font-medium">載入集點卡資料中...</p>
                    </div>
                ) : rewardCardTab === 'overall' ? (
                    <div className="bg-white rounded-2xl shadow-lg p-16 text-center border border-gray-100">
                        <div className="w-24 h-24 rounded-full bg-emerald-50 mx-auto mb-6 flex items-center justify-center">
                            <svg className="w-12 h-12 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                        </div>
                        <h3 className="text-2xl font-bold text-gray-800 mb-3">整體統計即將推出</h3>
                        <p className="text-gray-600 max-w-sm mx-auto text-lg">
                            正在開發自動化的彙總功能，目前請先查看下方的歷史資料標籤以獲取詳細數據。
                        </p>
                    </div>
                ) : rewardCardTab === 'card-history' ? (
                    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">日期</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">名稱</th>
                                        <th className="px-6 py-4 text-right text-xs font-bold text-emerald-600 uppercase tracking-wider">使用率</th>
                                        <th className="px-6 py-4 text-right text-xs font-bold text-blue-600 uppercase tracking-wider">週二三四訂單</th>
                                        <th className="px-6 py-4 text-right text-xs font-bold text-purple-600 uppercase tracking-wider">引流率</th>
                                        <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">有效卡數</th>
                                        <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">已發行</th>
                                        <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">來店點數</th>
                                        <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">歡迎點數</th>
                                        <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">過期點數</th>
                                        <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">發出券數</th>
                                        <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">核銷券數</th>
                                        <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">狀態</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {rewardCardHistory.map((row, idx) => (
                                        <tr key={idx} className="hover:bg-emerald-50/30 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{row.date}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{row.name}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-emerald-600">
                                                {(row.usageRate * 100).toFixed(1)}%
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-blue-600">
                                                {row.tueThuOrders.toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-purple-600">
                                                {(row.inflowRate * 100).toFixed(1)}%
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">{row.validCards}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{row.issuedCards}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{row.storeVisitPoints}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{row.WelcomeBonusesAwarded}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right text-red-500">{row.expiredPoints}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{row.vouchersAwarded}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right text-emerald-600">{row.vouchersUsed}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                                                {row.deleted === 'TRUE' ? (
                                                    <span className="px-2.5 py-1 text-xs font-bold bg-gray-100 text-gray-500 rounded-full">已刪除</span>
                                                ) : (
                                                    <span className="px-2.5 py-1 text-xs font-bold bg-emerald-100 text-emerald-600 rounded-full">使用中</span>
                                                )}
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
                ) : (
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
                                            <tr key={idx} className="hover:bg-emerald-50/30 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 sticky left-0 bg-white shadow-[2px_0_5px_rgba(0,0,0,0.05)]">{row.date}</td>
                                                {sortedPoints.map(p => (
                                                    <td key={p} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right tabular-nums">
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
                )}
            </div>
        </div>
    )
}
