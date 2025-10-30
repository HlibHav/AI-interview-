import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { SEMRESATTRS_PROJECT_NAME } from '@arizeai/openinference-semantic-conventions';

function parseHeaders(envValue?: string): Record<string, string> {
  if (!envValue) return {};
  return Object.fromEntries(
    envValue
      .split(',')
      .map((kv) => kv.trim())
      .filter(Boolean)
      .map((kv) => {
        const sep = kv.indexOf('=');
        const key = sep === -1 ? kv : kv.slice(0, sep);
        const value = sep === -1 ? '' : kv.slice(sep + 1);
        return [key.trim(), value.trim()];
      })
  );
}

export const register = () => {
  // Create exporter with secure env-driven config. Do not log secrets.
  const traceExporter = new OTLPTraceExporter({
    url:
      process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT ||
      'http://localhost:4318/v1/traces',
    headers: parseHeaders(process.env.OTEL_EXPORTER_OTLP_HEADERS),
  });

  const resource = new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'ai-interview-assistant',
    [SemanticResourceAttributes.SERVICE_VERSION]: '0.1.0',
    [SEMRESATTRS_PROJECT_NAME]: 'interview',
  });

  const sdk = new NodeSDK({
    resource,
    traceExporter,
    instrumentations: [getNodeAutoInstrumentations()],
  });

  // Start without printing sensitive configuration
  void sdk.start();
};

import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';
import {
  defaultResource,
  resourceFromAttributes,
} from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { SEMRESATTRS_PROJECT_NAME } from '@arizeai/openinference-semantic-conventions';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { UndiciInstrumentation } from '@opentelemetry/instrumentation-undici';
import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express';
import { OpenAIInstrumentation } from '@opentelemetry/instrumentation-openai';

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

// Build headers object from comma-separated env string like "Authorization=Bearer <api>".
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
  if (initialized) {
    return;
  }
  initialized = true;

  diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG);

  const endpoint = ensureTracesEndpoint(
    getSanitizedEnv('OTEL_EXPORTER_OTLP_TRACES_ENDPOINT')
  );
  const headers = parseHeaders(getSanitizedEnv('OTEL_EXPORTER_OTLP_HEADERS'));

  diag.info(
    `OTLP exporter configured for ${
      endpoint ?? 'http://localhost:4318/v1/traces'
    }`
  );
  diag.debug(
    `OTLP exporter headers: ${Object.keys(headers).join(', ') || '(none)'}`
  );

  const traceExporter = new OTLPTraceExporter({
    url:
      endpoint ||
      'http://localhost:4318/v1/traces',
    headers,
  });

  const resource = defaultResource().merge(
    resourceFromAttributes({
      [SemanticResourceAttributes.SERVICE_NAME]: 'ai-interview-assistant',
      [SemanticResourceAttributes.SERVICE_VERSION]: '0.1.0',
      [SEMRESATTRS_PROJECT_NAME]: 'default',
    })
  );
  diag.debug(
    `Resource attributes: ${JSON.stringify(
      resource.attributes ?? {}
    )}`
  );

  provider = new NodeTracerProvider({
    resource,
    spanProcessors: [new BatchSpanProcessor(traceExporter)],
  });
  provider.register();

  registerInstrumentations({
    instrumentations: [
      new HttpInstrumentation({
        ignoreIncomingPaths: [/^\/_next\//],
      }),
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
