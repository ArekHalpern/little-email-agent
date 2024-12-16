import { createClient } from "@/lib/auth/supabase/server";
import { google } from "googleapis";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const messageId = params.id;

  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const customer = await prisma.customer.findUnique({
      where: { auth_user_id: user.id },
    });

    if (!customer?.google_access_token) {
      return new NextResponse("No Google access token", { status: 401 });
    }

    const auth = new google.auth.OAuth2();
    auth.setCredentials({
      access_token: customer.google_access_token,
      refresh_token: customer.google_refresh_token,
    });

    const gmail = google.gmail({ version: "v1", auth });
    
    const message = await gmail.users.messages.get({
      userId: "me",
      id: messageId,
    });

    if (!message.data.threadId) {
      return NextResponse.json({ thread: [message.data] });
    }

    const thread = await gmail.users.threads.get({
      userId: "me",
      id: message.data.threadId,
    });

    return NextResponse.json({ 
      thread: (thread.data.messages || [message.data]).reverse()
    });
  } catch (error) {
    console.error("Error fetching thread:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
} 