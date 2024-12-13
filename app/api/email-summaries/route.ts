import { createClient } from '@/lib/auth/supabase/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'

export async function POST(request: Request) {
  try {
    const supabase = createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { emailId, summary } = await request.json()

    const customer = await prisma.customer.findUnique({
      where: { auth_user_id: user.id }
    })

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    const emailSummary = await prisma.emailSummary.upsert({
      where: { emailId },
      update: { 
        summary,
        updatedAt: new Date()
      },
      create: {
        emailId,
        summary,
        customerId: customer.id
      }
    })

    return NextResponse.json(emailSummary)
  } catch (error) {
    console.error('Email summary error:', error)
    return NextResponse.json(
      { error: 'Failed to save summary' },
      { status: 500 }
    )
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const emailId = searchParams.get('emailId')

    if (!emailId) {
      return NextResponse.json({ error: 'Email ID required' }, { status: 400 })
    }

    const summary = await prisma.emailSummary.findUnique({
      where: { emailId }
    })

    return NextResponse.json(summary)
  } catch (error) {
    console.error('Get summary error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch summary' },
      { status: 500 }
    )
  }
} 