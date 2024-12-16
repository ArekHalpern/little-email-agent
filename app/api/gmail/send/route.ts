import { NextResponse } from "next/server";
import { createClient } from "@/lib/auth/supabase/server";
import { google } from "googleapis";
import { prisma } from "@/lib/db/prisma";

export async function POST(req: Request) {
  try {
    const { to, subject, content, type, threadId } = await req.json();
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const customer = await prisma.customer.findUnique({
      where: { auth_user_id: user.id },
    });

    if (!customer?.google_access_token) {
      return new NextResponse("Gmail not connected", { status: 401 });
    }

    const auth = new google.auth.OAuth2();
    auth.setCredentials({
      access_token: customer.google_access_token,
      refresh_token: customer.google_refresh_token,
    });

    const gmail = google.gmail({ version: "v1", auth });

    // Get the original message first
    let recipient = to;
    let originalMessageId = threadId;
    let originalThreadId = threadId;

    if (type === "reply" && threadId) {
      try {
        const originalMessage = await gmail.users.messages.get({
          userId: "me",
          id: threadId,
          format: "metadata",
          metadataHeaders: ["From", "To", "Subject", "Message-ID", "References", "In-Reply-To"],
        });

        // Get the actual thread ID from the message
        originalThreadId = originalMessage.data.threadId || threadId;
        originalMessageId = originalMessage.data.id;

        const fromHeader = originalMessage.data.payload?.headers?.find(
          h => h.name?.toLowerCase() === "from"
        );
        recipient = fromHeader?.value || to;

        // Extract email from "Name <email@domain.com>" format if needed
        if (recipient?.includes("<")) {
          recipient = recipient.match(/<(.+)>/)?.[1] || recipient;
        }
      } catch (error) {
        console.error("Error fetching original message:", error);
        return new NextResponse("Original message not found", { status: 404 });
      }
    }

    if (!recipient) {
      return new NextResponse("Recipient address required", { status: 400 });
    }

    // Construct email headers
    const headers = [
      `From: ${user.email}`,
      `To: ${recipient}`,
      "Content-Type: text/html; charset=utf-8",
      "MIME-Version: 1.0",
    ];

    // Add subject for new emails or default "Re: [original subject]" for replies
    if (type === "reply") {
      const originalMessage = await gmail.users.messages.get({
        userId: "me",
        id: originalMessageId,
        format: "metadata",
        metadataHeaders: ["Subject"],
      });

      const subjectHeader = originalMessage.data.payload?.headers?.find(
        h => h.name?.toLowerCase() === "subject"
      );
      const originalSubject = subjectHeader?.value || "";
      const replySubject = originalSubject.startsWith("Re:") 
        ? originalSubject 
        : `Re: ${originalSubject}`;
      headers.push(`Subject: ${replySubject}`);
    } else if (subject) {
      headers.push(`Subject: =?utf-8?B?${Buffer.from(subject).toString("base64")}?=`);
    }

    // Add message content
    headers.push("", content);

    // Create the raw email
    const message = headers.join("\n");
    const encodedMessage = Buffer.from(message)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    // Send the email
    const response = await gmail.users.messages.send({
      userId: "me",
      requestBody: {
        raw: encodedMessage,
        ...(originalThreadId ? { threadId: originalThreadId } : {}),
      },
    });

    return NextResponse.json({ 
      messageId: response.data.id,
      threadId: response.data.threadId,
    });
  } catch (error: any) {
    console.error("Send email error:", error);
    const status = error?.code || 500;
    const message = error?.message || "Internal error";
    return new NextResponse(message, { status });
  }
} 