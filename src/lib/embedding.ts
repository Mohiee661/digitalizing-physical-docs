import { pipeline } from "@xenova/transformers"

let _extractor: Awaited<ReturnType<typeof pipeline>> | null = null

async function getExtractor() {
  if (!_extractor) {
    _extractor = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2")
  }
  return _extractor
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const extractor = await getExtractor()
  const output = await extractor(text, { pooling: "mean", normalize: true })
  return Array.from(output.data as Float32Array)
}
