import { NextResponse } from "next/server";
import { createClient } from "@/lib/auth/supabase/server";
import { google } from "googleapis";
import { prisma } from "@/lib/db/prisma";

export async function POST(req: Request) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { to, subject, content, type, threadId } = await req.json();

    // Get customer's Google tokens
    const customer = await prisma.customer.findUnique({
      where: { auth_user_id: user.id },
    });

    if (!customer?.google_access_token) {
      return new NextResponse("Gmail not connected", { status: 401 });
    }

    // Create OAuth2 client and set credentials
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ 
      access_token: customer.google_access_token,
      refresh_token: customer.google_refresh_token || undefined
    });

    // Create Gmail client with auth
    const gmail = google.gmail({ version: "v1", auth: oauth2Client });

    // Construct email
    const messageParts = [
      `From: ${user.email}`,
      ...(to ? [`To: ${to}`] : []),
      "Content-Type: text/html; charset=utf-8",
      "MIME-Version: 1.0",
      ...(subject ? [`Subject: =?utf-8?B?${Buffer.from(subject).toString("base64")}?=`] : []),
      "",
      content,
    ];
    const message = messageParts.join("\n");

    // The body needs to be base64url encoded
    const encodedMessage = Buffer.from(message)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    let response;
    if (type === "reply" && threadId) {
      response = await gmail.users.messages.send({
        userId: "me",
        requestBody: {
          raw: encodedMessage,
          threadId,
        },
      });
    } else {
      response = await gmail.users.messages.send({
        userId: "me",
        requestBody: {
          raw: encodedMessage,
        },
      });
    }

    return NextResponse.json({ messageId: response.data.id });
  } catch (error) {
    console.error("Send email error:", error);
    return new NextResponse("Internal error", { status: 500 });
  }
} 