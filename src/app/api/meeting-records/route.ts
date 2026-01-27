import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { cache } from '@/lib/cache'
import { parseActionItemsFromContent } from '@/lib/meeting-parser'

let supabaseClient: ReturnType<typeof createClient> | null = null
function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const supabaseKey = serviceRoleKey || anonKey

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase environment variables are not configured')
  }

  if (!serviceRoleKey) {
    console.warn('[meeting-records] SUPABASE_SERVICE_ROLE_KEY not set, falling back to anon key. Writes may be limited by RLS.')
  }

  if (!supabaseClient) {
    supabaseClient = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    })
  }

  return supabaseClient
}

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || '')

async function generateThreeBulletSummary(content: string): Promise<string | null> {
  try {
    if (!process.env.GOOGLE_AI_API_KEY) return null

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
    const prompt = `請閱讀以下會議內容，整理成約 2-3 句的「重點摘要」，用自然段落描述會議核心討論、結論或決策方向；聚焦於具體行動或策略，而非重複會議標題或日期，也不要列出純粹的數字或待辦清單：\n\n${content}`

    const result = await model.generateContent({
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: prompt
            }
          ]
        }
      ],
      systemInstruction: '你是一位會議紀錄助理，請生成精簡的三點式會議摘要，使用繁體中文。'
    })

    const response = result.response
    const text = response.text()
    return text ? text.trim() : null
  } catch (err) {
    console.error('generateThreeBulletSummary error:', err)
    return null
  }
}

function toISODateString(date: Date) {
  return date.toISOString().split('T')[0]
}

function normalizeSentence(sentence: string): string {
  return sentence
    .replace(/^[-=＊*＿#]+$/g, '')
    .replace(/^(\d+(?:\.\d+)*[\.．、:]?\s*)/, '')
    .replace(/^[\-\*•]+\s*/, '')
    .trim()
}

function generateFallbackSummary(content: string): string | null {
  const segments = content
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
    .flatMap(line =>
      line
        .split(/[。！？]/)
        .map(seg => seg.trim())
        .filter(Boolean)
    )

  if (segments.length === 0) return null
  const unique = Array.from(new Set(segments))
  const normalized = unique
    .map(normalizeSentence)
    .filter(Boolean)

  if (normalized.length === 0) return null

  return normalized
    .slice(0, 3)
    .join('，')
}

function extractSummaryFromContent(content: string): string | null {
  if (!content) return null
  const normalized = content.replace(/\r/g, '')
  const patterns = [
    /第一項[:：]?\s*會議摘要[\s\n]*([\s\S]*?)(?:\n[-=]{3,}|\n\s*第二項|\n\s*第三項|$)/im,
    /會議摘要[\s\n]*([\s\S]*?)(?:\n[-=]{3,}|\n\s*第二項|\n\s*第三項|$)/im
  ]

  for (const regex of patterns) {
    const match = normalized.match(regex)
    if (match && match[1]) {
      const text = match[1].trim()
      if (text) return text
    }
  }

  return null
}

interface ParsedTodo {
  content: string
  assignee: string
  dueDate: string
}

const IMPORTANT_ITEMS_CACHE_KEYS = [
  'important-items-pending-50',
  'important-items-all-50',
  'important-items-pending-100',
  'important-items-all-100'
]

function clearImportantItemsCache() {
  IMPORTANT_ITEMS_CACHE_KEYS.forEach(key => cache.delete(key))
}

function parseDeadlineText(text: string | undefined, meetingDate: string): string {
  const meeting = meetingDate ? new Date(meetingDate) : new Date()
  const fallback = toISODateString(meeting)
  if (!text) return fallback

  const normalized = text.replace(/\s+/g, ' ').trim()
  const fullMatch = normalized.match(/(\d{4})[\/\-\.年](\d{1,2})[\/\-\.月](\d{1,2})/)
  if (fullMatch) {
    const [, yearStr, monthStr, dayStr] = fullMatch
    const date = new Date(Date.UTC(Number(yearStr), Number(monthStr) - 1, Number(dayStr)))
    return toISODateString(date)
  }

  const monthDayMatch = normalized.match(/(\d{1,2})(?:[\/\-\.月])(\d{1,2})(?:日)?/)
  if (monthDayMatch) {
    let year = meeting.getFullYear()
    const month = Number(monthDayMatch[1])
    const day = Number(monthDayMatch[2])
    if (!Number.isNaN(meeting.getTime())) {
      const meetingMonth = meeting.getMonth() + 1
      if (month < meetingMonth - 1) {
        year += 1
      }
    }
    const date = new Date(Date.UTC(year, month - 1, day))
    return toISODateString(date)
  }

  return fallback
}

function parseTodoLine(line: string, meetingDate: string): ParsedTodo | null {
  const trimmed = line.trim()
  if (!trimmed) return null

  if (
    trimmed.includes('內容') &&
    trimmed.includes('負責') &&
    trimmed.includes('預計完成')
  ) {
    return null
  }

  const tableTodo = parseTableTodoLine(trimmed, meetingDate)
  if (tableTodo) return tableTodo

  const indicatorMatch = trimmed.match(/^(\d+[\.\)．、]?|[-*•▪])\s*/)
  if (!indicatorMatch) return null

  let working = trimmed.slice(indicatorMatch[0].length).trim()
  if (!working) return null

  let description = working
  let metadata = ''

  const periodIndex = working.indexOf('。')
  if (periodIndex !== -1) {
    description = working.slice(0, periodIndex).trim()
    metadata = working.slice(periodIndex + 1).trim()
  }

  if (!metadata) {
    const dashSplit = working.split(/\s+-\s+/)
    if (dashSplit.length > 1) {
      description = dashSplit[0].trim()
      metadata = dashSplit.slice(1).join(' ').trim()
    }
  }

  if (!metadata) {
    const colonIndex = working.indexOf('：')
    if (colonIndex !== -1) {
      description = working.slice(0, colonIndex).trim()
      metadata = working.slice(colonIndex + 1).trim()
    }
  }

  if (!metadata) {
    metadata = working.replace(description, '').trim()
  }

  metadata = metadata.replace(/^[\-。、，,\s]+/, '').replace(/[。]+$/, '').trim()
  if (!description || !metadata) return null

  const tokens = metadata.split(/\s+/).filter(Boolean)
  if (tokens.length === 0) return null

  const assignee = tokens.shift()!
  if (!assignee) return null

  const deadlineText = tokens.join(' ')
  const dueDate = parseDeadlineText(deadlineText, meetingDate)

  return {
    content: description,
    assignee,
    dueDate
  }
}

function parseTableTodoLine(line: string, meetingDate: string): ParsedTodo | null {
  const cleaned = line.replace(/\u00A0/g, ' ').trim()
  if (!cleaned) return null

  const parts = cleaned.split(/\s*[|｜]\s*/).map(part => part.trim()).filter(Boolean)
  if (parts.length < 3) return null

  const [content, assigneeRaw, dueRaw] = parts
  if (!content || !assigneeRaw || !dueRaw) return null

  const assignee = assigneeRaw.split(/[、,，\/&]/)[0].trim() || assigneeRaw
  const dueDate = dueRaw.trim() || meetingDate

  if (!content.trim() || !assignee.trim()) return null

  return {
    content: content.trim(),
    assignee,
    dueDate
  }
}

// Use shared parser directly
function extractTodosFromContent(content: string, meetingDate: string): any[] {
  return parseActionItemsFromContent(content, meetingDate)
}

async function syncTodosToImportantItems(
  supabase: ReturnType<typeof createClient>,
  todos: any[]
) {
  if (!todos.length) return

  // Deduplication: Check for existing items with same content/assignee/date
  const contents = todos.map(t => t.content)

  // We only check for potential duplicates based on content to batch the query
  const { data: existing } = await supabase
    .from('important_items')
    .select('content, assignee, date')
    .in('content', contents)

  const existingSet = new Set(
    existing?.map(e => `${e.content}|${e.assignee}|${e.date}`) || []
  )

  const payload = todos
    .filter(todo => {
      const key = `${todo.content}|${todo.assignee}|${todo.dueDate}`
      return !existingSet.has(key)
    })
    .map(todo => ({
      date: todo.dueDate,
      content: todo.content,
      assignee: todo.assignee,
      completed: false
    }))

  if (payload.length === 0) {
    console.log('[meeting-records] 所有代辦事項已存在，略過新增')
    return
  }

  const { error } = await supabase.from('important_items').insert(payload)
  if (error) {
    console.error('同步會議代辦事項失敗:', error)
    return error
  } else {
    clearImportantItemsCache()
    console.log(`已同步 ${payload.length} 筆會議代辦至重要事項`)
    return null
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseClient()
    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q')
    const tag = searchParams.get('tag')

    // Base query - only non-archived by default
    let query = supabase
      .from('meeting_records')
      .select('*')
      .eq('archived', false)
      .order('created_at', { ascending: false })

    // Simple keyword search on content
    if (q) {
      query = query.or(`content.ilike.%${q}%`) as any
    }

    // Filter by tag (assuming tags is a text[] column)
    if (tag) {
      // Use Postgres array containment operator
      query = (query as any).contains('tags', [tag])
    }

    const { data, error } = await query

    if (error) {
      console.error('獲取會議記錄失敗:', error)
      return NextResponse.json({ error: '獲取會議記錄失敗' }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('獲取會議記錄失敗:', error)
    return NextResponse.json({ error: '獲取會議記錄失敗' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseClient()
    const body = await request.json()
    const { meeting_date, content, tags } = body

    if (!meeting_date || !content) {
      return NextResponse.json(
        { error: '會議日期和內容為必填項' },
        { status: 400 }
      )
    }

    const payload: any = {
      meeting_date,
      content,
      created_at: new Date().toISOString(),
      completed: false,
      archived: false,
    }

    if (Array.isArray(tags)) payload.tags = tags

    let computedSummary: string | null = null
    if (typeof body.summary === 'string' && body.summary.trim()) {
      computedSummary = body.summary.trim()
    } else {
      computedSummary = extractSummaryFromContent(content)
      if (!computedSummary) {
        computedSummary = await generateThreeBulletSummary(content)
      }
      if (!computedSummary) {
        computedSummary = generateFallbackSummary(content)
      }
    }
    if (computedSummary) payload.summary = computedSummary

    // Explicitly handle action_items if provided by the client (Python skill)
    // This allows us to bypass the regex parser if we already have high-quality structured data
    let providedActionItems: any[] | null = null
    if (Array.isArray(body.action_items)) {
      providedActionItems = body.action_items
    }

    const { data, error } = await supabase
      .from('meeting_records')
      .insert([payload])
      .select()

    if (error) {
      console.error('新增會議記錄失敗:', error)
      return NextResponse.json({
        error: '新增會議記錄失敗',
        details: typeof error === 'object' ? JSON.stringify(error) : String(error)
      }, { status: 500 })
    }

    const createdRecord = data[0]
    let syncError = null

    if (createdRecord) {
      let todos: any[] = []
      if (providedActionItems) {
        todos = providedActionItems.map((item: any) => ({
          content: item.content,
          assignee: item.assignee,
          dueDate: item.dueDate
        }))
      } else {
        todos = extractTodosFromContent(content, meeting_date)
      }

      if (todos.length) {
        const err = await syncTodosToImportantItems(supabase, todos)
        if (err) syncError = err
      }
    }

    return NextResponse.json({ ...createdRecord, syncError })
  } catch (error) {
    console.error('新增會議記錄失敗:', error)
    return NextResponse.json({
      error: '新增會議記錄失敗',
      details: typeof error === 'object' && error !== null ? (error as any).message || JSON.stringify(error) : String(error)
    }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = getSupabaseClient()
    const body = await request.json()

    const { id, meeting_date, content, tags, completed, archived } = body

    if (!id) {
      return NextResponse.json({ error: 'ID 為必填項' }, { status: 400 })
    }

    const updatePayload: any = { updated_at: new Date().toISOString() }
    if (meeting_date) updatePayload.meeting_date = meeting_date
    if (typeof content !== 'undefined') updatePayload.content = content
    if (Array.isArray(tags)) updatePayload.tags = tags
    if (typeof completed === 'boolean') {
      updatePayload.completed = completed
      updatePayload.completed_at = completed ? new Date().toISOString() : null
    }
    if (typeof archived === 'boolean') updatePayload.archived = archived

    // 如果 content 有更新且 client 沒有提供 summary，嘗試自動產生新的三點式摘要
    if (typeof content !== 'undefined' && typeof body.summary !== 'string') {
      const contentString = String(content)
      let newSummary = extractSummaryFromContent(contentString)
      if (!newSummary) {
        newSummary = await generateThreeBulletSummary(contentString)
      }
      if (!newSummary) {
        newSummary = generateFallbackSummary(contentString)
      }
      if (newSummary) updatePayload.summary = newSummary
    }

    // 若 client 提供 summary，則以 client 為準
    if (typeof body.summary === 'string') {
      const trimmed = body.summary.trim()
      if (trimmed) {
        updatePayload.summary = trimmed
      }
    }

    const { data, error } = await supabase
      .from('meeting_records')
      .update(updatePayload)
      .eq('id', id)
      .select()

    if (error) {
      console.error('更新會議記錄失敗:', error)
      return NextResponse.json({ error: '更新會議記錄失敗' }, { status: 500 })
    }

    if (data && data[0] && typeof content !== 'undefined') {
      const updatedRecord = data[0]
      const todos = extractTodosFromContent(updatedRecord.content, updatedRecord.meeting_date)
      if (todos.length) {
        await syncTodosToImportantItems(supabase, todos)
      }
    }

    return NextResponse.json(data[0])
  } catch (error) {
    console.error('更新會議記錄失敗:', error)
    return NextResponse.json({ error: '更新會議記錄失敗' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = getSupabaseClient()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID 為必填項' }, { status: 400 })
    }

    const { error } = await supabase
      .from('meeting_records')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('刪除會議記錄失敗:', error)
      return NextResponse.json({ error: '刪除會議記錄失敗' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('刪除會議記錄失敗:', error)
    return NextResponse.json({ error: '刪除會議記錄失敗' }, { status: 500 })
  }
}
