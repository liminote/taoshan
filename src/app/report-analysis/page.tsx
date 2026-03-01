'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface ReportAnalysis {
    id: string
    title: string
    report_date: string
    content: string
    created_at?: string
    updated_at?: string
    archived?: boolean
    tags?: string[]
}

export default function ReportAnalysisPage() {
    const [reports, setReports] = useState<ReportAnalysis[]>([])
    const [q, setQ] = useState('')
    const [tagFilter, setTagFilter] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [selected, setSelected] = useState<ReportAnalysis | null>(null)
    const [editingTitle, setEditingTitle] = useState('')
    const [editingDate, setEditingDate] = useState('')
    const [editingContent, setEditingContent] = useState('')
    const [editingTags, setEditingTags] = useState('')
    const [showCreateForm, setShowCreateForm] = useState(false)
    const getTodayString = () => new Date().toISOString().split('T')[0]
    const [newReport, setNewReport] = useState({ title: '', report_date: getTodayString(), content: '', tags: '' })
    const [allTags, setAllTags] = useState<string[]>([])
    const [tagSuggestions, setTagSuggestions] = useState<string[]>([])
    const [isCreating, setIsCreating] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const [isEditing, setIsEditing] = useState(false)

    const fetchReports = async (searchQ?: string, searchTag?: string) => {
        try {
            setIsLoading(true)
            const params = new URLSearchParams()
            if (searchQ) params.set('q', searchQ)
            if (searchTag) params.set('tag', searchTag)
            const res = await fetch('/api/report-analysis?' + params.toString())
            const data = await res.json()
            const recs = Array.isArray(data) ? data : []
            setReports(recs)

            const tags = new Set<string>()
            recs.forEach((r: ReportAnalysis) => {
                if (r.tags) r.tags.forEach(t => tags.add(t))
            })
            setAllTags(Array.from(tags))
        } catch (err) {
            console.error('fetch reports error', err)
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchReports()
    }, [])

    const onSearch = async (e?: any) => {
        if (e) e.preventDefault()
        await fetchReports(q, tagFilter)
    }

    const openDetail = (rec: ReportAnalysis) => {
        setSelected(rec)
        setEditingTitle(rec.title || '')
        const dateSource = rec.report_date || (rec.created_at ? rec.created_at.split('T')[0] : '')
        setEditingDate(dateSource)
        setEditingContent(rec.content)
        setEditingTags((rec.tags || []).join(', '))
        setIsEditing(false)
    }

    const closeDetail = () => {
        setSelected(null)
        setEditingTitle('')
        setEditingDate('')
        setEditingContent('')
        setEditingTags('')
    }

    const saveDetail = async () => {
        if (!selected) return
        if (!editingDate || !editingTitle.trim() || !editingContent.trim()) {
            alert('請填寫完整報告日期、標題與內容')
            return
        }
        try {
            setIsSaving(true)
            const body: any = {
                id: selected.id,
                report_date: editingDate,
                title: editingTitle,
                content: editingContent,
                tags: editingTags.split(',').map(s => s.trim()).filter(Boolean)
            }
            const res = await fetch('/api/report-analysis', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data?.error || '更新失敗')
            await fetchReports(q, tagFilter)
            closeDetail()
        } catch (err) {
            console.error('save error', err)
            alert('儲存失敗')
        } finally {
            setIsSaving(false)
        }
    }

    const deleteReport = async () => {
        if (!selected) return
        if (!confirm('確定要刪除這則報告分析嗎？')) return
        try {
            setIsDeleting(true)
            const res = await fetch(`/api/report-analysis?id=${selected.id}`, { method: 'DELETE' })
            const data = await res.json()
            if (!res.ok) throw new Error(data?.error || '刪除失敗')
            await fetchReports(q, tagFilter)
            closeDetail()
        } catch (err) {
            console.error('delete error', err)
            alert('刪除失敗')
        } finally {
            setIsDeleting(false)
        }
    }

    const createNewReport = async () => {
        if (!newReport.report_date || !newReport.title.trim() || !newReport.content.trim()) {
            alert('請填寫完整報告日期、標題與內容')
            return
        }
        try {
            setIsCreating(true)
            const res = await fetch('/api/report-analysis', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    report_date: newReport.report_date,
                    title: newReport.title,
                    content: newReport.content,
                    tags: newReport.tags.split(',').map(s => s.trim()).filter(Boolean)
                })
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data?.error || '建立失敗')
            setNewReport({ title: '', report_date: getTodayString(), content: '', tags: '' })
            setShowCreateForm(false)
            await fetchReports(q, tagFilter)
        } catch (err) {
            console.error('create error', err)
            alert('建立失敗')
        } finally {
            setIsCreating(false)
        }
    }

    const handleTagInputChange = (val: string, isCreateForm: boolean = false) => {
        if (isCreateForm) {
            setNewReport({ ...newReport, tags: val })
        } else {
            setEditingTags(val)
        }
        const parts = val.split(',')
        const current = parts[parts.length - 1].trim().toLowerCase()
        if (current.length > 0) {
            const suggestions = allTags.filter(t => t.toLowerCase().includes(current) && !val.includes(t))
            setTagSuggestions(suggestions.slice(0, 5))
        } else {
            setTagSuggestions([])
        }
    }

    const insertSuggestion = (tag: string, isCreateForm: boolean = false) => {
        const targetVal = isCreateForm ? newReport.tags : editingTags
        const parts = targetVal.split(',')
        parts[parts.length - 1] = tag
        const newVal = parts.join(', ') + ', '

        if (isCreateForm) {
            setNewReport({ ...newReport, tags: newVal })
        } else {
            setEditingTags(newVal)
        }
        setTagSuggestions([])
    }

    // 自動將 Excel 的 tab 分隔貼上轉換為 Markdown Table
    const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>, isCreateForm: boolean = false) => {
        const paste = e.clipboardData.getData('text/plain')

        // 檢查是否有 Tab 字元，通常從試算表貼上會有 Tab
        if (paste.includes('\t')) {
            e.preventDefault()

            const lines = paste.split(/\r?\n/).filter(line => line.trim() !== '')
            if (lines.length > 0) {
                let markdownTable = '\n\n'
                lines.forEach((line, index) => {
                    const cells = line.split('\t')
                    markdownTable += '| ' + cells.join(' | ') + ' |\n'

                    if (index === 0) {
                        markdownTable += '|' + cells.map(() => '---').join('|') + '|\n'
                    }
                })
                markdownTable += '\n'

                const target = e.target as HTMLTextAreaElement
                const start = target.selectionStart || 0
                const end = target.selectionEnd || 0
                const currentVal = target.value
                const newValue = currentVal.substring(0, start) + markdownTable + currentVal.substring(end)

                if (isCreateForm) {
                    setNewReport({ ...newReport, content: newValue })
                } else {
                    setEditingContent(newValue)
                }
            }
        }
    }

    const formatDate = (d?: string) => {
        if (!d) return ''
        return new Date(d).toLocaleString('zh-TW', { year: 'numeric', month: 'short', day: 'numeric' })
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-5xl mx-auto">
                <div className="mb-8 flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-[#2d3748]">報告分析</h1>
                        <p className="text-gray-600 mt-1">建立與管理專案分析與簡報數據（支援從 Excel 貼上表格）</p>
                    </div>
                    <Link href="/" className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">← 返回</Link>
                </div>

                <div className="mb-6 flex gap-2">
                    <form onSubmit={onSearch} className="flex-1 flex gap-2">
                        <input
                            value={q}
                            onChange={e => setQ(e.target.value)}
                            placeholder="報告標題或內容關鍵字搜尋..."
                            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                        <input
                            value={tagFilter}
                            onChange={e => setTagFilter(e.target.value)}
                            placeholder="Tag 過濾"
                            className="w-40 px-4 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                        <button type="submit" className="px-4 py-2 bg-secondary-500 text-white rounded-lg text-sm hover:bg-secondary-600">
                            搜尋
                        </button>
                    </form>
                    <button
                        onClick={() => {
                            setNewReport(prev => ({
                                title: prev.title,
                                report_date: prev.report_date || getTodayString(),
                                content: prev.content,
                                tags: prev.tags
                            }))
                            setShowCreateForm(true)
                        }}
                        className="px-4 py-2 bg-success-500 text-white rounded-lg text-sm hover:bg-success-600"
                    >
                        + 新增報告分析
                    </button>
                </div>

                {/* 建立表單 Modal */}
                {showCreateForm && (
                    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
                        <div className="bg-white max-w-4xl w-full rounded-2xl p-6 shadow-lg max-h-[90vh] overflow-y-auto">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-semibold">新增報告分析</h2>
                                <button onClick={() => setShowCreateForm(false)} className="text-gray-500 text-lg">✕</button>
                            </div>

                            <div className="space-y-4">
                                <div className="flex gap-4">
                                    <div className="flex-1">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">報告標題</label>
                                        <input
                                            type="text"
                                            value={newReport.title}
                                            onChange={e => setNewReport({ ...newReport, title: e.target.value })}
                                            placeholder="輸入標題..."
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                        />
                                    </div>
                                    <div className="w-1/3">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">日期</label>
                                        <input
                                            type="date"
                                            value={newReport.report_date}
                                            onChange={e => setNewReport({ ...newReport, report_date: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1 flex justify-between items-end">
                                        <span>分析內容（支援 Markdown）</span>
                                        <span className="text-xs text-secondary-600 font-normal">💡 小提示：您可以直接從 Excel 或 Google Sheets 複製範圍後貼上，系統會自動轉換為表格！</span>
                                    </label>
                                    <textarea
                                        value={newReport.content}
                                        onChange={e => setNewReport({ ...newReport, content: e.target.value })}
                                        onPaste={(e) => handlePaste(e, true)}
                                        rows={12}
                                        placeholder="輸入分析內容..."
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm"
                                    />
                                </div>

                                <div className="relative">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">標籤（用逗號分隔）</label>
                                    <input
                                        value={newReport.tags}
                                        onChange={e => handleTagInputChange(e.target.value, true)}
                                        placeholder="例：行銷, 月報"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                    />
                                    {tagSuggestions.length > 0 && (
                                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-10">
                                            {tagSuggestions.map(tag => (
                                                <button
                                                    key={tag}
                                                    type="button"
                                                    onClick={() => insertSuggestion(tag, true)}
                                                    className="block w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                                >
                                                    {tag}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                    <p className="text-xs text-gray-500 mt-1">已有標籤：{allTags.join(', ') || '無'}</p>
                                </div>
                            </div>

                            <div className="mt-6 flex justify-end gap-2">
                                <button
                                    onClick={() => setShowCreateForm(false)}
                                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                                >
                                    取消
                                </button>
                                <button
                                    onClick={createNewReport}
                                    disabled={isCreating}
                                    className="px-4 py-2 bg-success-500 text-white rounded-lg hover:bg-success-600 disabled:opacity-50"
                                >
                                    {isCreating ? '儲存中...' : '儲存報告'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* 記錄列表 */}
                <div className="bg-white border border-gray-200 rounded-2xl shadow-lg p-4">
                    {isLoading ? (
                        <div className="text-center py-8 text-gray-500">載入中...</div>
                    ) : reports.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            <p>尚無報告分析資料</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {reports.map(rec => (
                                <div
                                    key={rec.id}
                                    className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center"
                                    onClick={() => openDetail(rec)}
                                >
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-1">
                                            <div className="text-sm font-semibold text-gray-800">{rec.title}</div>
                                            <div className="text-xs text-gray-400 whitespace-nowrap">{formatDate(rec.report_date)}</div>
                                        </div>

                                        <div className="text-sm text-gray-500 line-clamp-2 md:w-3/4">
                                            {rec.content.replace(/(\\|)/g, '').replace(/\n/g, ' ')}
                                        </div>
                                    </div>
                                    <div className="shrink-0 flex gap-1 flex-wrap justify-end">
                                        {rec.tags && rec.tags.length > 0 && rec.tags.map(tag => (
                                            <span key={tag} className="inline-block px-2 py-1 bg-[#f4f4f5] text-[#52525b] border border-[#e4e4e7] text-xs rounded">
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* 詳情 & 編輯 Modal */}
                {selected && (
                    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
                        <div className="bg-white max-w-4xl w-full rounded-2xl p-6 shadow-lg max-h-[90vh] overflow-y-auto">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <div className="text-sm text-gray-500">{formatDate(selected.report_date)}</div>
                                    {isEditing ? (
                                        <h2 className="text-xl font-semibold mt-1">編輯報告分析</h2>
                                    ) : (
                                        <h2 className="text-2xl font-bold mt-1 text-[#2d3748]">{selected.title}</h2>
                                    )}
                                </div>
                                <button onClick={closeDetail} className="text-gray-400 text-2xl hover:text-gray-600">✕</button>
                            </div>

                            {isEditing ? (
                                <div className="space-y-4">
                                    <div className="flex gap-4">
                                        <div className="flex-1">
                                            <label className="block text-sm font-medium text-gray-700 mb-2">報告標題</label>
                                            <input
                                                value={editingTitle}
                                                onChange={e => setEditingTitle(e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                            />
                                        </div>
                                        <div className="w-1/3">
                                            <label className="block text-sm font-medium text-gray-700 mb-2">日期</label>
                                            <input
                                                type="date"
                                                value={editingDate}
                                                onChange={e => setEditingDate(e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2 flex justify-between items-end">
                                            <span>完整內容（支援 Markdown）</span>
                                            <span className="text-xs text-secondary-600 font-normal">可以直接從 Excel 複製貼上轉為表格。</span>
                                        </label>
                                        <textarea
                                            value={editingContent}
                                            onChange={e => setEditingContent(e.target.value)}
                                            onPaste={(e) => handlePaste(e, false)}
                                            rows={14}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
                                        />
                                    </div>

                                    <div className="relative">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">標籤（用逗號分隔）</label>
                                        <input
                                            value={editingTags}
                                            onChange={e => handleTagInputChange(e.target.value, false)}
                                            placeholder="例：產品, 重要"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                        />
                                        {tagSuggestions.length > 0 && (
                                            <div className="absolute top-full left-0 bottom-auto mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-10 w-full">
                                                {tagSuggestions.map(tag => (
                                                    <button
                                                        key={tag}
                                                        type="button"
                                                        onClick={() => insertSuggestion(tag, false)}
                                                        className="block w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                                    >
                                                        {tag}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    <div>
                                        <div className="prose prose-sm md:prose max-w-none 
                                    prose-headings:text-[#2d3748] prose-p:text-gray-600 
                                    prose-th:bg-secondary-50 prose-th:text-[#3f3f46] prose-th:px-4 prose-th:py-2 prose-th:border prose-th:border-gray-200
                                    prose-td:px-4 prose-td:py-2 prose-td:border prose-td:border-gray-200">
                                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                {selected.content}
                                            </ReactMarkdown>
                                        </div>
                                    </div>

                                    {selected.tags && selected.tags.length > 0 && (
                                        <div className="pt-4 mt-4 border-t border-gray-100">
                                            <div className="flex flex-wrap gap-2">
                                                {selected.tags.map(tag => (
                                                    <span key={tag} className="inline-block px-2 py-1 bg-[#f4f4f5] text-[#52525b] border border-[#e4e4e7] text-xs rounded-full">
                                                        #{tag}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="mt-6 flex justify-end gap-2 pt-4 border-t mt-8">
                                {isEditing ? (
                                    <>
                                        <button
                                            onClick={() => setIsEditing(false)}
                                            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                                        >
                                            取消編輯
                                        </button>
                                        <button
                                            onClick={saveDetail}
                                            disabled={isSaving}
                                            className={`px-4 py-2 text-white rounded-lg transition-colors ${isSaving ? 'bg-secondary-300 cursor-not-allowed' : 'bg-secondary-500 hover:bg-secondary-600'
                                                }`}
                                        >
                                            {isSaving ? '儲存中...' : '儲存變更'}
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <button
                                            onClick={deleteReport}
                                            disabled={isDeleting}
                                            className="px-4 py-2 border border-error-200 text-error-600 rounded-lg hover:bg-error-50 disabled:opacity-50 mr-auto"
                                        >
                                            {isDeleting ? '刪除中...' : '刪除報告'}
                                        </button>
                                        <button
                                            onClick={closeDetail}
                                            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                                        >
                                            關閉
                                        </button>
                                        <button
                                            onClick={() => setIsEditing(true)}
                                            className="px-4 py-2 bg-secondary-500 text-white rounded-lg hover:bg-secondary-600"
                                        >
                                            編輯
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
