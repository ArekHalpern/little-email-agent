import { createClient } from '@/lib/auth/supabase/server'
import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { z } from 'zod'
import { getCustomerPrompt, createEmailPrompt } from '@/app/dashboard/actions'

// Define schema for structured output
const EmailAnalysis = z.object({
  main_points: z.array(z.string()),
  action_items: z.array(z.string()),
  key_dates: z.array(z.object({
    date: z.string(),
    description: z.string()
  })),
  sentiment: z.enum(['positive', 'neutral', 'negative']),
  summary: z.string(),
  participants: z.array(z.string()),
  next_steps: z.array(z.string()),
  important_links: z.array(z.string()).optional(),
  attachments_summary: z.array(z.string()).optional()
})

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

// Add these interfaces at the top with other interfaces
interface EmailPart {
  mimeType: string;
  body?: {
    data?: string;
  };
  parts?: EmailPart[];
}

interface EmailPayload {
  body?: {
    data?: string;
  };
  parts?: EmailPart[];
  headers: Array<{
    name: string;
    value: string;
  }>;
}

interface EmailData {
  id: string;
  threadId?: string;
  payload?: EmailPayload;
  snippet?: string;
  internalDate?: string;
}

export async function POST(request: Request) {
  console.log('Starting email synthesis')
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    console.log('Received request:', body)

    // Decode email body
    const emailContent = decodeEmailBody(body.emailContent)
    if (!emailContent) {
      console.error('Failed to decode email content')
      console.log('Falling back to email snippet')
    }

    // Get the prompt
    try {
      const prompt = await getCustomerPrompt(user.id, body.promptId)
      if (!prompt) {
        return NextResponse.json({ error: 'Prompt not found' }, { status: 404 })
      }

      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: `You are an expert email analyzer. ${prompt.prompt}. Format your response as a JSON object with the following structure:
            {
              "main_points": string[],
              "action_items": string[],
              "key_dates": Array<{ date: string, description: string }>,
              "sentiment": "positive" | "neutral" | "negative",
              "summary": string,
              "participants": string[],
              "next_steps": string[],
              "important_links"?: string[],
              "attachments_summary"?: string[]
            }`
          },
          {
            role: "user",
            content: `Analyze this email:

Subject: ${body.emailContent.subject || 'No Subject'}
From: ${body.emailContent.from || 'Unknown Sender'}

Content:
${emailContent || body.emailContent.snippet}
`
          }
        ]
      })

      const content = completion.choices[0].message.content
      if (!content) {
        throw new Error('No content returned from OpenAI')
      }

      try {
        const result = EmailAnalysis.parse(JSON.parse(content))
        console.log('Generated result:', result)
        return NextResponse.json({ result })
      } catch (parseError) {
        console.error('Failed to parse OpenAI response:', parseError instanceof Error ? parseError.message : 'Parse error')
        return NextResponse.json(
          { error: 'Invalid response format from OpenAI' },
          { status: 500 }
        )
      }
    } catch (promptError) {
      console.error('Failed to get prompt:', promptError instanceof Error ? promptError.message : 'Prompt error')
      return NextResponse.json({ error: 'Failed to get prompt' }, { status: 404 })
    }
  } catch (error) {
    console.error('Email synthesis error:', error instanceof Error ? error.message : 'Unknown error')
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    )
  }
}

function decodeEmailBody(email: EmailData) {
  try {
    // Helper function to decode base64
    const decodeBase64 = (data: string) => {
      try {
        return decodeURIComponent(
          escape(atob(data.replace(/-/g, "+").replace(/_/g, "/")))
        );
      } catch (error) {
        console.error('Error decoding base64:', error);
        return null;
      }
    };

    // Helper function to recursively find content in parts
    const findContent = (parts: EmailPart[] | undefined): string | null => {
      if (!parts) return null;
      
      // First try to find text/plain part
      const plainPart = parts.find(part => part.mimeType === "text/plain");
      if (plainPart?.body?.data) {
        return decodeBase64(plainPart.body.data);
      }

      // Then try to find text/html part
      const htmlPart = parts.find(part => part.mimeType === "text/html");
      if (htmlPart?.body?.data) {
        const decoded = decodeBase64(htmlPart.body.data);
        return decoded?.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() || null;
      }

      // Recursively check nested parts
      for (const part of parts) {
        if (part.parts) {
          const nestedContent = findContent(part.parts);
          if (nestedContent) return nestedContent;
        }
      }

      return null;
    };

    // Try to find content in different places
    const content = 
      // First check main parts
      findContent(email.payload?.parts) ||
      // Then check main body if it exists
      (email.payload?.body?.data && decodeBase64(email.payload.body.data)) ||
      // Finally fall back to snippet
      email.snippet;

    if (!content) {
      console.error('No content found in email');
      return null;
    }

    return content.trim();
  } catch (error) {
    console.error('Error decoding email body:', error);
    return null;
  }
}

// Create new prompt
export async function PUT(request: Request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    
    try {
      const newPrompt = await createEmailPrompt(user.id, {
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
