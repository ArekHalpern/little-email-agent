import { createClient } from "@/lib/auth/supabase/server";
import { prisma } from "@/lib/db/prisma";
import OpenAI from "openai";
import { NextResponse } from "next/server";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();
    
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Get the customer ID from the database
    const customer = await prisma.customer.findUnique({
      where: { auth_user_id: user.id },
    });

    if (!customer) {
      return new NextResponse("Customer not found", { status: 404 });
    }

    // Check cache first
    const cachedCompletion = await prisma.autocompleteCache.findFirst({
      where: {
        prompt,
        customerId: customer.id,
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (cachedCompletion) {
      return NextResponse.json({ completion: cachedCompletion.completion });
    }

    // If not in cache, get from OpenAI
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are an autocomplete assistant. Return a JSON object with a 'completion' field containing your suggestion."
        },
        {
          role: "user",
          content: "Instructions: Continue this text with 1-2 sentences. Return only a JSON object.\n\nText: " + prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
      max_tokens: 100,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error("No completion received");
    
    try {
      const completion = JSON.parse(content);
      
      // Validate the response has the expected format
      if (typeof completion.completion !== 'string') {
        throw new Error("Invalid completion format");
      }

      // Cache the result
      await prisma.autocompleteCache.create({
        data: {
          prompt,
          completion: completion.completion,
          customerId: customer.id,
        },
      });

      return NextResponse.json({ completion: completion.completion });
    } catch (error) {
      console.error("JSON parsing error:", error, "Content:", content);
      return new NextResponse("Invalid response format", { status: 500 });
    }
  } catch (error) {
    console.error("Autocomplete error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
