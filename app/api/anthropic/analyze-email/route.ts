import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { Email } from "@/app/dashboard/types";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

// Add interface for Anthropic API error
interface AnthropicError {
  status?: number;
  error?: {
    type: string;
    message: string;
  };
}

export async function POST(req: Request) {
  try {
    const { emailContent, threadContext } = await req.json();

    // Format the thread context without truncation
    const threadSummary = threadContext
      .map((email: Email) => {
        const from = email.from;
        const date = new Date(parseInt(email.internalDate || "0")).toLocaleString();
        const content = getEmailBody(email);
        return `From: ${from}\nDate: ${date}\nContent: ${content}\n---\n`;
      })
      .join("\n");

    // Use full email content
    const currentEmailContent = getEmailBody(emailContent);

    try {
      const response = await anthropic.messages.create({
        model: "claude-3-opus-20240229",
        max_tokens: 1000,
        temperature: 0.7,
        system: "You are an email analyzer. You must respond with valid JSON only, no additional text. Do not include any explanations or text outside of the JSON object.",
        messages: [
          {
            role: "user",
            content: `Analyze this email thread and return a JSON object with the following structure exactly, with no additional text or explanations:
{
  "summary": "Brief summary of the current email and its context in the thread",
  "main_points": ["Key point 1", "Key point 2"],
  "action_items": ["Action 1", "Action 2"],
  "sentiment": "positive/neutral/negative",
  "key_dates": [{"date": "date string", "description": "what's happening"}]
}

Thread Context:
${threadSummary}

Current Email:
From: ${emailContent.from}
Date: ${new Date(parseInt(emailContent.internalDate || "0")).toLocaleString()}
Content: ${currentEmailContent}

Important: Respond with only the JSON object, no other text or explanations.`
          }
        ]
      });

      const content = response.content[0].type === 'text' 
        ? response.content[0].text 
        : '';
        
      if (!content) {
        throw new Error("No valid text content in response");
      }

      try {
        const result = JSON.parse(content);
        return NextResponse.json({ result });
      } catch (error) {
        console.error("JSON parsing error:", error, "Content:", content);
        throw new Error("Failed to parse Anthropic response as JSON");
      }
    } catch (error: unknown) {
      // Type guard for Anthropic errors
      if (typeof error === 'object' && error !== null && 'status' in error) {
        const anthropicError = error as AnthropicError;
        if (anthropicError.status === 429) {
          console.error("Rate limit exceeded:", error);
          return new NextResponse("Rate limit exceeded. Please try again later.", { status: 429 });
        }
      }
      throw error;
    }
  } catch (error) {
    console.error("Error analyzing email with Anthropic:", error);
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