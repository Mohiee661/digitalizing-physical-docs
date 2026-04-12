export type Project = {
  id: string
  created_at: string
  name: string
  description: string | null
  user_id: string
  type: string | null
}

export type DocRecord = {
  id: string
  project_id: string
  created_at: string
  title: string | null
  raw_content: string | null
  content: string | null
  input_type: string
  record_type: string | null
  summary: string | null
  metadata: { [key: string]: unknown } | null
  confidence: number | null
  status: string | null
  is_verified: boolean
  file_path: string | null
  uploaded_by: string
}

export type RecordChunk = {
  id: string
  record_id: string
  project_id: string
  content: string
  embedding: number[]
  chunk_index: number
  source_page: number | null
  source_position: number | null
  created_at: string
}

export type ChatMessage = {
  id: string
  project_id: string
  user_id: string
  role: "user" | "assistant"
  content: string
  agent_steps: unknown | null
  created_at: string
}

export type InputType = "pdf" | "image" | "csv" | "text"
export type RecordType = "legal" | "medical" | "financial" | "personal" | "public" | "identity"
export type ExportFormat = "csv" | "json" | "pdf"
export type ToastType = "success" | "error" | "info" | "warning"
