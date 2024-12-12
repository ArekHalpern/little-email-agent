"use server"

import { prisma } from '@/lib/db/prisma'
import { createCustomer } from '@/lib/db/actions'
import { createClient } from '@/lib/auth/supabase/server'

async function ensureCustomer(userId: string) {
  const customer = await prisma.customer.findUnique({
    where: { auth_user_id: userId }
  })

  if (!customer) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) throw new Error('Not authenticated')

    return createCustomer({
      authUserId: user.id,
      email: user.email!,
      name: user.user_metadata?.full_name
    })
  }

  return customer
}

export type EmailPromptPayload = {
  id: string
  name: string
  description: string | null
  prompt: string
  customerId: string
  createdAt: Date
  updatedAt: Date
}

interface EmailPromptInput {
  name: string
  description: string | null
  prompt: string
}

export async function getCustomerPrompt(userId: string, promptId: string) {
  const customer = await ensureCustomer(userId)
  
  return prisma.emailprompt.findFirst({
    where: {
      id: promptId,
      customerId: customer.id
    }
  })
}

export async function createEmailPrompt(userId: string, data: EmailPromptInput) {
  const customer = await ensureCustomer(userId)

  return prisma.emailprompt.create({
    data: {
      ...data,
      customerId: customer.id
    }
  })
}

export async function getCustomerPrompts(userId: string) {
  const customer = await ensureCustomer(userId)

  return prisma.emailprompt.findMany({
    where: {
      customerId: customer.id
    },
    orderBy: {
      createdAt: 'desc'
    }
  })
}
