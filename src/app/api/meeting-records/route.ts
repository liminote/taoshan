import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

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
    const prompt = `請將以下會議內容摘要成三點重點（每點一短句），條列顯示，重點包含決議/負責人/期限（如有）：\n\n${content}`

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

    // 若有 OpenAI API key，嘗試自動產生三點式摘要（混合模式：可被 client 提供的 summary 覆寫）
    const autoSummary = await generateThreeBulletSummary(content)
    if (autoSummary) payload.summary = autoSummary
    if (typeof body.summary === 'string') payload.summary = body.summary

    const { data, error } = await supabase
      .from('meeting_records')
      .insert([payload])
      .select()

    if (error) {
      console.error('新增會議記錄失敗:', error)
      return NextResponse.json({ error: '新增會議記錄失敗' }, { status: 500 })
    }

    return NextResponse.json(data[0])
  } catch (error) {
    console.error('新增會議記錄失敗:', error)
    return NextResponse.json({ error: '新增會議記錄失敗' }, { status: 500 })
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
      const newSummary = await generateThreeBulletSummary(String(content))
      if (newSummary) updatePayload.summary = newSummary
    }

    // 若 client 提供 summary，則以 client 為準
    if (typeof body.summary === 'string') updatePayload.summary = body.summary

    const { data, error } = await supabase
      .from('meeting_records')
      .update(updatePayload)
      .eq('id', id)
      .select()

    if (error) {
      console.error('更新會議記錄失敗:', error)
      return NextResponse.json({ error: '更新會議記錄失敗' }, { status: 500 })
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
