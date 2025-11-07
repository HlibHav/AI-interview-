import { EventEmitter } from 'events';

export type PipelineEvent =
  | {
      type:
        | 'pipeline:queued'
        | 'pipeline:started'
        | 'pipeline:summary:completed'
        | 'pipeline:psychometrics:completed'
        | 'pipeline:batch-summary:completed'
        | 'pipeline:failed'
        | 'pipeline:finished'
        | 'pipeline:session:updated';
      sessionId: string;
      payload?: Record<string, any>;
      timestamp: string;
    };

declare global {
  // eslint-disable-next-line no-var
  var __pipelineEventEmitter: EventEmitter | undefined;
}

const emitter =
  globalThis.__pipelineEventEmitter ??
  (globalThis.__pipelineEventEmitter = new EventEmitter());

emitter.setMaxListeners(0);

export function emitPipelineEvent(event: PipelineEvent) {
  emitter.emit('event', event);
}

export function subscribePipelineEvents(
  sessionId: string | null,
  listener: (event: PipelineEvent) => void
) {
  const handler = (event: PipelineEvent) => {
    if (!sessionId || event.sessionId === sessionId) {
      listener(event);
    }
  };
  emitter.on('event', handler);
  return () => {
    emitter.off('event', handler);
  };
}

