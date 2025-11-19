'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

type GuestDetail = {
    guest_index: number
    requirements: string[]
    other_requirement: string
}

type Confirmation = {
    id: number
    customer_name: string
    adult_count: number
    child_count: number
    dining_type: string
    dining_purpose: string
    alcohol_allowed: boolean
    notes: string
    created_at: string
    guest_details: GuestDetail[]
}

export default function HistoryPage() {
    const router = useRouter()
    const [confirmations, setConfirmations] = useState<Confirmation[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedId, setSelectedId] = useState<number | null>(null)

    useEffect(() => {
        fetchHistory()
    }, [])

    const fetchHistory = async () => {
        try {
            const res = await fetch('/api/guest-confirmations')
            const json = await res.json()
            if (json.data) {
                setConfirmations(json.data)
            }
        } catch (error) {
            console.error('Failed to fetch history:', error)
        } finally {
            setLoading(false)
        }
    }

    const generateSummary = (conf: Confirmation) => {
        let summary = `【訂位確認】\n`
        summary += `姓名：${conf.customer_name}\n`
        summary += `人數：${conf.adult_count}大 ${conf.child_count}小\n`
        summary += `用餐形式：${conf.dining_type}\n`
        summary += `用餐目的：${conf.dining_purpose}\n`
        summary += `飲酒：${conf.alcohol_allowed ? '是' : '否'}\n`
        summary += `----------------\n`

        // Sort guest details by index
        const sortedGuests = [...conf.guest_details].sort((a, b) => a.guest_index - b.guest_index)

        sortedGuests.forEach((g) => {
            const reqs = g.requirements.join('、')
            const other = g.other_requirement ? ` (${g.other_requirement})` : ''
            summary += `客人${g.guest_index}：${reqs}${other}\n`
        })

        if (conf.notes) {
            summary += `----------------\n`
            summary += `備註：${conf.notes}\n`
        }

        return summary
    }

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text).then(() => {
            alert('已複製到剪貼簿！')
        })
    }

    if (loading) {
        return <div className="p-4 text-center text-gray-500">載入中...</div>
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <div className="sticky top-0 z-10 bg-white border-b px-4 py-3 flex items-center shadow-sm">
                <button
                    onClick={() => router.back()}
                    className="mr-4 text-gray-600"
                >
                    ← 返回
                </button>
                <h1 className="text-lg font-bold">歷史紀錄</h1>
            </div>

            <div className="p-4 space-y-4">
                {confirmations.length === 0 ? (
                    <div className="text-center text-gray-500 py-10">目前沒有紀錄</div>
                ) : (
                    confirmations.map(conf => (
                        <div key={conf.id} className="bg-white p-4 rounded-xl border shadow-sm">
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <h3 className="font-bold text-lg">{conf.customer_name}</h3>
                                    <p className="text-sm text-gray-500">
                                        {new Date(conf.created_at).toLocaleString('zh-TW')}
                                    </p>
                                </div>
                                <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                                    {conf.adult_count}大{conf.child_count}小
                                </span>
                            </div>

                            <div className="text-sm text-gray-600 mb-3">
                                {conf.dining_type} · {conf.dining_purpose}
                            </div>

                            {selectedId === conf.id ? (
                                <div className="mt-3 pt-3 border-t">
                                    <div className="bg-gray-50 p-3 rounded text-sm font-mono whitespace-pre-wrap mb-3">
                                        {generateSummary(conf)}
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => copyToClipboard(generateSummary(conf))}
                                            className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium"
                                        >
                                            複製內容
                                        </button>
                                        <button
                                            onClick={() => setSelectedId(null)}
                                            className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium"
                                        >
                                            收起
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setSelectedId(conf.id)}
                                    className="w-full py-2 mt-2 text-blue-600 text-sm font-medium border border-blue-200 rounded-lg hover:bg-blue-50"
                                >
                                    查看詳情
                                </button>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}
