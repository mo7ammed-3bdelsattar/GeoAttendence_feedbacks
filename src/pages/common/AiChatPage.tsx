import { useState } from 'react';
import { aiApi } from '../../services/api.ts';
import { useAuthStore } from '../../stores/authStore.ts';

type ChatMessage = { role: 'user' | 'assistant'; content: string };

export function AiChatPage() {
  useAuthStore((s) => s.user);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const canSend = input.trim().length > 0 && !sending;

  const headerTitle = 'AI Assistant';

  const send = async () => {
    const text = input.trim();
    if (!text) return;
    setInput('');

    const nextMessages = [...messages, { role: 'user', content: text } as const];
    setMessages(nextMessages);
    setSending(true);

    try {
      const res = await aiApi.chat({
        message: text,
        messages: nextMessages.map((m) => ({ role: m.role, content: m.content })),
      });
      const reply = (res?.message || '').trim() || 'No response.';
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
    } catch (e: any) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: e?.message || 'Failed to send message.' },
      ]);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-3xl px-4 py-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">{headerTitle}</h1>
            <p className="text-sm text-slate-600">Ask anything about QR attendance, location check-in, or using the app.</p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white">
          <div className="h-[60vh] overflow-y-auto p-4">
            {messages.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                Try: “Why is the QR not showing?” or “How do I check in by location?”
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map((m, idx) => (
                  <div key={idx} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                    <div
                      className={[
                        'max-w-[85%] rounded-2xl px-3 py-2 text-sm',
                        m.role === 'user'
                          ? 'bg-slate-900 text-white'
                          : 'bg-slate-100 text-slate-900',
                      ].join(' ')}
                    >
                      {m.content}
                    </div>
                  </div>
                ))}
                {sending ? (
                  <div className="text-xs text-slate-500">Thinking…</div>
                ) : null}
              </div>
            )}
          </div>

          <div className="border-t border-slate-200 p-3">
            <div className="flex gap-2">
              <input
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                placeholder="Type your message…"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') send();
                }}
              />
              <button
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                onClick={send}
                disabled={!canSend}
              >
                Send
              </button>
            </div>
            <div className="mt-2 text-xs text-slate-500">
              Uses your server endpoint <code className="rounded bg-slate-100 px-1">/api/ai/chat</code>.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

