import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  app.post("/api/ai/analyze", async (req, res) => {
    try {
      const { query, bundle, provider = 'gemini' } = req.body;

      const systemInstruction = "You are an expert Minecraft modding assistant. Analyze mod relationships, dependencies, and provenance data. Always return strict JSON containing 'summary' (string), 'compatibility_notes' (array of strings), and 'recommendations' (array of strings).";

      const prompt = `Given the following query: "${query}", analyze the provided Minecraft mod dependency graph context.
      Provide a short compatibility and security analysis, and suggest what the user should know based on these entities.

      Context Bundle:
      ${JSON.stringify(bundle, null, 2)}`;

      if (provider === 'gemini') {
        if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI API key is not configured. Please add GEMINI_API_KEY to your environment variables.");
        const ai = new GoogleGenAI({
          apiKey: process.env.GEMINI_API_KEY,
          httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
        });

        const response = await ai.models.generateContent({
          model: "gemini-3.6-flash",
          contents: prompt,
          config: {
            systemInstruction,
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                summary: { type: Type.STRING },
                compatibility_notes: { type: Type.ARRAY, items: { type: Type.STRING } },
                recommendations: { type: Type.ARRAY, items: { type: Type.STRING } }
              },
              required: ["summary", "compatibility_notes", "recommendations"]
            }
          }
        });
        return res.json(JSON.parse(response.text || "{}"));
      }

      if (provider === 'openai') {
        if (!process.env.OPENAI_API_KEY) throw new Error("OpenAI API key is not configured. Please add OPENAI_API_KEY to your environment variables.");
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

        const response = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: systemInstruction },
            { role: "user", content: prompt }
          ]
        });
        return res.json(JSON.parse(response.choices[0].message?.content || "{}"));
      }

      if (provider === 'anthropic') {
        if (!process.env.ANTHROPIC_API_KEY) throw new Error("Anthropic API key is not configured. Please add ANTHROPIC_API_KEY to your environment variables.");
        const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

        const response = await anthropic.messages.create({
          model: "claude-3-5-sonnet-20241022",
          max_tokens: 1024,
          system: systemInstruction,
          messages: [
            { role: "user", content: prompt + "\n\nRespond ONLY with a valid JSON object matching the requested schema." }
          ]
        });
        const content = response.content[0];
        if (content.type === 'text') {
            return res.json(JSON.parse(content.text));
        }
        return res.json({});
      }

      if (provider === 'xai') {
        if (!process.env.XAI_API_KEY) throw new Error("xAI API key is not configured. Please add XAI_API_KEY to your environment variables.");
        const openai = new OpenAI({
          apiKey: process.env.XAI_API_KEY,
          baseURL: "https://api.x.ai/v1"
        });

        const response = await openai.chat.completions.create({
          model: "grok-2-latest",
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: systemInstruction },
            { role: "user", content: prompt }
          ]
        });
        return res.json(JSON.parse(response.choices[0].message?.content || "{}"));
      }

      if (provider === 'ollama') {
        const ollamaBaseUrl = process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434/v1";
        const openai = new OpenAI({
          apiKey: "ollama", // Required but ignored by ollama
          baseURL: ollamaBaseUrl
        });

        const response = await openai.chat.completions.create({
          model: "llama3", // Assuming llama3 as a default
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: systemInstruction },
            { role: "user", content: prompt }
          ]
        });
        return res.json(JSON.parse(response.choices[0].message?.content || "{}"));
      }

      throw new Error(`Unknown provider: ${provider}`);

    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: error.message || "Failed to generate AI response." });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
