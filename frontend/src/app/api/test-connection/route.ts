/**
 * Next.js API Route: Test Connection BFF
 *
 * Routes API key validation through the server to avoid CORS issues.
 * Supports both OpenAI and Anthropic providers.
 */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { provider, apiKey } = body;

    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'API key is required' },
        { status: 400 }
      );
    }

    if (provider === 'openai') {
      // Test OpenAI API key
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      });

      if (response.ok) {
        return NextResponse.json({ success: true, provider: 'openai' });
      } else {
        const error = await response.json().catch(() => ({}));
        return NextResponse.json(
          { success: false, error: error.error?.message || 'Invalid API key' },
          { status: 401 }
        );
      }
    } else if (provider === 'anthropic') {
      // Test Anthropic API key by making a minimal request
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          max_tokens: 1,
          messages: [{ role: 'user', content: 'Hi' }],
        }),
      });

      if (response.ok || response.status === 200) {
        return NextResponse.json({ success: true, provider: 'anthropic' });
      } else {
        const error = await response.json().catch(() => ({}));
        return NextResponse.json(
          { success: false, error: error.error?.message || 'Invalid API key' },
          { status: 401 }
        );
      }
    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid provider. Use "openai" or "anthropic"' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('[Test Connection] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Connection test failed' },
      { status: 500 }
    );
  }
}
