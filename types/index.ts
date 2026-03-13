export type Project = {
  id: string
  name: string
  description: string | null
  created_by: string
  created_at: string
  updated_at: string
  record_count?: number
}

export type Record = {
  id: string
  project_id: string
  title: string | null
  file_path: string | null
  format: string | null
  input_type: 'csv' | 'image' | 'typed_pdf' | 'free_text'
  record_type: string | null
  ocr_text: string | null
  ai_summary: string | null
  ai_classification: string | null
  key_fields: { [key: string]: string } | null
  language: string
  confidence: number | null
  error_flag: boolean
  error_message: string | null
  is_verified: boolean
  access_level: string
  uploaded_by: string
  date_digitized: string
  updated_at: string
}

export type ChatMessage = {
  id: string
  project_id: string
  user_id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

export type InputType = 'csv' | 'image' | 'typed_pdf' | 'free_text'
export type RecordType = 'legal' | 'medical' | 'financial' | 'personal' | 'public' | 'identity'
export type ExportFormat = 'csv' | 'json' | 'pdf'
export type ToastType = 'success' | 'error' | 'info' | 'warning'
