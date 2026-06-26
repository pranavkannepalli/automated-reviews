import type { ConnectionOptions } from "@temporalio/client";
import type { NativeConnectionOptions } from "@temporalio/worker";

type TemporalEnv = NodeJS.ProcessEnv;

function getAddress(env: TemporalEnv) {
  return env.TEMPORAL_ADDRESS ?? "localhost:7233";
}

function getApiKey(env: TemporalEnv) {
  const value = env.TEMPORAL_API_KEY?.trim();
  return value ? value : undefined;
}

function getTlsEnabled(apiKey: string | undefined) {
  return apiKey ? true : undefined;
}

export function getTemporalNamespace(env: TemporalEnv = process.env) {
  return env.TEMPORAL_NAMESPACE || "default";
}

export function getTemporalClientConnectionOptions(env: TemporalEnv = process.env): ConnectionOptions {
  const apiKey = getApiKey(env);

  return {
    address: getAddress(env),
    apiKey,
    tls: getTlsEnabled(apiKey),
  };
}

export function getTemporalWorkerConnectionOptions(env: TemporalEnv = process.env): NativeConnectionOptions {
  const apiKey = getApiKey(env);

  return {
    address: getAddress(env),
    apiKey,
    tls: getTlsEnabled(apiKey),
  };
}
