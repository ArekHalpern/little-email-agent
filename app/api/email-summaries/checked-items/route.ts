import { createClient } from '@/lib/auth/supabase/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'

export async function POST(request: Request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const body = await request.json()
    const { emailId, checkedItems } = body

    if (!emailId) {
      return NextResponse.json({ error: 'Email ID is required' }, { status: 400 })
    }

    if (!Array.isArray(checkedItems)) {
      return NextResponse.json({ error: 'Checked items must be an array' }, { status: 400 })
    }

    const customer = await prisma.customer.findUnique({
      where: { auth_user_id: user.id }
    })

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    // Update the checked items
    const result = await prisma.emailSummary.update({
      where: {
        emailId_customerId: {
          emailId,
          customerId: customer.id
        }
      },
      data: {
        checkedActionItems: checkedItems
      }
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Update checked items error:', error instanceof Error ? error.message : 'Unknown error')
    return NextResponse.json({ error: 'Failed to update checked items' }, { status: 500 })
  }
} 