import { createClient } from "@/lib/auth/supabase/server";
import { google } from "googleapis";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import type { NextRequest } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = createClient();

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.id) {
      return NextResponse.json(
        { error: 'Not authenticated' }, 
        { status: 401 }
      );
    }

    const { id } = await params;

    const customer = await prisma.customer.findUnique({
      where: { auth_user_id: user.id },
    });

    if (!customer?.google_access_token) {
      return NextResponse.json(
        { error: 'No Google access token' },
        { status: 401 }
      );
    }

    const auth = new google.auth.OAuth2();
    auth.setCredentials({
      access_token: customer.google_access_token,
      refresh_token: customer.google_refresh_token,
    });

    const gmail = google.gmail({ version: "v1", auth });
    
    try {
      const message = await gmail.users.messages.get({
        userId: "me",
        id,
        format: "full",
      });

      if (!message.data.threadId) {
        return NextResponse.json({ thread: [message.data] });
      }

      const thread = await gmail.users.threads.get({
        userId: "me",
        id: message.data.threadId,
        format: "full",
        metadataHeaders: ["From", "To", "Subject", "Message-ID", "References", "In-Reply-To"],
      });

      // Create a map to track unique messages
      const uniqueMessages = new Map();
      const seenContent = new Set();

      thread.data.messages?.forEach((msg) => {
        // Get message content hash (using snippet as a simple way to compare content)
        const contentHash = msg.snippet;
        const messageId = msg.id;
        const references = msg.payload?.headers?.find(h => h.name?.toLowerCase() === "references")?.value;
        const inReplyTo = msg.payload?.headers?.find(h => h.name?.toLowerCase() === "in-reply-to")?.value;

        // Skip if we've seen this content before
        if (contentHash && seenContent.has(contentHash)) {
          return;
        }

        // If this is a reply, make sure we keep the latest version
        if (references || inReplyTo) {
          const existingMsg = uniqueMessages.get(messageId);
          if (existingMsg) {
            const existingDate = parseInt(existingMsg.internalDate || "0");
            const newDate = parseInt(msg.internalDate || "0");
            if (newDate > existingDate) {
              uniqueMessages.set(messageId, msg);
            }
          } else {
            uniqueMessages.set(messageId, msg);
          }
        } else {
          uniqueMessages.set(messageId, msg);
        }

        if (contentHash) {
          seenContent.add(contentHash);
        }
      });

      const sortedMessages = Array.from(uniqueMessages.values())
        .sort((a, b) => {
          const dateA = parseInt(a.internalDate || "0");
          const dateB = parseInt(b.internalDate || "0");
          return dateB - dateA;  // Newest first
        });

      return NextResponse.json({ 
        thread: sortedMessages,
        threadId: message.data.threadId 
      });
      
    } catch (gmailError: unknown) {
      console.error('Gmail API error:', gmailError);
      
      // Type guard for the error object
      const isGmailError = (err: unknown): err is { code?: number; message?: string } => {
        return typeof err === 'object' && err !== null;
      };

      return NextResponse.json(
        { 
          error: isGmailError(gmailError) && gmailError.message 
            ? gmailError.message 
            : 'Failed to fetch from Gmail' 
        },
        { 
          status: isGmailError(gmailError) && typeof gmailError.code === 'number' 
            ? gmailError.code 
            : 500 
        }
      );
    }
  } catch (error) {
    console.error("Error fetching thread:", error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 