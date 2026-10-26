// HaggleBot chat endpoint (Vercel serverless function; also mounted by server.mjs locally).
// The shopkeeper prompt lives ONLY here, server-side. Participants never see it.
import { SHOPKEEPER_PROMPT } from "./prompt.js";

const MAX_USER_MESSAGES = 12;
const MAX_CONTENT_CHARS = 1000;

function sendJson(res, status, obj) {
  const body = JSON.stringify(obj);
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (c) => {
      data += c;
      if (data.length > 100_000) reject(new Error("body too large"));
    });
    req.on("end", () => {
      try { resolve(JSON.parse(data || "{}")); }
      catch { reject(new Error("bad json")); }
    });
    req.on("error", reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") return sendJson(res, 405, { error: "POST only" });

  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  if (!apiKey) return sendJson(res, 500, { error: "Server is missing its API key. Tell the organizers." });

  let body;
  try { body = await readBody(req); }
  catch { return sendJson(res, 400, { error: "Bad request." }); }

  const messages = Array.isArray(body.messages) ? body.messages : null;
  if (!messages) return sendJson(res, 400, { error: "Missing messages." });

  const clean = [];
  for (const m of messages) {
    if (!m || (m.role !== "user" && m.role !== "assistant") || typeof m.content !== "string")
      return sendJson(res, 400, { error: "Bad message format." });
    clean.push({ role: m.role, content: m.content.slice(0, MAX_CONTENT_CHARS) });
  }
  const userCount = clean.filter((m) => m.role === "user").length;
  if (userCount === 0) return sendJson(res, 400, { error: "No user message yet." });
  if (userCount > MAX_USER_MESSAGES)
    return sendJson(res, 400, { error: "Message limit reached. Your round is over." });

  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 25000);
    const r = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      signal: ctrl.signal,
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [{ role: "system", content: SHOPKEEPER_PROMPT }, ...clean],
        max_tokens: 300,
        temperature: 0.7,
      }),
    });
    clearTimeout(timer);
    if (!r.ok) {
      const t = await r.text();
      console.error("Gemini error", r.status, t.slice(0, 200));
      return sendJson(res, 502, { error: "The shopkeeper is busy. Wait a few seconds and send again - this try does not count extra." });
    }
    const data = await r.json();
    const reply = data?.choices?.[0]?.message?.content?.trim();
    if (!reply) return sendJson(res, 502, { error: "Empty reply. Send your message again." });
    return sendJson(res, 200, { reply });
  } catch (e) {
    console.error("fetch failed", e);
    return sendJson(res, 502, { error: "Connection problem. Send your message again." });
  }
}
