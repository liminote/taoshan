import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

let supabaseClient: ReturnType<typeof createClient> | null = null

function getSupabaseClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const supabaseKey = serviceRoleKey || anonKey

    if (!supabaseUrl || !supabaseKey) {
        throw new Error('Supabase environment variables are not configured')
    }

    if (!supabaseClient) {
        supabaseClient = createClient(supabaseUrl, supabaseKey, {
            auth: { persistSession: false, autoRefreshToken: false }
        })
    }

    return supabaseClient
}

export async function GET(request: NextRequest) {
    try {
        const supabase = getSupabaseClient()
        const { searchParams } = new URL(request.url)
        const q = searchParams.get('q')
        const tag = searchParams.get('tag')

        let query = supabase
            .from('report_analysis')
            .select('*')
            .eq('archived', false)
            .order('created_at', { ascending: false })

        if (q) {
            query = query.or(`content.ilike.%${q}%,title.ilike.%${q}%`) as any
        }

        if (tag) {
            query = (query as any).contains('tags', [tag])
        }

        const { data, error } = await query

        if (error) {
            console.error('獲取報告分析失敗:', error)
            return NextResponse.json({ error: '獲取報告分析失敗' }, { status: 500 })
        }

        return NextResponse.json(data)
    } catch (error) {
        console.error('獲取報告分析失敗:', error)
        return NextResponse.json({ error: '獲取報告分析失敗' }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    try {
        const supabase = getSupabaseClient()
        const body = await request.json()
        const { report_date, title, content, tags } = body

        if (!report_date || !title || !content) {
            return NextResponse.json(
                { error: '報告日期、標題和內容為必填項' },
                { status: 400 }
            )
        }

        const payload: any = {
            report_date,
            title,
            content,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            archived: false,
        }

        if (Array.isArray(tags)) payload.tags = tags

        const { data, error } = await supabase
            .from('report_analysis')
            // @ts-ignore
            .insert([payload as unknown as any])
            .select()

        if (error) {
            console.error('新增報告分析失敗:', error)
            return NextResponse.json({ error: '新增報告分析失敗', details: error }, { status: 500 })
        }

        return NextResponse.json(data[0])
    } catch (error) {
        console.error('新增報告分析失敗:', error)
        return NextResponse.json({ error: '新增報告分析失敗' }, { status: 500 })
    }
}

export async function PUT(request: NextRequest) {
    try {
        const supabase = getSupabaseClient()
        const body = await request.json()

        const { id, report_date, title, content, tags, archived } = body

        if (!id) {
            return NextResponse.json({ error: 'ID 為必填項' }, { status: 400 })
        }

        const updatePayload: { updated_at?: string; report_date?: string; title?: string; content?: string; tags?: string[]; archived?: boolean } = { updated_at: new Date().toISOString() }
        if (report_date) updatePayload.report_date = report_date
        if (title) updatePayload.title = title
        if (typeof content !== 'undefined') updatePayload.content = content
        if (Array.isArray(tags)) updatePayload.tags = tags
        const { data, error } = await supabase
            .from('report_analysis')
            // @ts-ignore
            .update(updatePayload as unknown as any)
            .eq('id', id)
            .select()

        if (error) {
            console.error('更新報告分析失敗:', error)
            return NextResponse.json({ error: '更新報告分析失敗' }, { status: 500 })
        }

        return NextResponse.json(data[0])
    } catch (error) {
        console.error('更新報告分析失敗:', error)
        return NextResponse.json({ error: '更新報告分析失敗' }, { status: 500 })
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
            .from('report_analysis')
            .delete()
            .eq('id', id)

        if (error) {
            console.error('刪除報告分析失敗:', error)
            return NextResponse.json({ error: '刪除報告分析失敗' }, { status: 500 })
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('刪除報告分析失敗:', error)
        return NextResponse.json({ error: '刪除報告分析失敗' }, { status: 500 })
    }
}
