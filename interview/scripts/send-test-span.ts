import {
  getTracerProvider,
  register as registerNodeInstrumentation,
} from '../instrumentation.node';

import {
  diag,
  DiagConsoleLogger,
  DiagLogLevel,
  trace,
} from '@opentelemetry/api';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.INFO);

async function main() {
  registerNodeInstrumentation();

  diag.info('Waiting for OpenTelemetry SDK to start');
  await sleep(500);

  const tracer = trace.getTracer('phoenix-smoke-test');
  const span = tracer.startSpan('phoenix.smoke-test', {
    attributes: {
      'smoke.test': true,
      'smoke.test.component': 'send-test-span.ts',
    },
  });

  diag.info('Started smoke test span');
  span.addEvent('phoenix.smoke-test.start');
  await sleep(250);
  span.addEvent('phoenix.smoke-test.end');
  span.end();
  diag.info('Ended smoke test span, waiting for exporter flush');

  await sleep(1000);
  await getTracerProvider()?.forceFlush();
  diag.info('Forced tracer provider flush');
  await sleep(4000);
  diag.info('Smoke test span should be exported');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    diag.error('Smoke test span failed', error as Error);
    process.exit(1);
  });
