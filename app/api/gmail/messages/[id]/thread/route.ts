import { createClient } from "@/lib/auth/supabase/server";
import { google } from "googleapis";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import type { NextRequest } from "next/server";

type RouteParams = {
  params: {
    id: string;
  };
};

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  const supabase = createClient();

  try {
    // Get auth user first
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Then get the message ID from params
    const messageId = params.id;

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
      format: "full",
    });

    if (!message.data.threadId) {
      return NextResponse.json({ thread: [message.data] });
    }

    const thread = await gmail.users.threads.get({
      userId: "me",
      id: message.data.threadId,
      format: "full",
      metadataHeaders: ["From", "Subject", "Date"],
    });

    const sortedMessages = (thread.data.messages || [message.data])
      .sort((a, b) => {
        const dateA = parseInt(a.internalDate || "0");
        const dateB = parseInt(b.internalDate || "0");
        return dateB - dateA;
      });

    return NextResponse.json({ 
      thread: sortedMessages
    });
  } catch (error) {
    console.error("Error fetching thread:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
} 