// src/utils/aiService.ts
// import { GoogleAuth } from "google-auth-library";

const MODEL = "models/gemini-1.5-flash";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/${MODEL}:generateContent`;
const API_KEY = process.env.GOOGLE_API_KEY;

interface GeminiResponse {
  candidates?: {
    content?: {
      parts?: { text?: string }[];
    };
  }[];
}

export async function summarizeText(text: string): Promise<string> {
  if (!API_KEY) {
    throw new Error("GOOGLE_API_KEY is missing in .env");
  }

  const prompt = `Summarize this task in 1–2 clear sentences:\n\n${text}`;

  const response = await fetch(API_URL + `?key=${API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          parts: [{ text: prompt }],
        },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini API error: ${err}`);
  }

  // 👇 tell TypeScript what the response structure looks like
  const data = (await response.json()) as GeminiResponse;

  return (
    data.candidates?.[0]?.content?.parts?.[0]?.text ||
    "No summary generated."
  );
}
