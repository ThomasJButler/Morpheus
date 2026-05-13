# Morpheus

An intelligent document reasoning system with a Matrix-themed interface.

[Live Demo](https://morpheusrag.vercel.app) | [API Docs](https://morpheus-backend-4c0h.onrender.com/docs)

<img width="1266" height="891" alt="image" src="https://github.com/user-attachments/assets/5bd64eb7-97a5-409f-b970-926d2929a986" />

## Overview

Upload your private documents and ask questions in natural language. Morpheus learns from your documents and returns accurate answers with source citations.

## Why Morpheus

- **Private by design** - Each session creates a fresh Pinecone vector namespace. When your session ends, your documents and conversation are deleted. Nothing is stored permanently.
- **Cost effective** - Pay only for the tokens you use instead of $20/month for AI Pro subscriptions.
- **Unique insights** - Get answers derived specifically from your documents, not generic web results.

## How It Works

1. Documents are chunked and embedded into vectors
2. Stored in Pinecone under your session namespace
3. Retrieved via semantic search when you ask questions
4. Claude (or your chosen model) generates answers from the retrieved context
5. New session = fresh start, no data carried over

## Privacy & API keys

Morpheus is built so your data stays yours.

- **API keys live in your browser.** When you paste your Anthropic or OpenAI key into Settings it's saved to `localStorage` (or only `sessionStorage` if you turn off "Remember settings"). It never lands in a database we own.
- **Where the key goes when you chat.** The browser POSTs your message to this app's own server route (a Next.js BFF), which then calls Anthropic or OpenAI on your behalf with the key you supplied. We don't log it, persist it, or share it with any third party. The server route is a thin pass-through — it exists so the key isn't exposed to other origins via CORS, not so we can collect it.
- **Conversations aren't saved.** Chat history lives in your browser for the current session. When you click "Clear" or close the tab, it's gone. Nothing is persisted server-side.
- **Documents are session-scoped.** Uploaded documents go into a per-session Pinecone namespace and are deleted when the session ends.

In short: no analytics on your queries, no transcripts written to disk, no key telemetry. The only third parties involved are the ones you explicitly choose (Anthropic, OpenAI, Pinecone), called with credentials you supply.

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
