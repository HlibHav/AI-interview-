import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function GET(request: NextRequest) {
  try {
    // Test OpenAI connection with a simple completion
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content: "Say 'OpenAI SDK is working correctly!' and nothing else." }
      ],
      max_tokens: 50,
      temperature: 0.7,
    });

    const response = completion.choices[0].message.content;

    return NextResponse.json({
      success: true,
      message: "OpenAI SDK is working!",
      openaiResponse: response,
      model: "gpt-4",
      usage: completion.usage
    });

  } catch (error: any) {
    console.error('OpenAI test error:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message,
      details: "Make sure you have set OPENAI_API_KEY in your .env.local file"
    }, { status: 500 });
  }
}
