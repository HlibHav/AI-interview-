import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { Resource, defaultResource, resourceFromAttributes } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { SEMRESATTRS_PROJECT_NAME } from '@arizeai/openinference-semantic-conventions';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { UndiciInstrumentation } from '@opentelemetry/instrumentation-undici';
import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express';
import { OpenAIInstrumentation } from '@opentelemetry/instrumentation-openai';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';

function stripWrappingQuotes(value: string): string {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function getSanitizedEnv(key: string): string | undefined {
  const value = process.env[key];
  if (!value) return undefined;
  return stripWrappingQuotes(value);
}

function ensureTracesEndpoint(value?: string): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    const trimmedPath = url.pathname.replace(/\/$/, '');
    if (!trimmedPath.endsWith('/v1/traces')) {
      url.pathname = `${trimmedPath}/v1/traces`;
    }
    return url.toString();
  } catch {
    const trimmedValue = value.replace(/\/$/, '');
    return trimmedValue.endsWith('/v1/traces')
      ? trimmedValue
      : `${trimmedValue}/v1/traces`;
  }
}

function parseHeaders(envValue?: string): Record<string, string> {
  if (!envValue) return {};
  const normalizedValue = stripWrappingQuotes(envValue);
  return Object.fromEntries(
    normalizedValue
      .split(',')
      .map((kv) => kv.trim())
      .filter(Boolean)
      .map((kv) => {
        const candidate = stripWrappingQuotes(kv);
        const sep = candidate.indexOf('=');
        const key = sep === -1 ? candidate : candidate.slice(0, sep);
        const value = sep === -1 ? '' : candidate.slice(sep + 1);
        return [stripWrappingQuotes(key), stripWrappingQuotes(value)];
      })
  );
}

let initialized = false;
let provider: NodeTracerProvider | undefined;

export const register = () => {
  if (initialized) return;
  initialized = true;

  const disableFlag = (process.env.DISABLE_TELEMETRY ??
    process.env.NEXT_DISABLE_TELEMETRY ??
    process.env.DISABLE_OTEL ??
    '').toLowerCase();

  const enableFlag = (process.env.ENABLE_TELEMETRY ??
    process.env.NEXT_ENABLE_TELEMETRY ??
    '').toLowerCase();

  const forcedDisable = ['1', 'true', 'yes', 'on'].includes(disableFlag);
  const forcedEnable = ['1', 'true', 'yes', 'on'].includes(enableFlag);
  const telemetryDisabled = forcedDisable || !forcedEnable;
  if (telemetryDisabled) {
    console.warn('[Telemetry] Disabled via environment flag.');
    return;
  }

  diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG);

  const endpoint = ensureTracesEndpoint(
    getSanitizedEnv('OTEL_EXPORTER_OTLP_TRACES_ENDPOINT')
  );
  const headers = parseHeaders(getSanitizedEnv('OTEL_EXPORTER_OTLP_HEADERS'));

  const traceExporter = new OTLPTraceExporter({
    url: endpoint || 'http://localhost:4318/v1/traces',
    headers,
  });

  const resource = defaultResource().merge(
    resourceFromAttributes({
      [SemanticResourceAttributes.SERVICE_NAME]: 'ai-interview-assistant',
      [SemanticResourceAttributes.SERVICE_VERSION]: '0.1.0',
      [SEMRESATTRS_PROJECT_NAME]: 'interview',
    })
  );

  provider = new NodeTracerProvider({
    resource,
    spanProcessors: [new BatchSpanProcessor(traceExporter)],
  });
  provider.register();

  registerInstrumentations({
    instrumentations: [
      new HttpInstrumentation(),
      new UndiciInstrumentation(),
      new ExpressInstrumentation(),
      new OpenAIInstrumentation(),
    ],
  });

  const shutdown = async () => {
    if (!provider) return;
    await provider.shutdown().catch((error) => {
      diag.error('Error shutting down OpenTelemetry', error as Error);
    });
  };

  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);
  process.once('beforeExit', shutdown);
};

export const getTracerProvider = () => provider;
