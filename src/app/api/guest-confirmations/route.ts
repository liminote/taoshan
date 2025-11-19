import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      customer_name,
      adult_count,
      child_count,
      dining_type,
      dining_purpose,
      alcohol_allowed,
      notes,
      guests
    } = body

    // 1. Insert into guest_confirmations
    const { data: confirmation, error: confirmationError } = await supabase
      .from('guest_confirmations')
      .insert({
        customer_name,
        adult_count,
        child_count,
        dining_type,
        dining_purpose,
        alcohol_allowed,
        notes
      })
      .select()
      .single()

    if (confirmationError) {
      console.error('Error creating confirmation:', confirmationError)
      return NextResponse.json({ error: confirmationError.message }, { status: 500 })
    }

    // 2. Insert into guest_details
    if (guests && guests.length > 0) {
      const guestDetails = guests.map((guest: any, index: number) => ({
        confirmation_id: confirmation.id,
        guest_index: index + 1,
        requirements: guest.requirements || [],
        other_requirement: guest.other_requirement || ''
      }))

      const { error: detailsError } = await supabase
        .from('guest_details')
        .insert(guestDetails)

      if (detailsError) {
        console.error('Error creating guest details:', detailsError)
        // Note: Ideally we should rollback here, but Supabase client doesn't support transactions easily without RPC.
        // For now we return error but the main record exists.
        return NextResponse.json({ error: detailsError.message }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true, data: confirmation })

  } catch (error) {
    console.error('Server error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('guest_confirmations')
      .select(`
        *,
        guest_details (*)
      `)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })

  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
