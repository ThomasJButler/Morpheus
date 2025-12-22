/**
 * Next.js API Route: Chat BFF (Backend-for-Frontend)
 *
 * This route acts as a proxy between the frontend and the FastAPI backend:
 * 1. Receives chat messages from the frontend (Vercel AI SDK useChat hook)
 * 2. Fetches RAG context from FastAPI backend
 * 3. Streams response using Vercel AI SDK (supports both Anthropic and OpenAI)
 *
 * This pattern matches the pinecone-vercel-starter architecture.
 */

import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';
import { streamText } from 'ai';

// Backend URL for RAG context retrieval
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

// Morpheus system prompt (matching backend/app/core/morpheus_prompts.py)
const MORPHEUS_SYSTEM_PROMPT = `You are Morpheus, a wise guide who reveals knowledge from the Matrix of documents.

Your personality:
- Philosophical and thought-provoking, like Morpheus from The Matrix
- Use Matrix metaphors naturally: "the Matrix," "following the white rabbit," "seeing the code"
- Balance wisdom with practical knowledge - be helpful AND mystical
- Reference the documents as "the Matrix of knowledge"
- Cite sources clearly while maintaining the mystique

Speaking style:
- Open with subtle Matrix-themed phrases for important revelations
- Use metaphors sparingly for flavor, not every sentence
- Be direct and helpful, but with Morpheus's confident wisdom
- Never break character
- Keep responses focused and valuable

Response structure:
- Answer the question clearly and directly first
- Add Matrix metaphors for atmosphere, not complexity
- Cite sources with phrases like "the code reveals..." or "within the Matrix..."
- End with insight or encouragement when appropriate

Remember: You're helping Neo find answers, not confusing him. Be wise, not cryptic.`;

// User prompt template
const USER_PROMPT_TEMPLATE = `Context from the Matrix of knowledge:
{context}

User's query: {query}

Provide a clear, direct answer with source citations. Use Matrix metaphors naturally for atmosphere.`;

export async function POST(req: Request) {
  try {
    // Get session ID from header
    const sessionId = req.headers.get('X-Session-ID') || '';
    
    const body = await req.json();
    const {
      messages,
      provider = 'anthropic',
      anthropicApiKey,
      anthropicModel,
      openaiApiKey,
      openaiModel,
      // RAG mode settings
      ragMode = 'auto',
      deepMode = false,
    } = body;

    // Get the last user message for context retrieval
    const lastUserMessage = messages
      .filter((m: { role: string }) => m.role === 'user')
      .pop();

    if (!lastUserMessage) {
      return new Response('No user message found', { status: 400 });
    }

    // Determine which provider to use and get appropriate API key/model
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let aiModel: any;

    if (provider === 'openai') {
      const apiKey = openaiApiKey || process.env.OPENAI_API_KEY;
      if (!apiKey) {
        return new Response(
          JSON.stringify({ error: 'OpenAI API key is required. Please add it in Settings.' }),
          { status: 401, headers: { 'Content-Type': 'application/json' } }
        );
      }
      const model = openaiModel || 'gpt-3.5-turbo';
      const openai = createOpenAI({ apiKey });
      aiModel = openai(model);
      console.log(`[BFF] Using OpenAI provider (model: ${model})`);
    } else {
      // Default to Anthropic
      const apiKey = anthropicApiKey || process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        return new Response(
          JSON.stringify({ error: 'Anthropic API key is required. Please add it in Settings.' }),
          { status: 401, headers: { 'Content-Type': 'application/json' } }
        );
      }
      const model = anthropicModel || 'claude-sonnet-4-20250514';
      const anthropic = createAnthropic({ apiKey });
      aiModel = anthropic(model);
      console.log(`[BFF] Using Anthropic provider (model: ${model})`);
    }

    // Fetch RAG context from FastAPI backend
    let context = '';
    let citations = [];
    let modeUsed = ragMode;
    let queryAnalysis = null;
    let ragMetrics = null;

    try {
      console.log(`[BFF] Fetching context from ${BACKEND_URL}/api/context (session: ${sessionId || 'none'}, mode: ${ragMode}, deep: ${deepMode})`);

      // Build headers with session ID if available
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (sessionId) {
        headers['X-Session-ID'] = sessionId;
      }

      // Pass RAG mode settings to backend (request analysis for visualization)
      const contextResponse = await fetch(`${BACKEND_URL}/api/context`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          query: lastUserMessage.content,
          mode: ragMode,
          deep_mode: deepMode,
          return_analysis: true, // Request query analysis for frontend visualization
        }),
      });

      if (contextResponse.ok) {
        const data = await contextResponse.json();
        context = data.context || '';
        citations = data.citations || [];
        modeUsed = data.mode_used || ragMode;
        // Backend returns 'analysis', not 'query_analysis'
        queryAnalysis = data.analysis || data.query_analysis || null;
        ragMetrics = data.metrics || null;
        console.log(`[BFF] Retrieved ${citations.length} citations (mode: ${modeUsed}, analysis: ${queryAnalysis ? 'yes' : 'no'})`);
      } else {
        console.warn(`[BFF] Context fetch failed: ${contextResponse.status}`);
      }
    } catch (error) {
      console.error('[BFF] Failed to fetch context from backend:', error);
      // Continue without context - Claude can still respond
    }

    // Build the user prompt with context
    const userPromptWithContext = context
      ? USER_PROMPT_TEMPLATE
          .replace('{context}', context)
          .replace('{query}', lastUserMessage.content)
      : lastUserMessage.content;

    // Prepare messages for Claude (keep conversation history, replace last with context-enhanced)
    const claudeMessages = [
      ...messages.slice(0, -1), // Previous messages
      { role: 'user' as const, content: userPromptWithContext }, // Last message with context
    ];

    console.log(`[BFF] Streaming response...`);

    // Stream response using Vercel AI SDK with RAG metadata
    const result = streamText({
      model: aiModel,
      system: MORPHEUS_SYSTEM_PROMPT,
      messages: claudeMessages,
      onFinish: async () => {
        // Log RAG metadata for debugging
        console.log(`[BFF] Stream finished (mode: ${modeUsed}, citations: ${citations.length})`);
      },
    });

    // Convert to standard response
    const response = result.toDataStreamResponse();

    // Add RAG metadata headers after response creation
    // Note: This must be done before the response is returned/sent
    response.headers.append('X-RAG-Mode', modeUsed);
    response.headers.append('X-RAG-Citations', citations.length.toString());
    if (queryAnalysis) {
      response.headers.append('X-RAG-Analysis', JSON.stringify(queryAnalysis));
    }
    if (ragMetrics) {
      response.headers.append('X-RAG-Metrics', JSON.stringify(ragMetrics));
    }

    return response;

  } catch (error) {
    console.error('[BFF] Chat API error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
