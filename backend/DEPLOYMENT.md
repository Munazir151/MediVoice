# FastAPI Cloud Deployment Guide

Complete guide to deploy MediVoice backend to FastAPI Cloud.

## Prerequisites

1. **FastAPI Cloud account**
   - Sign up at https://fastapi.tiangolo.com/deployment/
   - Or use `fastapi-cli` to create account

2. **Git repository** (GitHub, GitLab, or similar)
   - Push your code to remote repository first

3. **Environment variables ready**
   - Cloud Qdrant instance URL and API key
   - VAPI API credentials
   - Google Gemini API key
   - Frontend URL for CORS configuration

## Step 1: Install FastAPI Cloud CLI

```bash
pip install fastapi-cli
```

## Step 2: Login to FastAPI Cloud

```bash
fastapi login
```

This will open a browser window for authentication. Enter your credentials.

## Step 3: Create Project in FastAPI Cloud

From your project root (`medivoice1/`):

```bash
fastapi new --deploy
```

This will:
- Create a `.fastapi` directory with deployment config
- Set up CI/CD integration if using GitHub

Alternatively, link existing project:

```bash
fastapi link
```

## Step 4: Deploy Backend

From backend directory:

```bash
cd backend
fastapi deploy
```

## Step 5: Configure Environment Variables

After deployment starts, set environment variables in FastAPI Cloud dashboard:

1. Go to **Settings > Environment Variables**
2. Add the following variables:

```
FASTAPI_ENV=production
APP_NAME=MediVoice API

# Qdrant (Cloud instance)
QDRANT_URL=https://your-qdrant-cloud-instance.qdrant.io
QDRANT_API_KEY=your-qdrant-api-key
QDRANT_COLLECTION_NAME=medivoice_symptoms
QDRANT_VECTOR_SIZE=64

# Qdrant Schemes Collection
QDRANT_SCHEME_COLLECTION_NAME=medivoice_schemes

# VAPI (Voice API)
VAPI_API_KEY=your-vapi-api-key
VAPI_BASE_URL=https://api.vapi.ai

# AI/LLM
GEMINI_API_KEY=your-gemini-api-key
LLM_MODEL=gemini-2.5-flash
LLM_ENABLED=true

# CORS (set to your frontend URL)
CORS_ORIGINS=https://your-frontend-domain.com,https://www.your-frontend-domain.com
```

## Step 6: Verify Deployment

After environment variables are set, your backend will automatically restart.

Test the deployment:

```bash
curl https://your-project.fastapi.dev/health
```

Expected response:
```json
{"status": "ok"}
```

## Step 7: Update Frontend API URL

After deployment, update your frontend to point to cloud backend:

In `frontend/.env.local` (create if needed):

```
NEXT_PUBLIC_BACKEND_URL=https://your-project.fastapi.dev
```

Or in code:

```typescript
// frontend/src/lib/triage-backend.ts
const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
```

## Environment Variables Explained

| Variable | Purpose | Example |
|----------|---------|---------|
| `QDRANT_URL` | Vector database endpoint | `https://xxx.qdrant.io` |
| `QDRANT_API_KEY` | Qdrant authentication | Your API key from Qdrant Cloud |
| `VAPI_API_KEY` | Voice transcription service | From VAPI.ai dashboard |
| `GEMINI_API_KEY` | AI model for triage analysis | From Google Cloud Console |
| `CORS_ORIGINS` | Allowed frontend domains | Frontend URL after deployment |

## Troubleshooting

### Build fails
- Check `requirements.txt` includes all dependencies
- Ensure Python 3.13 is compatible with all packages
- Check the build logs in FastAPI Cloud dashboard

### API returns 502 Bad Gateway
- Wait 2-3 minutes for deployment to fully initialize
- Check environment variables are set
- Verify Qdrant cloud instance is accessible
- Check logs in FastAPI Cloud dashboard

### Environment variables not loading
- Restart deployment after setting variables
- Verify variable names match exactly (case-sensitive)
- Check values don't have leading/trailing spaces

### Qdrant connection fails
- Verify cloud Qdrant instance is running
- Confirm API key is correct
- Check network policy allows FastAPI Cloud IP range

## Useful Commands

```bash
# View deployment status
fastapi status

# View logs
fastapi logs

# Redeploy
fastapi deploy

# View environment variables
fastapi env list

# Set environment variable from CLI
fastapi env set QDRANT_URL https://your-instance.qdrant.io
```

## Next Steps

1. **Seed Qdrant collections** (if not already done)
   ```bash
   # From backend directory, with cloud Qdrant credentials
   python scripts/index_qdrant.py --recreate
   python scripts/index_qdrant_schemes.py --recreate
   ```

2. **Monitor performance**
   - Check logs and metrics in FastAPI Cloud dashboard
   - Monitor response times and error rates

3. **Enable CI/CD** (if using GitHub)
   - Auto-deploy on git push
   - Run tests before deployment

## Production Checklist

- [ ] All environment variables configured
- [ ] CORS origins match frontend domain
- [ ] Qdrant collections seeded with data
- [ ] Frontend API URL points to cloud backend
- [ ] Health endpoint returns 200
- [ ] Test voice transcription end-to-end
- [ ] Monitor logs for errors
- [ ] Set up alerting for failures

## Support

- FastAPI docs: https://fastapi.tiangolo.com/
- Qdrant Cloud docs: https://qdrant.tech/documentation/
- VAPI docs: https://docs.vapi.ai/
