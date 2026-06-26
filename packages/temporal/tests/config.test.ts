import { describe, expect, test } from "vitest";

import {
  getTemporalClientConnectionOptions,
  getTemporalNamespace,
  getTemporalWorkerConnectionOptions,
} from "../src/config";

describe("Temporal connection config", () => {
  test("defaults to local Temporal when cloud env is absent", () => {
    const env = {};

    expect(getTemporalClientConnectionOptions(env)).toEqual({
      address: "localhost:7233",
      apiKey: undefined,
      tls: undefined,
    });
    expect(getTemporalWorkerConnectionOptions(env)).toEqual({
      address: "localhost:7233",
      apiKey: undefined,
      tls: undefined,
    });
    expect(getTemporalNamespace(env)).toBe("default");
  });

  test("enables api key auth and tls for Temporal Cloud", () => {
    const env = {
      TEMPORAL_ADDRESS: "test.mguog.tmprl.cloud:7233",
      TEMPORAL_NAMESPACE: "test.mguog",
      TEMPORAL_API_KEY: "secret-key",
    };

    expect(getTemporalClientConnectionOptions(env)).toEqual({
      address: "test.mguog.tmprl.cloud:7233",
      apiKey: "secret-key",
      tls: true,
    });
    expect(getTemporalWorkerConnectionOptions(env)).toEqual({
      address: "test.mguog.tmprl.cloud:7233",
      apiKey: "secret-key",
      tls: true,
    });
    expect(getTemporalNamespace(env)).toBe("test.mguog");
  });
});
