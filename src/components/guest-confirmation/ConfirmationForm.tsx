'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

type GuestRequirement = {
    requirements: string[]
    other_requirement: string
}

const DINING_TYPES = ['單點', '配菜', '無菜單', '其他']
const DINING_PURPOSES = ['家庭聚會', '朋友聚餐', '公司聚餐', '情侶聚餐']
const REQUIREMENT_OPTIONS = ['無', '不吃生食', '不吃牛肉', '蝦蟹過敏']

export default function ConfirmationForm() {
    const router = useRouter()
    const [step, setStep] = useState<'input' | 'summary'>('input')
    const [loading, setLoading] = useState(false)

    // Form State
    const [customerName, setCustomerName] = useState('')
    const [adultCount, setAdultCount] = useState(1)
    const [childCount, setChildCount] = useState(0)
    const [diningType, setDiningType] = useState('單點')
    const [diningTypeOther, setDiningTypeOther] = useState('')
    const [diningPurpose, setDiningPurpose] = useState('家庭聚會')
    const [alcoholAllowed, setAlcoholAllowed] = useState<boolean | null>(null)
    const [notes, setNotes] = useState('')
    const [guests, setGuests] = useState<GuestRequirement[]>([{ requirements: ['無'], other_requirement: '' }])

    // Update guests array when counts change
    useEffect(() => {
        const total = Math.max(1, adultCount + childCount)
        setGuests(prev => {
            if (prev.length === total) return prev
            if (prev.length < total) {
                return [...prev, ...Array(total - prev.length).fill(null).map(() => ({ requirements: ['無'], other_requirement: '' }))]
            }
            return prev.slice(0, total)
        })
    }, [adultCount, childCount])

    const handleRequirementChange = (index: number, option: string) => {
        setGuests(prev => prev.map((g, i) => {
            if (i !== index) return g

            let newReqs = [...g.requirements]
            if (option === '無') {
                newReqs = ['無']
            } else {
                newReqs = newReqs.filter(r => r !== '無') // Remove '無' if checking something else
                if (newReqs.includes(option)) {
                    newReqs = newReqs.filter(r => r !== option)
                } else {
                    newReqs.push(option)
                }
                if (newReqs.length === 0) newReqs = ['無']
            }
            return { ...g, requirements: newReqs }
        }))
    }

    const handleOtherRequirementChange = (index: number, value: string) => {
        setGuests(prev => prev.map((g, i) => i === index ? { ...g, other_requirement: value } : g))
    }

    const applyAll = (sourceIndex: number) => {
        const source = guests[sourceIndex]
        setGuests(prev => prev.map(() => ({ ...source })))
        alert('已套用至所有客人')
    }

    const generateSummary = () => {
        const type = diningType === '其他' ? diningTypeOther : diningType
        let summary = `【訂位確認】\n`
        summary += `姓名：${customerName}\n`
        summary += `人數：${adultCount}大 ${childCount}小\n`
        summary += `用餐形式：${type}\n`
        summary += `用餐目的：${diningPurpose}\n`
        summary += `飲酒：${alcoholAllowed ? '是' : '否'}\n`
        summary += `----------------\n`

        guests.forEach((g, i) => {
            const reqs = g.requirements.join('、')
            const other = g.other_requirement ? ` (${g.other_requirement})` : ''
            summary += `客人${i + 1}：${reqs}${other}\n`
        })

        if (notes) {
            summary += `----------------\n`
            summary += `備註：${notes}\n`
        }

        return summary
    }

    const handleSubmit = async () => {
        setLoading(true)
        try {
            const res = await fetch('/api/guest-confirmations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    customer_name: customerName,
                    adult_count: adultCount,
                    child_count: childCount,
                    dining_type: diningType === '其他' ? diningTypeOther : diningType,
                    dining_purpose: diningPurpose,
                    alcohol_allowed: alcoholAllowed,
                    notes,
                    guests
                })
            })

            if (!res.ok) throw new Error('Failed to save')

            setStep('summary')
        } catch (error) {
            alert('儲存失敗，請重試')
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    const copyToClipboard = () => {
        const text = generateSummary()
        navigator.clipboard.writeText(text).then(() => {
            alert('已複製到剪貼簿！')
        })
    }

    if (step === 'summary') {
        return (
            <div className="space-y-6 p-4 max-w-md mx-auto bg-white min-h-screen">
                <div className="bg-green-50 p-4 rounded-lg border border-green-200 text-center">
                    <h2 className="text-xl font-bold text-green-800 mb-2">確認完成！</h2>
                    <p className="text-green-600">資料已成功儲存</p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 whitespace-pre-wrap font-mono text-sm">
                    {generateSummary()}
                </div>

                <button
                    onClick={copyToClipboard}
                    className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold text-lg shadow-lg active:scale-95 transition-transform"
                >
                    複製摘要內容
                </button>

                <div className="grid grid-cols-2 gap-4 mt-4">
                    <button
                        onClick={() => window.location.reload()}
                        className="py-3 bg-gray-100 text-gray-700 rounded-lg font-medium"
                    >
                        新增下一筆
                    </button>
                    <button
                        onClick={() => router.push('/guest-confirmation/history')}
                        className="py-3 bg-gray-100 text-gray-700 rounded-lg font-medium"
                    >
                        查看歷史紀錄
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="max-w-md mx-auto bg-white min-h-screen pb-20">
            <div className="sticky top-0 z-10 bg-white border-b px-4 py-3 flex justify-between items-center shadow-sm">
                <h1 className="text-lg font-bold">客人需求確認</h1>
                <button
                    onClick={() => router.push('/guest-confirmation/history')}
                    className="text-sm text-blue-600 font-medium"
                >
                    歷史紀錄
                </button>
            </div>

            <div className="p-4 space-y-6">
                {/* Basic Info */}
                <section className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">客人姓名</label>
                        <input
                            type="text"
                            value={customerName}
                            onChange={e => setCustomerName(e.target.value)}
                            className="w-full p-3 border rounded-lg text-lg"
                            placeholder="輸入姓名"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">大人</label>
                            <div className="flex items-center border rounded-lg overflow-hidden">
                                <button onClick={() => setAdultCount(Math.max(1, adultCount - 1))} className="p-3 bg-gray-50 border-r">-</button>
                                <input
                                    type="number"
                                    value={adultCount}
                                    onChange={e => setAdultCount(Number(e.target.value))}
                                    className="w-full text-center p-2"
                                />
                                <button onClick={() => setAdultCount(adultCount + 1)} className="p-3 bg-gray-50 border-l">+</button>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">小孩</label>
                            <div className="flex items-center border rounded-lg overflow-hidden">
                                <button onClick={() => setChildCount(Math.max(0, childCount - 1))} className="p-3 bg-gray-50 border-r">-</button>
                                <input
                                    type="number"
                                    value={childCount}
                                    onChange={e => setChildCount(Number(e.target.value))}
                                    className="w-full text-center p-2"
                                />
                                <button onClick={() => setChildCount(childCount + 1)} className="p-3 bg-gray-50 border-l">+</button>
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">用餐形式</label>
                        <div className="grid grid-cols-2 gap-2">
                            {DINING_TYPES.map(type => (
                                <button
                                    key={type}
                                    onClick={() => setDiningType(type)}
                                    className={`p-3 rounded-lg border text-sm font-medium transition-colors ${diningType === type
                                            ? 'bg-blue-50 border-blue-500 text-blue-700'
                                            : 'bg-white border-gray-200 text-gray-600'
                                        }`}
                                >
                                    {type}
                                </button>
                            ))}
                        </div>
                        {diningType === '其他' && (
                            <input
                                type="text"
                                value={diningTypeOther}
                                onChange={e => setDiningTypeOther(e.target.value)}
                                placeholder="請輸入其他形式"
                                className="mt-2 w-full p-2 border rounded-lg"
                            />
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">用餐目的</label>
                        <div className="grid grid-cols-2 gap-2">
                            {DINING_PURPOSES.map(purpose => (
                                <button
                                    key={purpose}
                                    onClick={() => setDiningPurpose(purpose)}
                                    className={`p-3 rounded-lg border text-sm font-medium transition-colors ${diningPurpose === purpose
                                            ? 'bg-blue-50 border-blue-500 text-blue-700'
                                            : 'bg-white border-gray-200 text-gray-600'
                                        }`}
                                >
                                    {purpose}
                                </button>
                            ))}
                        </div>
                    </div>
                </section>

                <hr className="border-gray-200" />

                {/* Guest Requirements */}
                <section className="space-y-6">
                    <h2 className="font-bold text-lg">個別需求確認</h2>
                    {guests.map((guest, index) => (
                        <div key={index} className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="font-bold text-gray-800">第 {index + 1} 位客人</h3>
                                {index === 0 && guests.length > 1 && (
                                    <button
                                        onClick={() => applyAll(0)}
                                        className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200"
                                    >
                                        套用至全部
                                    </button>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-2 mb-3">
                                {REQUIREMENT_OPTIONS.map(opt => (
                                    <label
                                        key={opt}
                                        className={`flex items-center p-2 rounded border cursor-pointer ${guest.requirements.includes(opt)
                                                ? 'bg-white border-blue-500 ring-1 ring-blue-500'
                                                : 'bg-white border-gray-200'
                                            }`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={guest.requirements.includes(opt)}
                                            onChange={() => handleRequirementChange(index, opt)}
                                            className="mr-2 h-4 w-4 text-blue-600"
                                        />
                                        <span className="text-sm">{opt}</span>
                                    </label>
                                ))}
                            </div>

                            <input
                                type="text"
                                value={guest.other_requirement}
                                onChange={e => handleOtherRequirementChange(index, e.target.value)}
                                placeholder="其他需求（選填）"
                                className="w-full p-2 border rounded bg-white text-sm"
                            />
                        </div>
                    ))}
                </section>

                <hr className="border-gray-200" />

                {/* Overall Notes */}
                <section className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">是否飲酒</label>
                        <div className="flex gap-4">
                            <label className={`flex-1 p-3 border rounded-lg flex items-center justify-center gap-2 cursor-pointer ${alcoholAllowed === true ? 'bg-blue-50 border-blue-500' : ''}`}>
                                <input type="radio" name="alcohol" checked={alcoholAllowed === true} onChange={() => setAlcoholAllowed(true)} className="w-4 h-4" />
                                是
                            </label>
                            <label className={`flex-1 p-3 border rounded-lg flex items-center justify-center gap-2 cursor-pointer ${alcoholAllowed === false ? 'bg-blue-50 border-blue-500' : ''}`}>
                                <input type="radio" name="alcohol" checked={alcoholAllowed === false} onChange={() => setAlcoholAllowed(false)} className="w-4 h-4" />
                                否
                            </label>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">整體注意事項</label>
                        <textarea
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            className="w-full p-3 border rounded-lg h-24"
                            placeholder="其他備註事項..."
                        />
                    </div>
                </section>
            </div>

            <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t shadow-lg">
                <button
                    onClick={handleSubmit}
                    disabled={loading || !customerName}
                    className={`w-full py-4 rounded-xl font-bold text-lg text-white shadow-md transition-transform active:scale-95 ${loading || !customerName ? 'bg-gray-300' : 'bg-blue-600'
                        }`}
                >
                    {loading ? '儲存中...' : '確認送出'}
                </button>
            </div>
        </div>
    )
}
