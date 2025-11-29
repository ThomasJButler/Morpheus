# Morpheus RAG Chatbot - Deployment Guide

> Complete guide to deploying the Morpheus RAG system to production

## Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Local Development](#local-development)
- [Backend Deployment](#backend-deployment)
  - [Option 1: Railway](#option-1-railway-recommended)
  - [Option 2: Render](#option-2-render)
  - [Option 3: Self-Hosted](#option-3-self-hosted)
- [Frontend Deployment](#frontend-deployment)
- [Database Setup](#database-setup)
- [Environment Variables](#environment-variables)
- [Post-Deployment](#post-deployment)
- [Troubleshooting](#troubleshooting)
- [Monitoring](#monitoring)

---

## Prerequisites

### Required Accounts & API Keys

1. **Anthropic API Key**
   - Sign up at: https://console.anthropic.com/
   - Create API key in Account Settings
   - Pricing: ~$3/1M input tokens, ~$15/1M output tokens (Claude Haiku)

2. **OpenAI API Key**
   - Sign up at: https://platform.openai.com/
   - Create API key in API keys section
   - Pricing: ~$0.02/1M tokens (text-embedding-3-small)

3. **Pinecone API Key**
   - Sign up at: https://app.pinecone.io/
   - Free tier: 100K vectors, 1 index
   - Paid: Starts at $70/month for serverless

4. **Deployment Platforms** (choose one for backend):
   - Railway: https://railway.app/ (Hobby: $5/month)
   - Render: https://render.com/ (Starter: $7/month)
   - Or use your own infrastructure

5. **Vercel Account** (frontend):
   - Sign up at: https://vercel.com/
   - Free tier: Hobby plan (sufficient for most use cases)

### Local Development Tools

```bash
# Backend
- Python 3.11+
- pip or poetry

# Frontend
- Node.js 20+
- npm or yarn

# Optional
- Docker & Docker Compose
- Git
```

---

## Quick Start

### Local Development with Docker Compose (Fastest)

```bash
# 1. Clone repository
git clone https://github.com/ThomasJButler/Morpheus.git
cd Morpheus

# 2. Set up environment files
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local

# 3. Edit backend/.env with your API keys
nano backend/.env  # Add ANTHROPIC_API_KEY, OPENAI_API_KEY, PINECONE_API_KEY

# 4. Create Pinecone index (see Database Setup section)

# 5. Start everything
docker-compose up

# Access:
# - Frontend: http://localhost:3000
# - Backend API: http://localhost:8000
# - API Docs: http://localhost:8000/docs
```

---

## Local Development

### Backend Setup (Manual)

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set up environment
cp .env.example .env
# Edit .env with your API keys

# Run tests
pytest tests/ -v

# Start development server
uvicorn app.main:app --reload --port 8000

# Server runs at http://localhost:8000
# API docs at http://localhost:8000/docs
```

### Frontend Setup (Manual)

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Set up environment
cp .env.example .env.local
# Edit .env.local - set NEXT_PUBLIC_API_URL=http://localhost:8000

# Start development server
npm run dev

# App runs at http://localhost:3000
```

---

## Backend Deployment

### Option 1: Railway (Recommended)

**Pros:** Easy deployment, automatic HTTPS, built-in monitoring
**Cons:** $5/month minimum (Hobby plan)

#### Step-by-Step

```bash
# 1. Install Railway CLI
npm install -g @railway/cli

# 2. Login
railway login

# 3. Navigate to backend directory
cd backend

# 4. Initialize project
railway init

# 5. Link to project (if existing)
railway link

# 6. Set environment variables
railway variables set ANTHROPIC_API_KEY="sk-ant-..."
railway variables set OPENAI_API_KEY="sk-..."
railway variables set PINECONE_API_KEY="..."
railway variables set PINECONE_INDEX_NAME="morpheus"
railway variables set PINECONE_ENVIRONMENT="us-east-1"
railway variables set ANTHROPIC_MODEL="claude-3-haiku-20240307"
railway variables set EMBEDDING_MODEL="text-embedding-3-small"
railway variables set TOP_K_RESULTS="10"
railway variables set MIN_RELEVANCE_SCORE="0.7"
railway variables set DENSE_WEIGHT="0.7"
railway variables set SPARSE_WEIGHT="0.3"
railway variables set USE_RERANKER="true"
railway variables set USE_HYBRID_SEARCH="true"
railway variables set LOG_LEVEL="INFO"
railway variables set DEBUG="false"

# Important: Set CORS to your frontend URL (you'll get this after deploying frontend)
railway variables set CORS_ORIGINS="https://your-app.vercel.app"

# 7. Deploy
railway up

# 8. Get deployment URL
railway status
railway open

# Your backend URL will be something like:
# https://morpheus-backend-production.railway.app
```

#### Railway Dashboard Method

1. Go to https://railway.app/dashboard
2. Click "New Project" → "Deploy from GitHub"
3. Select your repository
4. Choose `backend` as root directory
5. Railway auto-detects Dockerfile
6. Add environment variables in Variables tab
7. Deploy!

---

### Option 2: Render

**Pros:** Simple pricing, automatic deployments from GitHub
**Cons:** Free tier spins down after inactivity

#### Step-by-Step

```bash
# 1. Push code to GitHub
git push origin main

# 2. Go to Render Dashboard
# Visit: https://dashboard.render.com/

# 3. Create New Web Service
# - Click "New +" → "Web Service"
# - Connect your GitHub repository
# - Select repository and branch (main)

# 4. Configure Service
# Name: morpheus-backend
# Region: Oregon (or closest to you)
# Branch: main
# Root Directory: backend
# Environment: Docker
# Dockerfile Path: ./Dockerfile

# 5. Select Plan
# - Free (with spin-down)
# - Starter: $7/month (always on, 512MB RAM)
# - Standard: $25/month (2GB RAM)

# 6. Add Environment Variables
# In Environment tab, add:
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
PINECONE_API_KEY=...
PINECONE_INDEX_NAME=morpheus
PINECONE_ENVIRONMENT=us-east-1
ANTHROPIC_MODEL=claude-3-haiku-20240307
EMBEDDING_MODEL=text-embedding-3-small
TOP_K_RESULTS=10
MIN_RELEVANCE_SCORE=0.7
DENSE_WEIGHT=0.7
SPARSE_WEIGHT=0.3
USE_RERANKER=true
USE_HYBRID_SEARCH=true
LOG_LEVEL=INFO
DEBUG=false
CORS_ORIGINS=https://your-app.vercel.app

# 7. Deploy
# Click "Create Web Service"
# Render will build and deploy automatically

# Your URL: https://morpheus-backend.onrender.com
```

#### Using render.yaml (Blueprint)

```bash
# render.yaml is already configured in backend/
# Just use the Blueprint option in Render:

1. Go to Render Dashboard
2. Click "New +" → "Blueprint"
3. Connect your GitHub repository
4. Render detects render.yaml
5. Set secret environment variables (API keys)
6. Click "Apply"
```

---

### Option 3: Self-Hosted

#### Using Docker

```bash
# 1. Build image
cd backend
docker build -t morpheus-backend:latest .

# 2. Run container
docker run -d \
  --name morpheus-backend \
  -p 8000:8000 \
  --env-file .env \
  --restart unless-stopped \
  morpheus-backend:latest

# 3. Check logs
docker logs -f morpheus-backend

# 4. Set up reverse proxy (nginx example)
# /etc/nginx/sites-available/morpheus
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# 5. Enable site and reload nginx
sudo ln -s /etc/nginx/sites-available/morpheus /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# 6. Set up SSL with Let's Encrypt
sudo certbot --nginx -d api.yourdomain.com
```

---

## Frontend Deployment

### Vercel (Recommended)

**Pros:** Optimized for Next.js, automatic deployments, free tier
**Cons:** None for this use case

#### Method 1: GitHub Integration (Easiest)

```bash
# 1. Push code to GitHub
git push origin main

# 2. Go to Vercel
# Visit: https://vercel.com/

# 3. Import Project
# - Click "Add New" → "Project"
# - Import your GitHub repository
# - Vercel auto-detects Next.js

# 4. Configure Project
# Root Directory: frontend
# Framework Preset: Next.js
# Build Command: npm run build (auto-detected)
# Output Directory: .next (auto-detected)

# 5. Add Environment Variables
# Click "Environment Variables"
NEXT_PUBLIC_API_URL=https://your-backend-url.railway.app
NEXT_PUBLIC_ENABLE_MATRIX_RAIN=true
NEXT_PUBLIC_ENABLE_METRICS=true
NEXT_PUBLIC_ENABLE_DOCUMENT_UPLOAD=true
NEXT_PUBLIC_ENABLE_CASCADING_MODE=true
NEXT_PUBLIC_DEBUG=false

# 6. Deploy
# Click "Deploy"
# Vercel builds and deploys automatically

# Your URL: https://your-app.vercel.app
```

#### Method 2: Vercel CLI

```bash
# 1. Install Vercel CLI
npm install -g vercel

# 2. Navigate to frontend
cd frontend

# 3. Login
vercel login

# 4. Deploy
vercel

# Follow prompts:
# - Set up and deploy? Yes
# - Which scope? Your account
# - Link to existing project? No (first time) / Yes (subsequent)
# - What's your project's name? morpheus-frontend
# - In which directory is your code located? ./

# 5. Add environment variables
vercel env add NEXT_PUBLIC_API_URL production
# Enter value: https://your-backend-url.railway.app
# Repeat for other variables

# 6. Deploy to production
vercel --prod
```

---

## Database Setup

### Pinecone Configuration

#### Step 1: Create Index

```bash
# 1. Go to Pinecone Console
# https://app.pinecone.io/

# 2. Create New Index
# Click "Create Index"

# Dense Index (Required):
Name: morpheus
Dimensions: 1536  # For text-embedding-3-large
Metric: cosine
Cloud: AWS
Region: us-east-1

# 3. Wait for index to be ready (2-3 minutes)

# 4. Get API Key
# Settings → API Keys → Create API Key
# Save this key - you'll need it for PINECONE_API_KEY

# 5. (Optional) Create Sparse Index for Hybrid Search
Name: morpheus-sparse
Dimensions: 30000  # BM25 dimensions
Metric: dotproduct
Cloud: AWS
Region: us-east-1  # Same region as dense index
```

#### Step 2: Test Connection

```bash
# Using Python
cd backend
source .venv/bin/activate

python
>>> from app.core.pinecone_client import get_pinecone_client
>>> pc = get_pinecone_client()
>>> pc.describe_index("morpheus")
# Should show index details

# Using API health check
curl https://your-backend-url/api/health
# Should return: {"status": "healthy", "pinecone": "connected"}
```

#### Step 3: Load Initial Data (Optional)

```bash
# Upload sample documents
curl -X POST https://your-backend-url/api/documents/upload \
  -F "file=@sample.pdf"

# Check index stats
# Pinecone Console → Select Index → View Stats
# Should show vector count increasing
```

---

## Environment Variables

### Complete Backend Variables

```bash
# Required
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
PINECONE_API_KEY=...
PINECONE_INDEX_NAME=morpheus
PINECONE_ENVIRONMENT=us-east-1

# Model Configuration
ANTHROPIC_MODEL=claude-3-haiku-20240307
EMBEDDING_MODEL=text-embedding-3-small
RERANKER_MODEL=bge-reranker-v2-m3

# RAG Configuration
MAX_CHUNK_SIZE=1000
CHUNK_OVERLAP=200
TOP_K_RESULTS=10
RERANK_TOP_K=5
MIN_RELEVANCE_SCORE=0.7

# Hybrid Search
DENSE_WEIGHT=0.7
SPARSE_WEIGHT=0.3
USE_RERANKER=true
USE_HYBRID_SEARCH=true

# API Configuration
API_HOST=0.0.0.0
API_PORT=8000
CORS_ORIGINS=https://your-frontend.vercel.app

# Logging
LOG_LEVEL=INFO

# Production
DEBUG=false
RELOAD=false
```

### Complete Frontend Variables

```bash
# Required
NEXT_PUBLIC_API_URL=https://your-backend.railway.app

# Matrix Theme
NEXT_PUBLIC_ENABLE_MATRIX_RAIN=true
NEXT_PUBLIC_MATRIX_RAIN_INTENSITY=0.3

# Features
NEXT_PUBLIC_ENABLE_METRICS=true
NEXT_PUBLIC_ENABLE_DOCUMENT_UPLOAD=true
NEXT_PUBLIC_ENABLE_CASCADING_MODE=true
NEXT_PUBLIC_ENABLE_CONTEXT_VIEWER=true
NEXT_PUBLIC_ENABLE_PILL_MODE=true

# Optional
NEXT_PUBLIC_DEBUG=false
```

---

## Post-Deployment

### 1. Update CORS

Backend deployed first? Update CORS with frontend URL:

```bash
# Railway
railway variables set CORS_ORIGINS="https://your-app.vercel.app"

# Render
# Go to Dashboard → Environment → Edit CORS_ORIGINS

# Restart backend after changing CORS
```

### 2. Test Deployment

```bash
# Test backend health
curl https://your-backend-url/api/health

# Test frontend
open https://your-app.vercel.app

# Test full flow:
# 1. Open frontend
# 2. Upload a document
# 3. Ask a question
# 4. Verify response with citations
```

### 3. Monitor Logs

```bash
# Railway
railway logs

# Render
# Dashboard → Your Service → Logs tab

# Vercel
vercel logs
# Or use Vercel Dashboard → Project → Logs
```

### 4. Set Up Custom Domain (Optional)

#### Backend (Railway)

```bash
railway domain
# Follow prompts to add custom domain
# Add CNAME record: api.yourdomain.com → your-app.railway.app
```

#### Frontend (Vercel)

```bash
# Vercel Dashboard → Project → Settings → Domains
# Add Domain: morpheus.yourdomain.com
# Add DNS records as instructed
```

---

## Troubleshooting

### Common Issues

#### 1. CORS Errors

**Symptoms:** Frontend shows "CORS policy" errors in console

**Solution:**
```bash
# Update backend CORS_ORIGINS to include frontend URL
railway variables set CORS_ORIGINS="https://your-app.vercel.app,http://localhost:3000"

# Restart backend
railway up
```

#### 2. Pinecone Connection Fails

**Symptoms:** Backend health check shows Pinecone disconnected

**Solutions:**
- Verify API key is correct
- Ensure index exists and is ready
- Check index name matches exactly
- Verify environment region matches (us-east-1, etc.)

#### 3. Streaming Not Working

**Symptoms:** Messages don't stream, appear all at once

**Solutions:**
- Check backend logs for SSE errors
- Verify CORS allows streaming
- Test with curl:
```bash
curl -N https://your-backend-url/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"test","mode":"simple","stream":true}'
```

#### 4. Railway/Render Deployment Fails

**Symptoms:** Build fails or container crashes

**Solutions:**
- Check build logs for errors
- Verify Dockerfile builds locally: `docker build -t test .`
- Ensure requirements.txt is complete
- Check memory limits (upgrade plan if needed)

#### 5. Frontend Environment Variables Not Working

**Symptoms:** Frontend can't connect to backend

**Solutions:**
- Ensure variables are prefixed with `NEXT_PUBLIC_`
- Redeploy after adding variables
- Check Vercel Dashboard → Project → Settings → Environment Variables
- Rebuild: `vercel --prod --force`

---

## Monitoring

### Backend Monitoring

#### Railway
- Dashboard shows CPU, memory, network usage
- Logs available in real-time
- Set up alerts in Settings

#### Render
- Metrics tab shows performance
- Logs tab for debugging
- Email notifications for crashes

### Frontend Monitoring

#### Vercel Analytics
```bash
# Enable in Vercel Dashboard
# Project → Analytics → Enable

# Shows:
# - Page views
# - Performance scores
# - Error tracking
```

### Application Monitoring

#### Add Sentry (Optional)

```bash
# Backend
pip install sentry-sdk[fastapi]

# frontend
npm install @sentry/nextjs

# Set SENTRY_DSN in environment variables
```

---

## Production Checklist

- [ ] All API keys secured as environment variables
- [ ] CORS configured with production URLs only
- [ ] SSL/HTTPS enabled (automatic with Railway/Render/Vercel)
- [ ] Health checks passing
- [ ] Error boundaries working
- [ ] Logs configured and monitored
- [ ] Pinecone index created with correct dimensions
- [ ] Document upload tested
- [ ] All RAG modes tested (simple, hybrid, agentic)
- [ ] Performance acceptable (< 3s response time)
- [ ] Custom domains configured (if using)
- [ ] Backup strategy for Pinecone data
- [ ] Rate limiting enabled
- [ ] Monitoring/alerting set up

---

## Cost Estimates

### Monthly Costs (Low Traffic - <10K requests/month)

| Service | Plan | Cost |
|---------|------|------|
| Backend (Railway Hobby) | 500 hours | $5 |
| Frontend (Vercel Hobby) | Unlimited | $0 |
| Pinecone (Serverless) | 100K vectors | $0-20 |
| Anthropic API | ~1M tokens | $10-20 |
| OpenAI API | ~1M tokens | $1-2 |
| **Total** | | **~$16-47/month** |

### Scaling Up (Medium Traffic - 100K requests/month)

| Service | Plan | Cost |
|---------|------|------|
| Backend (Render Standard) | 2GB RAM | $25 |
| Frontend (Vercel Pro) | Analytics + more | $20 |
| Pinecone (Dedicated) | 1M vectors | $70 |
| Anthropic API | ~10M tokens | $100-200 |
| OpenAI API | ~10M tokens | $10-20 |
| **Total** | | **~$225-335/month** |

---

## Support

- **Documentation:** [CLAUDE.md](./CLAUDE.md)
- **Issues:** [GitHub Issues](https://github.com/ThomasJButler/Morpheus/issues)

---

*Last Updated: 2025-11-23*
