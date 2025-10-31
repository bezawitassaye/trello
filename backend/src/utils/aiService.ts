const MODEL = "gemini-2.5-flash";
const API_URL = `https://generativelanguage.googleapis.com/v1/models/${MODEL}:generateContent`;
const API_KEY = process.env.GOOGLE_API_KEY;

interface GeminiResponse {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
}

export async function summarizeText(text: string): Promise<string> {
  if (!API_KEY) throw new Error("GOOGLE_API_KEY is missing in .env");

  try {
    const response = await fetch(`${API_URL}?key=${API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `Summarize this task in 1–2 clear sentences:\n\n${text}`
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.5,
          maxOutputTokens: 300
        }
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Gemini API error: ${err}`);
    }

    const data = (await response.json()) as GeminiResponse;
    return (
      data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
      "No summary generated."
    );
  } catch (err) {
    console.error("AI summarization failed:", err);
    return "No summary available.";
  }
}

export async function generateTasksFromAI(promptText: string): Promise<string[]> {
  try {
    const response = await fetch(`${API_URL}?key=${API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: `Generate a clear bullet list of project tasks:\n${promptText}` }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.6,
          maxOutputTokens: 500
        }
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Gemini API error: ${err}`);
    }

    const data = (await response.json()) as GeminiResponse;
    const textOutput =
      data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    // Split output into task list
    return textOutput
      .split(/\n|•|-|\*/g)
      .map(line => line.trim())
      .filter(line => line.length > 0);
  } catch (err) {
    console.error("AI task generation failed:", err);
    return [];
  }
}
