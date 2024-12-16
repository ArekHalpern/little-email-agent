import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@/lib/auth/supabase/server";

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

    const prompt = `Generate a professional email reply based on the following summary and details:

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

Reply in HTML format with appropriate paragraphs.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "system",
          content: "You are an AI assistant that helps write professional email replies.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
    });

    const reply = completion.choices[0]?.message?.content;

    if (!reply) {
      throw new Error("No reply generated");
    }

    return NextResponse.json({ reply });
  } catch (error) {
    console.error("Error generating reply:", error);
    return NextResponse.json(
      { error: "Failed to generate reply" },
      { status: 500 }
    );
  }
} 