"use server"

import { prisma } from '@/lib/db/prisma'
import { createCustomer } from '@/lib/db/actions'
import { createClient } from '@/lib/auth/supabase/server'
import { randomUUID } from 'crypto'
import { syncEmails } from '@/lib/cache/syncEmails'

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
  
  return prisma.emailPrompt.findFirst({
    where: {
      id: promptId,
      customerId: customer.id
    }
  })
}

export async function createEmailPrompt(userId: string, data: EmailPromptInput) {
  const customer = await ensureCustomer(userId)

  return prisma.emailPrompt.create({
    data: {
      id: randomUUID(),
      ...data,
      customerId: customer.id,
      updatedAt: new Date(),
    }
  })
}

export async function getCustomerPrompts(userId: string) {
  const customer = await ensureCustomer(userId)

  return prisma.emailPrompt.findMany({
    where: {
      customerId: customer.id
    },
    orderBy: {
      createdAt: 'desc'
    }
  })
}

export async function syncUserEmails() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (user) {
    await syncEmails(user.id)
    return { success: true }
  }
  
  return { success: false, error: 'No user found' }
}
