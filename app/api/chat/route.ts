import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { createClient as createServerClient } from '@/lib/auth/supabase/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Add type for the vector query result
interface VectorQueryResult {
  content: string;
  distance: number;
}

export async function POST(req: Request) {
  try {
    const supabaseServer = createServerClient();
    const { data: { session } } = await supabaseServer.auth.getSession();
    if (!session?.user) throw new Error('Not authenticated');
    
    const customerId = session.user.id;
    const { emailId, message } = await req.json();

    // Store user message
    await prisma.chatMessage.create({
      data: {
        emailId,
        content: message,
        role: 'user',
        customerId,
      },
    });

    // Get relevant context using embeddings
    const { data: embedding } = await supabase.functions.invoke('embed', {
      body: { text: message },
    });

    const relevantContext = await prisma.$queryRaw<VectorQueryResult[]>`
      SELECT content, embedding <-> ${embedding}::vector as distance
      FROM "EmailEmbedding"
      WHERE "customerId" = ${customerId}
      ORDER BY distance
      LIMIT 1
    `;

    if (!relevantContext.length) {
      throw new Error('No relevant context found');
    }

    // Generate AI response using context
    const aiResponse = await supabase.functions.invoke('chat', {
      body: {
        messages: [
          { role: 'system', content: `Context: ${relevantContext[0].content}` },
          { role: 'user', content: message },
        ],
      },
    });

    // Store AI response
    const chatMessage = await prisma.chatMessage.create({
      data: {
        emailId,
        content: aiResponse.data,
        role: 'assistant',
        customerId,
      },
    });

    return NextResponse.json(chatMessage);
  } catch (error) {
    console.error('Chat error:', error);
    return NextResponse.json({ error: 'Failed to process chat' }, { status: 500 });
  }
} 