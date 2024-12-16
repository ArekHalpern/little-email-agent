import { NextResponse } from 'next/server'
import { getGmailClient } from '@/lib/db/actions'
import { createClient } from '@/lib/auth/supabase/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const gmail = await getGmailClient(user.id);

    // Get full email content
    const email = await gmail.users.messages.get({
      userId: 'me',
      id,
      format: 'full'
    });

    // Get full thread if it exists
    let thread = null;
    if (email.data.threadId) {
      thread = await gmail.users.threads.get({
        userId: 'me',
        id: email.data.threadId,
        format: 'full'
      });
    }

    return NextResponse.json({ email: email.data, thread: thread?.data });
  } catch (error) {
    console.error('Error fetching message:', error);
    return NextResponse.json(
      { error: 'Failed to fetch email' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const gmail = await getGmailClient(user.id);

    await gmail.users.messages.trash({
      userId: 'me',
      id
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting message:', error);
    return NextResponse.json(
      { error: 'Failed to delete email' },
      { status: 500 }
    );
  }
} 