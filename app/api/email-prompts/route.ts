import { createClient } from '@/lib/auth/supabase/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'

export async function GET() {
  try {
    const supabase = createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const customer = await prisma.customer.findUnique({
      where: { auth_user_id: user.id }
    })

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    const prompts = await prisma.emailPrompt.findMany({
      where: { customerId: customer.id }
    })

    return NextResponse.json(prompts)
  } catch (error) {
    console.error('Get prompts error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch prompts' },
      { status: 500 }
    )
  }
} 