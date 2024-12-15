import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { createClient as createServerClient } from '@/lib/auth/supabase/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(req: Request) {
  try {
    const supabaseServer = createServerClient();
    const { data: { session } } = await supabaseServer.auth.getSession();
    if (!session?.user) throw new Error('Not authenticated');
    
    const customerId = session.user.id;
    const { emailId, content } = await req.json();

    // Generate embedding using Supabase's vector API
    const { data: embedding, error } = await supabase.functions.invoke('embed', {
      body: { text: content },
    });

    if (error) throw error;

    // Store embedding in database
    const emailEmbedding = await prisma.emailEmbedding.create({
      data: {
        emailId,
        content,
        embedding,
        customerId,
      },
    });

    return NextResponse.json(emailEmbedding);
  } catch (error) {
    console.error('Error generating embedding:', error);
    return NextResponse.json({ error: 'Failed to generate embedding' }, { status: 500 });
  }
} 