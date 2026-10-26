// Local dev server: serves public/ and mounts api/chat.js. Not used on Vercel.
import http from "node:http";
import { readFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));

// tiny .env loader for local runs
const envPath = path.join(root, ".env");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
}

const { default: chatHandler } = await import("./api/chat.js");

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  if (url.pathname === "/api/chat") return chatHandler(req, res);
  const file = url.pathname === "/" ? "/index.html" : url.pathname;
  try {
    const data = await readFile(path.join(root, "public", file));
    res.statusCode = 200;
    res.setHeader("Content-Type", file.endsWith(".html") ? "text/html" : "application/octet-stream");
    res.end(data);
  } catch {
    res.statusCode = 404;
    res.end("not found");
  }
});

const port = process.env.PORT || 3000;
server.listen(port, () => console.log(`HaggleBot local: http://localhost:${port}`));
