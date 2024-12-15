import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { createClient as createServerClient } from '@/lib/auth/supabase/server';

type EmbeddingArray = number[];

async function findSimilarEmails(embedding: EmbeddingArray, customerId: string, limit = 3) {
  // Using Prisma to find similar emails
  // Note: This is a basic implementation. For production, 
  // consider using a vector database like Pinecone or Supabase's vector capabilities
  const similarEmails = await prisma.emailEmbedding.findMany({
    where: { customerId },
    select: { content: true },
    take: limit,
  });
  
  return similarEmails.map(email => email.content);
}

export async function POST(req: Request) {
  try {
    const supabaseServer = createServerClient();
    const { data: { session } } = await supabaseServer.auth.getSession();
    if (!session?.user) throw new Error('Not authenticated');
    
    const customerId = session.user.id;
    const { emailId, message } = await req.json();

    // Retrieve the email embedding
    const emailEmbedding = await prisma.emailEmbedding.findUnique({
      where: { emailId },
    });

    if (!emailEmbedding) {
      throw new Error('Email embedding not found');
    }

    // Extract the embedding and content, cast the embedding to number[]
    const { embedding: rawEmbedding, content: emailContent } = emailEmbedding;
    const embedding = rawEmbedding as EmbeddingArray;

    // Find similar emails using the embedding
    const similarEmails = await findSimilarEmails(embedding, customerId);

    // Enhanced system prompt with similar emails context
    const systemPrompt = `
      You are an AI assistant helping the user with questions about the following email:

      "${emailContent}"

      Additional context from similar emails:
      ${similarEmails.map((content, i) => `\nRelated Email ${i + 1}:\n${content}`).join('\n')}

      When responding, reference the email content and provide clear, concise answers.
      If relevant, you may reference information from the related emails as additional context.
    `;

    // Fetch previous chat messages
    const previousMessages = await prisma.chatMessage.findMany({
      where: { emailId, customerId },
      orderBy: { createdAt: 'asc' },
    });

    // Map messages to OpenAI format
    const chatHistory = previousMessages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    // Prepare the messages array for OpenAI
    const messages = [
      { role: 'system', content: systemPrompt },
      ...chatHistory,
      { role: 'user', content: message },
    ];

    // Call the OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4', // Or another suitable model
        messages,
        temperature: 0.7, // Adjust as needed
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to get AI response');
    }

    const aiResponse = await response.json();

    // Store AI response
    const assistantMessage = aiResponse.choices[0].message.content;

    await prisma.chatMessage.create({
      data: {
        emailId,
        content: assistantMessage,
        role: 'assistant',
        customerId,
      },
    });

    return NextResponse.json({ content: assistantMessage });
  } catch (error) {
    console.error('Chat error:', error);
    return NextResponse.json({ error: 'Failed to process chat' }, { status: 500 });
  }
} 