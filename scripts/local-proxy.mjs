import http from "node:http";
import httpProxy from "http-proxy";

const proxy = httpProxy.createProxyServer({
  ws: true,
  changeOrigin: true,
});

const WEB_TARGET = "http://127.0.0.1:3000";
const SUPABASE_TARGET = "http://127.0.0.1:55321";
const MAILPIT_TARGET = "http://127.0.0.1:55324";
const PORT = 3100;

const supabasePrefixes = [
  "/auth/v1",
  "/rest/v1",
  "/graphql/v1",
  "/storage/v1",
  "/functions/v1",
  "/realtime/v1",
  "/pg",
  "/mcp",
];

function getTarget(url = "/") {
  if (url.startsWith("/mailpit")) {
    return MAILPIT_TARGET;
  }

  if (supabasePrefixes.some((prefix) => url.startsWith(prefix))) {
    return SUPABASE_TARGET;
  }

  return WEB_TARGET;
}

const server = http.createServer((req, res) => {
  const target = getTarget(req.url);
  if (req.url?.startsWith("/mailpit")) {
    req.url = req.url.replace(/^\/mailpit/, "") || "/";
  }

  proxy.web(req, res, { target });
});

server.on("upgrade", (req, socket, head) => {
  proxy.ws(req, socket, head, { target: getTarget(req.url) });
});

proxy.on("error", (error, _req, res) => {
  if (!res.headersSent) {
    res.writeHead(502, { "Content-Type": "text/plain" });
  }

  res.end(`Proxy error: ${error.message}`);
});

server.listen(PORT, () => {
  console.log(`Local reverse proxy listening on http://127.0.0.1:${PORT}`);
});
