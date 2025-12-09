# ==============================================================================
# MORPHEUS RAG CHATBOT - BACKEND DOCKERFILE
# ==============================================================================
# Multi-stage build for optimized production image
# Python 3.11 slim base with FastAPI backend

# ==============================================================================
# STAGE 1: Builder - Install dependencies
# ==============================================================================
FROM python:3.11-slim AS builder

# Set working directory
WORKDIR /app

# Install system dependencies required for building Python packages
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    make \
    libffi-dev \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .

# Create virtual environment and install dependencies
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
RUN pip install --no-cache-dir --upgrade pip setuptools wheel && \
    pip install --no-cache-dir -r requirements.txt

# Download NLTK data for tokenization (required by pinecone-text BM25 encoder)
RUN python -c "import nltk; nltk.download('punkt_tab', download_dir='/opt/venv/nltk_data')"

# ==============================================================================
# STAGE 2: Runtime - Create production image
# ==============================================================================
FROM python:3.11-slim

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PATH="/opt/venv/bin:$PATH" \
    NLTK_DATA="/opt/venv/nltk_data" \
    PORT=8000

# Install runtime dependencies only
RUN apt-get update && apt-get install -y \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user for security
RUN useradd -m -u 1000 morpheus && \
    mkdir -p /app/logs && \
    chown -R morpheus:morpheus /app

# Set working directory
WORKDIR /app

# Copy virtual environment from builder
COPY --from=builder /opt/venv /opt/venv

# Copy application code
COPY --chown=morpheus:morpheus . .

# Switch to non-root user
USER morpheus

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:8000/api/health')" || exit 1

# Run the application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]

# ==============================================================================
# BUILD & RUN INSTRUCTIONS
# ==============================================================================
# Build:
#   docker build -t morpheus-backend:latest .
#
# Run:
#   docker run -p 8000:8000 \
#     -e ANTHROPIC_API_KEY=your_key \
#     -e OPENAI_API_KEY=your_key \
#     -e PINECONE_API_KEY=your_key \
#     morpheus-backend:latest
#
# Run with .env file:
#   docker run -p 8000:8000 --env-file .env morpheus-backend:latest
#
# Development with auto-reload:
#   docker run -p 8000:8000 --env-file .env \
#     -v $(pwd):/app \
#     morpheus-backend:latest \
#     uvicorn app.main:app --host 0.0.0.0 --reload
# ==============================================================================
