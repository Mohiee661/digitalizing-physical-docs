const HF_API_URL =
  "https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/all-MiniLM-L6-v2"

/**
 * Generates a 384-dim embedding via the HuggingFace Inference API (free).
 * Uses the same all-MiniLM-L6-v2 model as before — no local model download needed.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.HUGGINGFACE_API_KEY
  if (!apiKey) {
    throw new Error("HUGGINGFACE_API_KEY is not set")
  }

  const response = await fetch(HF_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ inputs: text }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`HuggingFace Inference API error: ${response.status} — ${err}`)
  }

  const result = await response.json()

  // The API returns [[...floats]] for a single string input
  return Array.isArray(result[0]) ? result[0] : result
}
