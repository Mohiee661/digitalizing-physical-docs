# Deployment Guide

This guide explains how to deploy the Digitalizing Physical Docs application to Vercel and Render.

## Environment Variables

Copy the `env.example` file to `.env.local` for local development:

```bash
cp env.example .env.local
```

Required environment variables:

- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key (server-side only)
- `GROQ_API_KEY` - Your Groq API key for AI processing
- `NEXT_TELEMETRY_DISABLED` - Set to 1 to disable Next.js telemetry

## Vercel Deployment

### Automatic Deployment
1. Connect your GitHub repository to Vercel
2. Import the project
3. Add environment variables in Vercel dashboard
4. Deploy automatically on push to main branch

### Manual Deployment
```bash
npm install -g vercel
npm run deploy:vercel
```

### Vercel Configuration
The `vercel.json` file includes:
- Framework: Next.js
- Function timeout: 30 seconds
- Deployment region: iad1
- Managed environment variables via dashboard

## Render Deployment

### Automatic Deployment
1. Connect your GitHub repository to Render
2. Create a new Web Service
3. Select Node.js environment
4. Add environment variables in Render dashboard
5. Deploy automatically on push to main branch

### Manual Deployment
```bash
npm install -g render
npm run deploy:render
```

### Render Configuration
The `render.yaml` file includes:
- Build command: `npm run build`
- Start command: `npm start`
- Health check path: `/api/health`
- Environment variable placeholders

## Deployment Scripts

The following scripts are available in `package.json`:

- `npm run deploy:vercel` - Deploy to Vercel
- `npm run deploy:render` - Deploy to Render

## Post-Deployment Setup

1. **Supabase**: Ensure your Supabase project is properly configured with the necessary tables and storage buckets
2. **Domain**: Configure custom domains if needed
3. **Monitoring**: Set up error monitoring and logging
4. **SSL**: Both platforms provide automatic SSL certificates

## Troubleshooting

- Build failures: Check that all environment variables are set correctly
- Runtime errors: Verify Supabase connection and API keys
- Performance: Monitor function timeouts and optimize if needed
