import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export const runtime = 'nodejs';

function extractAudioBase64(response: any): string | null {
  const output = Array.isArray(response?.output) ? response.output : [];

  for (const item of output) {
    const contents = Array.isArray(item?.content) ? item.content : [];
    for (const content of contents) {
      if (content?.type === 'audio' && content?.audio?.data) {
        return content.audio.data;
      }
    }
  }
  return null;
}

export async function POST(request: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OPENAI_API_KEY is not configured.' },
        { status: 500 }
      );
    }

    const { text, voice = 'alloy', format = 'mp3' } = await request.json();
    const prompt = typeof text === 'string' ? text.trim() : '';

    if (!prompt) {
      return NextResponse.json(
        { error: 'Text is required to generate audio.' },
        { status: 400 }
      );
    }

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // OpenAI TTS API завжди повертає mp3 для gpt-4o-mini-tts
    // Параметр format не підтримується в новій версії SDK
    const speech = await client.audio.speech.create({
      model: 'gpt-4o-mini-tts',
      voice: typeof voice === 'string' && voice.trim().length > 0 ? voice : 'alloy',
      input: prompt
    });

    const arrayBuffer = await speech.arrayBuffer();
    const audioBuffer = Buffer.from(arrayBuffer);
    const audioBase64 = audioBuffer.toString('base64');

    return NextResponse.json({
      audio: audioBase64,
      voice,
      format,
      length: audioBase64.length
    });
  } catch (error) {
    console.error('❌ [OpenAI TTS] Failed to generate audio:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to generate audio from OpenAI.'
      },
      { status: 500 }
    );
  }
}
