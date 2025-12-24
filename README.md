# Morpheus

An intelligent document reasoning system with a Matrix-themed interface.

[Live Demo](https://morpheusrag.vercel.app) | [API Docs](https://morpheus-backend-4c0h.onrender.com/docs)

<img width="1266" height="891" alt="image" src="https://github.com/user-attachments/assets/5bd64eb7-97a5-409f-b970-926d2929a986" />

## Overview

Upload your private documents and ask questions in natural language. Morpheus learns from your documents and returns accurate answers with source citations.

## Why Morpheus

- **Private by design** - Each session creates a fresh Pinecone vector namespace. When your session ends, your data is gone. Nothing is stored permanently.
- **Cost effective** - Pay only for the tokens you use instead of $20/month for AI Pro subscriptions.
- **Unique insights** - Get answers derived specifically from your documents, not generic web results.

## How It Works

1. Documents are chunked and embedded into vectors
2. Stored in Pinecone under your session namespace
3. Retrieved via semantic search when you ask questions
4. Claude generates answers from the retrieved context
5. New session = fresh start, no data carried over

## Tech Stack

![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=next.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)
![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![Anthropic](https://img.shields.io/badge/Claude-CC785C?style=for-the-badge&logo=anthropic&logoColor=white)
![OpenAI](https://img.shields.io/badge/OpenAI-412991?style=for-the-badge&logo=openai&logoColor=white)
![Pinecone](https://img.shields.io/badge/Pinecone-000000?style=for-the-badge&logo=pinecone&logoColor=white)

## Licence

MIT - see [LICENSE](LICENSE)
