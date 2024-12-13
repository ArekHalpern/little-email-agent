import { createClient } from '@/lib/auth/supabase/server'
import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { getCustomerPrompt, createEmailPrompt } from '@/app/dashboard/actions'

interface EmailPrompt {
  id: string
  name: string
  description: string | null
  prompt: string
  customerId: string
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export async function POST(request: Request) {
  try {
    console.log('Starting email synthesis');
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { emailContent, promptId } = await request.json()
    console.log('Received request:', { emailContent, promptId });

    const prompt = await getCustomerPrompt(session.user.id, promptId) as EmailPrompt | null
    if (!prompt) {
      return NextResponse.json({ error: 'Prompt not found' }, { status: 404 })
    }

    // Process with OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: prompt.prompt
        },
        {
          role: "user",
          content: emailContent
        }
      ],
      temperature: 0.7,
    })

    const result = completion.choices[0].message.content
    console.log('Generated result:', result);

    return NextResponse.json({
      result: result
    })

  } catch (error) {
    console.error('Email synthesis error:', error)
    return NextResponse.json(
      { error: 'Failed to synthesize email' },
      { status: 500 }
    )
  }
}

// Create new prompt
export async function PUT(request: Request) {
  try {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    
    try {
      const newPrompt = await createEmailPrompt(session.user.id, {
        name: body.name,
        description: body.description,
        prompt: body.prompt
      })
      return NextResponse.json(newPrompt)
    } catch (createError) {
      console.error('Failed to create prompt:', createError)
      return NextResponse.json({ error: 'Failed to create prompt' }, { status: 404 })
    }

  } catch (error) {
    console.error('Create prompt error:', error)
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    )
  }
}
