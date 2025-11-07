"use server";

import { NextRequest } from 'next/server';
import { subscribePipelineEvents } from '@/lib/events/pipeline-events';

export async function GET(_request: NextRequest) {
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      const unsubscribe = subscribePipelineEvents(null, (event) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      });
      controller.enqueue(encoder.encode(': connected\n\n'));

      const close = () => {
        unsubscribe();
        try {
          controller.close();
        } catch {
          // ignore
        }
      };

      return close;
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    }
  });
}
