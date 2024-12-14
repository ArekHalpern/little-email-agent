import { createClient } from '@/lib/auth/supabase/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { z } from 'zod'

const EmailSummarySchema = z.object({
  main_points: z.array(z.string()),
  action_items: z.array(z.string()),
  key_dates: z.array(z.object({
    date: z.string(),
    description: z.string()
  })),
  sentiment: z.enum(['positive', 'neutral', 'negative']),
  summary: z.string(),
  participants: z.array(z.string()),
  important_links: z.array(z.string()).optional(),
  attachments_summary: z.array(z.string()).optional()
})

export async function GET(request: Request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const emailId = searchParams.get('emailId')

    if (!emailId) {
      const summaries = await prisma.emailSummary.findMany({
        where: {
          customer: {
            auth_user_id: user.id
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      })
      return NextResponse.json(summaries)
    }

    const summary = await prisma.emailSummary.findFirst({
      where: {
        emailId,
        customer: {
          auth_user_id: user.id
        }
      }
    })

    return NextResponse.json(summary)
  } catch (error) {
    console.error('Email summary error:', error instanceof Error ? error.message : 'Unknown error')
    return NextResponse.json({ error: 'Failed to fetch summary' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const body = await request.json()
    const { emailId, summary } = body

    if (!emailId) {
      return NextResponse.json({ error: 'Email ID is required' }, { status: 400 })
    }

    if (!summary) {
      return NextResponse.json({ error: 'Summary is required' }, { status: 400 })
    }

    // Validate and parse the summary data
    try {
      const parsedSummary = EmailSummarySchema.parse(summary)

      const customer = await prisma.customer.findUnique({
        where: { auth_user_id: user.id }
      })

      if (!customer) {
        return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
      }

      // Upsert the summary
      const result = await prisma.emailSummary.upsert({
        where: {
          emailId_customerId: {
            emailId: emailId,
            customerId: customer.id
          }
        },
        update: {
          summary: parsedSummary,
          customerId: customer.id
        },
        create: {
          emailId,
          customerId: customer.id,
          summary: parsedSummary
        }
      })

      return NextResponse.json(result)
    } catch (validationError) {
      console.error('Summary validation error:', validationError instanceof Error ? validationError.message : 'Validation failed')
      if (validationError instanceof z.ZodError) {
        return NextResponse.json(
          { 
            error: 'Invalid summary format', 
            details: validationError.errors 
          },
          { status: 400 }
        )
      }
      return NextResponse.json(
        { error: 'Failed to validate summary' },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('Email summary error:', error instanceof Error ? error.message : 'Unknown error')
    return NextResponse.json({ error: 'Failed to save summary' }, { status: 500 })
  }
} 