import type { Request, Response } from 'express';

type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';

function normalizeMessages(input: any): ChatMessage[] {
  if (Array.isArray(input)) {
    return input
      .map((m) => ({
        role: m?.role,
        content: typeof m?.content === 'string' ? m.content : '',
      }))
      .filter((m) => (m.role === 'system' || m.role === 'user' || m.role === 'assistant') && m.content.trim().length > 0);
  }
  return [];
}

export const chat = async (req: Request, res: Response) => {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      const allowMock = process.env.USE_MOCK_AI === 'true' || process.env.NODE_ENV !== 'production';
      if (allowMock) {
        const body = req.body as { message?: string };
        const text = typeof body?.message === 'string' ? body.message.trim() : '';
        return res.json({
          message: text
            ? `Mock AI (no key configured). You said: "${text}".\n\nTo enable real AI, set OPENAI_API_KEY in server .env then restart the backend.`
            : 'Mock AI (no key configured). Set OPENAI_API_KEY to enable real responses.',
          model: 'mock',
        });
      }
      return res.status(503).json({
        error: 'misconfigured',
        message: 'AI is not configured. Set OPENAI_API_KEY in the server .env then restart the backend.',
      });
    }

    const body = req.body as { message?: string; messages?: any; model?: string };
    const model = body.model || process.env.OPENAI_MODEL || 'gpt-4o-mini';

    const incomingMessages = normalizeMessages(body.messages);
    const messageText = typeof body.message === 'string' ? body.message : '';

    const currentUser = (req as any).currentUser as { uid?: string; email?: string; role?: string } | undefined;

    const system: ChatMessage = {
      role: 'system',
      content:
        'You are an assistant inside GeoAttend (QR + location attendance app). ' +
        'Help users understand screens, solve usage issues, and explain what to do next. ' +
        'Keep answers short, practical, and step-by-step. If you do not know, ask a single clarifying question.',
    };

    const messages: ChatMessage[] = [
      system,
      ...incomingMessages,
      ...(messageText.trim()
        ? [{ role: 'user' as const, content: messageText.trim() }]
        : []),
    ];

    if (messages.filter((m) => m.role === 'user').length === 0) {
      return res.status(400).json({ error: 'bad_request', message: 'message (string) or messages (array) is required.' });
    }

    const response = await fetch(OPENAI_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.2,
        user: currentUser?.uid || currentUser?.email || undefined,
      }),
    });

    const data = (await response.json()) as any;
    if (!response.ok) {
      return res.status(502).json({
        error: 'upstream_error',
        message: data?.error?.message || 'OpenAI request failed.',
        status: response.status,
      });
    }

    const content: string | undefined = data?.choices?.[0]?.message?.content;
    return res.json({
      message: content || '',
      model: data?.model || model,
      usage: data?.usage,
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'server_error', message: error?.message || 'Failed to generate chat response.' });
  }
};

