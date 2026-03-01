import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Use service role key to bypass RLS for uploads from the server
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function POST(request: Request) {
    try {
        const formData = await request.formData()
        const files = formData.getAll('file') as File[]

        if (!files || files.length === 0) {
            return NextResponse.json({ error: 'No files received' }, { status: 400 })
        }

        const uploadResults = []

        for (const file of files) {
            if (!file.name.endsWith('.csv')) {
                uploadResults.push({ name: file.name, success: false, error: 'Only CSV files are allowed' })
                continue
            }

            const buffer = await file.arrayBuffer()

            const { data, error } = await supabase.storage
                .from('reward_cards_csv')
                .upload(file.name, buffer, {
                    contentType: 'text/csv',
                    upsert: true // Overwrite if the file already exists
                })

            if (error) {
                console.error(`Error uploading ${file.name}:`, error)
                uploadResults.push({ name: file.name, success: false, error: error.message })
            } else {
                uploadResults.push({ name: file.name, success: true, path: data.path })
            }
        }

        const allSuccess = uploadResults.every(r => r.success)

        if (!allSuccess) {
            return NextResponse.json({
                success: false,
                message: 'Some files failed to upload',
                results: uploadResults
            }, { status: 400 })
        }

        return NextResponse.json({
            success: true,
            message: 'All files uploaded successfully',
            results: uploadResults
        })

    } catch (error) {
        console.error('Upload Error:', error)
        return NextResponse.json({ error: 'Internal server error during upload' }, { status: 500 })
    }
}
