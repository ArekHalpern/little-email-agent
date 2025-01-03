import { NextResponse } from "next/server";
import OpenAI from "openai";
import { Email } from "@/app/dashboard/types";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface OpenAIError {
  code?: string;
  message: string;
  type?: string;
  param?: string;
  status?: number;
}

export async function POST(req: Request) {
  try {
    const { emailContent, threadContext } = await req.json();

    // Take only the 5 most recent emails from the thread
    const recentEmails = threadContext.slice(0, 5);

    // Get participants from email headers
    const participants = new Set<string>();
    recentEmails.forEach((email: Email) => {
      if (email.from) participants.add(email.from);
    });
    if (emailContent.from) participants.add(emailContent.from);

    // Format thread context
    const threadSummary = recentEmails
      .map((email: Email) => {
        const from = email.from;
        const date = new Date(parseInt(email.internalDate || "0")).toLocaleString();
        const content = getEmailBody(email);
        return `From: ${from}\nDate: ${date}\nContent: ${content}\n---\n`;
      })
      .join("\n");

    const currentEmailContent = getEmailBody(emailContent);

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are an email analyzer. Analyze the email thread and provide a comprehensive summary."
        },
        {
          role: "user",
          content: `Please analyze this email thread and provide a summary, main points, action items, and sentiment analysis.

Thread Context (Last ${recentEmails.length} emails):
${threadSummary}

Current Email:
From: ${emailContent.from}
Date: ${new Date(parseInt(emailContent.internalDate || "0")).toLocaleString()}
Content: ${currentEmailContent}

Please provide the analysis in JSON format with the following structure:
{
  "summary": "Brief summary of the current email and its context in the thread",
  "main_points": ["Key point 1", "Key point 2", ...],
  "action_items": ["Action 1", "Action 2", ...],
  "sentiment": "positive/neutral/negative",
  "key_dates": [{"date": "date string", "description": "what's happening"}],
  "participants": ["participant1@email.com", "participant2@email.com"],
  "important_links": []
}`
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No content received from OpenAI");
    }

    const result = JSON.parse(content);
    
    // Ensure all required fields exist
    const finalResult = {
      ...result,
      participants: result.participants || Array.from(participants),
      important_links: result.important_links || [],
      key_dates: result.key_dates || [],
      main_points: result.main_points || [],
      action_items: result.action_items || [],
    };

    return NextResponse.json({ result: finalResult });
  } catch (error: unknown) {
    if (typeof error === 'object' && error !== null) {
      const openAIError = error as OpenAIError;
      if (openAIError.code === 'context_length_exceeded') {
        return new NextResponse(JSON.stringify({
          error: "context_length_exceeded",
          message: "Email thread too long for initial analysis, switching to advanced model..."
        }), { status: 413 });
      }
    }
    throw error;
  }
}

// Helper function to get email body
function getEmailBody(email: Email): string {
  if (!email) return "";
  const htmlPart = email.payload?.parts?.find(
    (part) => part.mimeType === "text/html"
  );
  const plainPart = email.payload?.parts?.find(
    (part) => part.mimeType === "text/plain"
  );

  const body =
    htmlPart?.body?.data || plainPart?.body?.data || email.payload?.body?.data;

  if (!body) return "";

  const decoded = decodeURIComponent(
    escape(atob(body.replace(/-/g, "+").replace(/_/g, "/")))
  );

  return decoded;
}
