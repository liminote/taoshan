'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface MeetingRecord {
  id: number
  meeting_date: string
  content: string
  summary?: string | null
  created_at?: string
  updated_at?: string
  completed?: boolean
  completed_at?: string | null
  archived?: boolean
  tags?: string[]
}

export default function MeetingRecordsPage() {
  const [records, setRecords] = useState<MeetingRecord[]>([])
  const [q, setQ] = useState('')
  const [tagFilter, setTagFilter] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [selected, setSelected] = useState<MeetingRecord | null>(null)
  const [editingSummary, setEditingSummary] = useState('')
  const [editingDate, setEditingDate] = useState('')
  const [editingContent, setEditingContent] = useState('')
  const [editingTags, setEditingTags] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const getTodayString = () => new Date().toISOString().split('T')[0]
  const [newRecord, setNewRecord] = useState({ meeting_date: getTodayString(), content: '', tags: '' })
  const [allTags, setAllTags] = useState<string[]>([])
  const [tagSuggestions, setTagSuggestions] = useState<string[]>([])
  const [isCreating, setIsCreating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [videoList, setVideoList] = useState<any[]>([])
  const [isLoadingVideos, setIsLoadingVideos] = useState(false)
  const [isProcessingVideo, setIsProcessingVideo] = useState(false)

  const [emptyMessage, setEmptyMessage] = useState('')

  const fetchVideoList = async () => {
    try {
      setIsLoadingVideos(true)
      setEmptyMessage('')
      const res = await fetch('/api/meeting-records/list-videos')
      const data = await res.json()
      if (data.error) throw new Error(data.error)

      const files = data.files || []
      setVideoList(files)

      if (files.length === 0 && data.message) {
        setEmptyMessage(data.message)
      }
    } catch (err: any) {
      console.error('fetch videos error', err)
      alert(`讀取失敗: ${err.message}\n\n請截圖此畫面傳給工程師。`)
    } finally {
      setIsLoadingVideos(false)
    }
  }

  const handleVideoSelect = async (fileId: string, fileName: string) => {
    if (!confirm(`確定要處理影片「${fileName}」嗎？這可能需要幾分鐘的時間。`)) return

    try {
      setIsProcessingVideo(true)
      const res = await fetch('/api/meeting-records/process-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId, fileName })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '處理失敗')

      alert('會議記錄已生成！')
      setShowUploadModal(false)
      await fetchRecords()
    } catch (err: any) {
      console.error('process video error', err)
      alert(`處理失敗: ${err.message}`)
    } finally {
      setIsProcessingVideo(false)
    }
  }

  const fetchRecords = async (searchQ?: string, searchTag?: string) => {
    try {
      setIsLoading(true)
      const params = new URLSearchParams()
      if (searchQ) params.set('q', searchQ)
      if (searchTag) params.set('tag', searchTag)
      const res = await fetch('/api/meeting-records?' + params.toString())
      const data = await res.json()
      const recs = Array.isArray(data) ? data : []
      setRecords(recs)

      // 聚合所有 tags 供自動完成
      const tags = new Set<string>()
      recs.forEach((r: MeetingRecord) => {
        if (r.tags) r.tags.forEach(t => tags.add(t))
      })
      setAllTags(Array.from(tags))
    } catch (err) {
      console.error('fetch records error', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchRecords()
  }, [])

  const onSearch = async (e?: any) => {
    if (e) e.preventDefault()
    await fetchRecords(q, tagFilter)
  }

  const openDetail = (rec: MeetingRecord) => {
    setSelected(rec)
    setEditingSummary(rec.summary || '')
    const dateSource = rec.meeting_date || (rec.created_at ? rec.created_at.split('T')[0] : '')
    setEditingDate(dateSource)
    setEditingContent(rec.content)
    setEditingTags((rec.tags || []).join(', '))
  }

  const closeDetail = () => {
    setSelected(null)
    setEditingSummary('')
    setEditingDate('')
    setEditingContent('')
    setEditingTags('')
  }

  const saveDetail = async () => {
    if (!selected) return
    if (!editingDate || !editingContent.trim()) {
      alert('請填寫會議日期與內容')
      return
    }
    try {
      setIsSaving(true)
      const body: any = {
        id: selected.id,
        meeting_date: editingDate,
        content: editingContent,
        tags: editingTags.split(',').map(s => s.trim()).filter(Boolean)
      }
      if (editingSummary.trim()) {
        body.summary = editingSummary.trim()
      }
      const res = await fetch('/api/meeting-records', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || '更新失敗')
      await fetchRecords(q, tagFilter)
      closeDetail()
    } catch (err) {
      console.error('save error', err)
      alert('儲存失敗')
    } finally {
      setIsSaving(false)
    }
  }

  const deleteRecord = async () => {
    if (!selected) return
    if (!confirm('確定要刪除這則會議記錄嗎？')) return
    try {
      setIsDeleting(true)
      const res = await fetch(`/api/meeting-records?id=${selected.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || '刪除失敗')
      await fetchRecords(q, tagFilter)
      closeDetail()
    } catch (err) {
      console.error('delete error', err)
      alert('刪除失敗')
    } finally {
      setIsDeleting(false)
    }
  }

  const createNewRecord = async () => {
    if (!newRecord.meeting_date || !newRecord.content) {
      alert('請填入會議日期與內容')
      return
    }
    try {
      setIsCreating(true)
      const res = await fetch('/api/meeting-records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meeting_date: newRecord.meeting_date,
          content: newRecord.content,
          tags: newRecord.tags.split(',').map(s => s.trim()).filter(Boolean)
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || '建立失敗')
      setNewRecord({ meeting_date: getTodayString(), content: '', tags: '' })
      setShowCreateForm(false)
      await fetchRecords(q, tagFilter)
    } catch (err) {
      console.error('create error', err)
      alert('建立失敗')
    } finally {
      setIsCreating(false)
    }
  }

  const handleTagInputChange = (val: string) => {
    setEditingTags(val)
    // 簡單的 autocomplete：取最後一個逗號後的部分，篩選匹配
    const parts = val.split(',')
    const current = parts[parts.length - 1].trim().toLowerCase()
    if (current.length > 0) {
      const suggestions = allTags.filter(t => t.toLowerCase().includes(current) && !val.includes(t))
      setTagSuggestions(suggestions.slice(0, 5))
    } else {
      setTagSuggestions([])
    }
  }

  const insertSuggestion = (tag: string) => {
    const parts = editingTags.split(',')
    parts[parts.length - 1] = tag
    setEditingTags(parts.join(', ') + ', ')
    setTagSuggestions([])
  }

  const formatDate = (d?: string) => {
    if (!d) return ''
    return new Date(d).toLocaleString('zh-TW', { year: 'numeric', month: 'short', day: 'numeric' })
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        {/* 標題與返回 */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">會議記錄</h1>
            <p className="text-gray-600 mt-1">建立、搜尋與管理會議紀錄</p>
          </div>
          <Link href="/" className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">← 返回</Link>
        </div>

        {/* 搜尋 & 建立按鈕 */}
        <div className="mb-6 flex gap-2">
          <form onSubmit={onSearch} className="flex-1 flex gap-2">
            <input
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="關鍵字搜尋..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm"
            />
            <input
              value={tagFilter}
              onChange={e => setTagFilter(e.target.value)}
              placeholder="Tag 過濾"
              className="w-40 px-4 py-2 border border-gray-300 rounded-lg text-sm"
            />
            <button type="submit" className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600">
              搜尋
            </button>
          </form>
          <button
            onClick={() => {
              setNewRecord(prev => ({
                meeting_date: prev.meeting_date || getTodayString(),
                content: prev.content,
                tags: prev.tags
              }))
              setShowCreateForm(true)
            }}
            className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600"
          >
            + 新增記錄
          </button>
          <button
            onClick={() => {
              setShowUploadModal(true)
              fetchVideoList()
            }}
            className="px-4 py-2 bg-indigo-500 text-white rounded-lg text-sm hover:bg-indigo-600"
          >
            音檔上傳
          </button>
        </div>

        {/* 音檔上傳 Modal */}
        {showUploadModal && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
            <div className="bg-white max-w-2xl w-full rounded-2xl p-6 shadow-lg max-h-[80vh] flex flex-col">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">選擇會議影片 (Meet Recordings)</h2>
                <button onClick={() => setShowUploadModal(false)} className="text-gray-500 text-lg">✕</button>
              </div>

              <div className="flex-1 overflow-y-auto min-h-[300px]">
                {isLoadingVideos ? (
                  <div className="text-center py-12 text-gray-500">載入影片列表中...</div>
                ) : isProcessingVideo ? (
                  <div className="text-center py-12 text-gray-500 flex flex-col items-center gap-4">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500"></div>
                    <p>正在處理影片並生成會議記錄...</p>
                    <p className="text-sm text-gray-400">這可能需要幾分鐘，請勿關閉視窗</p>
                  </div>
                ) : videoList.length === 0 ? (
                  <div className="text-center py-12 text-gray-500 px-8 whitespace-pre-wrap">
                    {emptyMessage || '找不到影片，請確認 Google Drive 的 "Meet Recordings" 資料夾中有 MP4 檔案。'}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="bg-yellow-50 p-3 rounded-lg text-sm text-yellow-800 mb-4">
                      <p>⚠️ 注意：免費版伺服器有 10 秒執行限制。</p>
                      <p>若影片過大（建議小於 50MB），處理將會失敗。建議使用純音檔或較短的影片。</p>
                    </div>
                    {videoList.map((file) => {
                      const sizeMb = file.size ? (parseInt(file.size) / 1024 / 1024).toFixed(1) : '?'
                      const isLarge = file.size && parseInt(file.size) > 50 * 1024 * 1024

                      return (
                        <button
                          key={file.id}
                          onClick={() => handleVideoSelect(file.id, file.name)}
                          className={`w-full text-left p-4 border rounded-lg transition flex justify-between items-center group ${isLarge ? 'border-red-200 bg-red-50 hover:bg-red-100' : 'border-gray-200 hover:bg-indigo-50'
                            }`}
                        >
                          <div>
                            <div className={`font-medium ${isLarge ? 'text-red-700' : 'text-gray-900 group-hover:text-indigo-700'}`}>
                              {file.name}
                            </div>
                            <div className="text-xs text-gray-500 mt-1 flex gap-2">
                              <span>{new Date(file.createdTime).toLocaleString()}</span>
                              <span className={`font-mono ${isLarge ? 'text-red-600 font-bold' : ''}`}>
                                {sizeMb} MB
                              </span>
                              {file.mimeType && <span className="text-gray-400">({file.mimeType.split('/')[1]})</span>}
                            </div>
                          </div>
                          <div className={`${isLarge ? 'text-red-500' : 'text-indigo-500'} opacity-0 group-hover:opacity-100 transition`}>
                            {isLarge ? '嘗試處理 →' : '選擇 →'}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowUploadModal(false)}
                  disabled={isProcessingVideo}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 建立表單 Modal */}
        {showCreateForm && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
            <div className="bg-white max-w-2xl w-full rounded-2xl p-6 shadow-lg">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">建立新的會議記錄</h2>
                <button onClick={() => setShowCreateForm(false)} className="text-gray-500 text-lg">✕</button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">會議日期</label>
                  <input
                    type="date"
                    value={newRecord.meeting_date}
                    onChange={e => setNewRecord({ ...newRecord, meeting_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">會議內容</label>
                  <textarea
                    value={newRecord.content}
                    onChange={e => setNewRecord({ ...newRecord, content: e.target.value })}
                    rows={6}
                    placeholder="輸入會議內容..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">標籤（用逗號分隔）</label>
                  <input
                    value={newRecord.tags}
                    onChange={e => setNewRecord({ ...newRecord, tags: e.target.value })}
                    placeholder="例：產品, 重要"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
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
                  onClick={createNewRecord}
                  disabled={isCreating}
                  className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
                >
                  {isCreating ? '建立中...' : '建立'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 記錄列表 */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-lg p-4">
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">載入中...</div>
          ) : records.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>尚無會議記錄</p>
            </div>
          ) : (
            <div className="space-y-3">
              {records.map(rec => (
                <div
                  key={rec.id}
                  className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition"
                  onClick={() => openDetail(rec)}
                >
                  <div>
                    <div className="text-sm text-gray-500 font-medium">{formatDate(rec.meeting_date || rec.created_at)}</div>
                    <div className="mt-2">
                      {rec.summary ? (
                        <div className="text-sm text-gray-700 whitespace-pre-line line-clamp-3">
                          {rec.summary}
                        </div>
                      ) : (
                        <div className="text-sm text-gray-600 line-clamp-2">{rec.content}</div>
                      )}
                    </div>
                    {rec.tags && rec.tags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {rec.tags.map(tag => (
                          <span key={tag} className="inline-block px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 詳情 Modal */}
        {selected && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
            <div className="bg-white max-w-2xl w-full rounded-2xl p-6 shadow-lg max-h-screen overflow-y-auto">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="text-sm text-gray-500">{formatDate(selected.meeting_date || selected.created_at)}</div>
                  <h2 className="text-xl font-semibold mt-1">會議詳情</h2>
                </div>
                <button onClick={closeDetail} className="text-gray-400 text-2xl hover:text-gray-600">✕</button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">會議日期</label>
                  <input
                    type="date"
                    value={editingDate}
                    onChange={e => setEditingDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">完整內容</label>
                  <textarea
                    value={editingContent}
                    onChange={e => setEditingContent(e.target.value)}
                    rows={6}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">重點摘要（可編輯）</label>
                  <textarea
                    value={editingSummary}
                    onChange={e => setEditingSummary(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>

                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-2">標籤（用逗號分隔）</label>
                  <input
                    value={editingTags}
                    onChange={e => handleTagInputChange(e.target.value)}
                    placeholder="例：產品, 重要"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                  {tagSuggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-10">
                      {tagSuggestions.map(tag => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => insertSuggestion(tag)}
                          className="block w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-2">
                <button
                  onClick={deleteRecord}
                  disabled={isDeleting}
                  className="px-4 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50"
                >
                  {isDeleting ? '刪除中...' : '刪除'}
                </button>
                <button
                  onClick={closeDetail}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  onClick={saveDetail}
                  disabled={isSaving}
                  className={`px-4 py-2 text-white rounded-lg transition-colors ${isSaving ? 'bg-blue-300 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600'
                    }`}
                >
                  {isSaving ? '儲存中...' : '儲存'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
