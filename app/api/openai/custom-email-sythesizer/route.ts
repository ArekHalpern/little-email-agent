import { NextResponse } from "next/server";
import OpenAI from "openai";
import { Email } from "@/app/dashboard/types";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Add this helper function to truncate content
function truncateContent(content: string, maxLength: number = 100000): string {
  if (content.length <= maxLength) return content;
  return content.slice(0, maxLength) + "... [truncated]";
}

export async function POST(req: Request) {
  try {
    const { emailContent, threadContext } = await req.json();

    // Format and truncate the thread context
    const threadSummary = threadContext
      .map((email: Email) => {
        const from = email.from;
        const date = new Date(parseInt(email.internalDate || "0")).toLocaleString();
        const content = getEmailBody(email);
        return `From: ${from}\nDate: ${date}\nContent: ${truncateContent(content)}\n---\n`;
      })
      .join("\n");

    // Truncate the current email content
    const currentEmailContent = truncateContent(getEmailBody(emailContent));

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

Thread Context:
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
  "key_dates": [{"date": "date string", "description": "what's happening"}]
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
    return NextResponse.json({ result });
  } catch (error) {
    console.error("Error analyzing email:", error);
    return new NextResponse("Error analyzing email", { status: 500 });
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
