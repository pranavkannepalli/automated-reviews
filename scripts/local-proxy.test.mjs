import { describe, expect, test, vi } from "vitest";

import { handleProxyError } from "./local-proxy.mjs";

describe("handleProxyError", () => {
  test("returns a 502 response for regular HTTP proxy failures", () => {
    const writeHead = vi.fn();
    const end = vi.fn();

    handleProxyError(new Error("backend down"), null, {
      headersSent: false,
      writeHead,
      end,
    });

    expect(writeHead).toHaveBeenCalledWith(502, {
      "Content-Type": "text/plain",
    });
    expect(end).toHaveBeenCalledWith("Proxy error: backend down");
  });

  test("writes a websocket error response when the proxy error target is a socket", () => {
    const write = vi.fn();
    const destroy = vi.fn();

    handleProxyError(new Error("socket closed"), null, {
      writable: true,
      write,
      destroy,
    });

    expect(write).toHaveBeenCalledWith(
      "HTTP/1.1 502 Bad Gateway\r\nContent-Type: text/plain\r\n\r\nProxy error: socket closed",
    );
    expect(destroy).toHaveBeenCalled();
  });
});
