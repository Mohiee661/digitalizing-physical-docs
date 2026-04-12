# RecordsVault

RecordsVault is an autonomous document digitization, management, and RAG-powered retrieval platform. It allows users to securely upload, extract, and chat with their physical records seamlessly.

## Features

- **Document Ingestion**: Supports uploading diverse file types including PDFs, Images, and raw text.
- **Automated Text Extraction**: Integrates Tesseract OCR for images and pdf-parse for PDFs securely in backend isolated environments.
- **Automated AI Processing**: Generates document classifications, confidence scores, and summaries automatically upon upload.
- **RAG Chatbot**: Features a fully conversational AI interface to ask natural questions about your documents via contextual chunk similarity matching.
- **Granular Security**: Built natively on top of Next.js strictly utilizing Supabase Row Level Security (RLS) policies and isolated Admin Clients to guarantee project isolation.
- **File Management**: View, filter, verify, and securely download raw user documents directly from isolated Supabase buckets.

## Tech Stack

- Frontend: Next.js 16, React
- Styling: Tailwind CSS
- Database/Auth/Storage: Supabase (PostgreSQL with pg_vector)
- Embeddings: Xenova MiniLM Transformers
- LLM Provider: Groq (Llama 3.1)

## Getting Started

1. **Clone the repository**
   ```bash
   git clone https://github.com/Mohiee661/digitalizing-physical-docs.git
   cd digitalizing-physical-docs
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Environment Variables**
   Create a `.env.local` file with your remote credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   GROQ_API_KEY=your_groq_api_key
   ```

4. **Initialize Database**
   Copy the contents of `supabase_setup.sql` into the Supabase SQL editor and execute them.

5. **Start Dev Server**
   ```bash
   npm run dev
   ```
   Server runs automatically on `http://localhost:3000`.
