import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@/lib/auth/supabase/server";
import { prisma } from "@/lib/db/prisma";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { summary, actionItems, keyDates } = await request.json();

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's email from customer record
    const customer = await prisma.customer.findUnique({
      where: { auth_user_id: user.id },
      select: { email: true }
    });

    if (!customer?.email) {
      return NextResponse.json({ error: "User email not found" }, { status: 400 });
    }

    const prompt = `You are replying as ${customer.email}. Generate a professional email reply based on the following summary and details:

Summary: ${summary.summary}

${actionItems?.length ? `Action Items:
${actionItems.map((item: string) => `- ${item}`).join("\n")}` : ""}

${keyDates?.length ? `Key Dates:
${keyDates.map((date: { date: string; description: string }) => 
  `- ${date.date}: ${date.description}`
).join("\n")}` : ""}

Please generate a concise, professional reply that:
1. Acknowledges the key points
2. Addresses action items if any
3. Confirms important dates if any
4. Maintains a professional but friendly tone
5. Ends with a clear next step or call to action

Format the response as email content with paragraphs using <p> tags, but do not include <html>, <body>, or other document-level tags. 
Use appropriate line breaks and spacing.
Sign off with a professional closing that matches the tone of the email.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "system",
          content: "You are an AI assistant that helps write professional email replies. Format responses with simple HTML paragraph tags (<p>) for structure, but avoid any document-level HTML tags.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
    });

    let reply = completion.choices[0]?.message?.content;

    if (!reply) {
      throw new Error("No reply generated");
    }

    // Clean up any potential full HTML document tags
    reply = reply
      .replace(/<\/?html>/g, '')
      .replace(/<\/?body>/g, '')
      .replace(/<\/?head>/g, '')
      .replace(/<!DOCTYPE.*?>/g, '')
      .trim();

    return NextResponse.json({ reply });
  } catch (error) {
    console.error("Error generating reply:", error);
    return NextResponse.json(
      { error: "Failed to generate reply" },
      { status: 500 }
    );
  }
} 