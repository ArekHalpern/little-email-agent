'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/auth/supabase/server'
import { PrismaClient } from '@prisma/client'
import { randomUUID } from 'crypto'

const prisma = new PrismaClient()

export async function login(formData: FormData) {
  const supabase = await createClient()

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const { error } = await supabase.auth.signInWithPassword(data)

  if (error) {
    redirect('/error')
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

export async function signup(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const name = formData.get('name') as string

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  })

  if (authError || !authData.user) {
    console.error('Signup error:', authError)
    redirect('/error')
  }

  try {
    await prisma.customer.create({
      data: {
        id: randomUUID(),
        auth_user_id: authData.user.id,
        email: email,
        name: name,
      },
    })
  } catch (error) {
    console.error('Prisma error:', error)
    await supabase.auth.admin.deleteUser(authData.user.id)
    redirect('/error')
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}