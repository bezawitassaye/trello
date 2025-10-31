const MODEL = "text-bison-001"; // supported model
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateText`;
const API_KEY = process.env.GOOGLE_API_KEY;

interface GeminiResponse {
  candidates?: {
    output?: string;
  }[];
}

/**
 * Summarize a task description into 1–2 clear sentences.
 */
export async function summarizeText(text: string): Promise<string> {
  if (!API_KEY) throw new Error("GOOGLE_API_KEY is missing in .env");

  const prompt = `Summarize this task in 1–2 clear sentences:\n\n${text}`;

  try {
    const response = await fetch(API_URL + `?key=${API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt,
        temperature: 0.5,
        maxOutputTokens: 300,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Gemini API error: ${err}`);
    }

    const data = (await response.json()) as GeminiResponse;
    return data.candidates?.[0]?.output?.trim() || "No summary generated.";
  } catch (err) {
    console.error("AI summarization failed:", err);
    return "No summary available.";
  }
}

/**
 * Generate a list of task titles from a prompt.
 */
export async function generateTasksFromAI(prompt: string): Promise<string[]> {
  if (!API_KEY) throw new Error("GOOGLE_API_KEY is missing in .env");

  try {
    const response = await fetch(API_URL + `?key=${API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt,
        temperature: 0.7,
        maxOutputTokens: 500,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Gemini API error: ${err}`);
    }

    const data = (await response.json()) as GeminiResponse;
    const text = data.candidates?.[0]?.output?.trim() || "";

    // Split by line into task titles
    return text
      .split("\n")
      .map(line => line.trim())
      .filter(line => line.length > 0);
  } catch (err) {
    console.error("AI task generation failed:", err);
    return [];
  }
}
