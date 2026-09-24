require("dotenv").config();

const express = require("express");
const { getPhilosopherList, getPhilosopher } = require("./philosophers");

const app = express();
const PORT = process.env.PORT || 3000;
// Default model — override with GEMINI_MODEL env var.
const MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";
const API_KEY = process.env.GEMINI_API_KEY;

app.use(express.json());
app.use(express.static("public"));

app.get("/api/philosophers", (req, res) => {
  res.json(getPhilosopherList());
});

app.post("/api/chat", async (req, res) => {
  const { philosopherId, messages } = req.body;

  const philosopher = getPhilosopher(philosopherId);
  if (!philosopher) {
    return res.status(400).json({ error: "Unknown philosopher id" });
  }
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "messages must be a non-empty array" });
  }
  if (!API_KEY || API_KEY === "your-key-here") {
    return res.status(500).end("[Error: GEMINI_API_KEY is not set. Add your key to .env and restart the server.]");
  }

  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("X-Accel-Buffering", "no");

  // Gemini uses "model" instead of "assistant" for the assistant role,
  // and wraps text in a "parts" array rather than plain string content.
  const contents = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:streamGenerateContent?alt=sse&key=${API_KEY}`;

  try {
    const geminiRes = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents,
        systemInstruction: { parts: [{ text: philosopher.systemPrompt }] },
        generationConfig: { maxOutputTokens: 1024 },
      }),
    });

    if (!geminiRes.ok || !geminiRes.body) {
      const errText = await geminiRes.text();
      res.status(geminiRes.status || 500);
      res.end(`[Error: ${errText || geminiRes.statusText}]`);
      return;
    }

    const reader = geminiRes.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split("\n");
      buffer = lines.pop(); // keep any incomplete trailing line for next chunk

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const jsonStr = line.slice(6).trim();
        if (!jsonStr) continue;
        try {
          const parsed = JSON.parse(jsonStr);
          const text = parsed?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) res.write(text);
        } catch {
          // ignore malformed/partial SSE chunks
        }
      }
    }

    res.end();
  } catch (err) {
    console.error("Gemini API error:", err);
    if (!res.headersSent) {
      res.status(500);
    }
    res.end(`\n\n[Error: ${err.message || "something went wrong talking to Gemini"}]`);
  }
});

app.listen(PORT, () => {
  console.log(`Philosopher chat running at http://localhost:${PORT}`);
  console.log(`Using model: ${MODEL}`);
});
