"use server";

import { NextRequest } from 'next/server';
import { subscribePipelineEvents } from '@/lib/events/pipeline-events';

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();
  let cleanup: (() => void) | null = null;

  const stream = new ReadableStream({
    start(controller) {
      const unsubscribe = subscribePipelineEvents(null, (event) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        } catch {
          cleanup?.();
        }
      });
      controller.enqueue(encoder.encode(': connected\n\n'));

      const abortHandler = () => cleanup?.();

      cleanup = () => {
        if (!cleanup) {
          return;
        }
        cleanup = null;
        unsubscribe();
        request.signal.removeEventListener('abort', abortHandler);
        try {
          controller.close();
        } catch {
          // ignore
        }
      };

      request.signal.addEventListener('abort', abortHandler);
    },
    cancel() {
      cleanup?.();
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
