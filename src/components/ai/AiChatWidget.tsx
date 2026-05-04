import { Bot, X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useAiChatStore } from '../../stores/aiChatStore.ts';

export function AiChatWidget() {
  const open = useAiChatStore((s) => s.open);
  const messages = useAiChatStore((s) => s.messages);
  const input = useAiChatStore((s) => s.input);
  const sending = useAiChatStore((s) => s.sending);
  const toggleWidget = useAiChatStore((s) => s.toggleWidget);
  const closeWidget = useAiChatStore((s) => s.closeWidget);
  const setInput = useAiChatStore((s) => s.setInput);
  const send = useAiChatStore((s) => s.send);

  const endRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, open]);

  return (
    <div className="fixed z-40 right-4 bottom-20 md:right-6 md:bottom-6">
      {!open ? (
        <button
          type="button"
          onClick={toggleWidget}
          aria-label="Open AI chat"
          className="w-12 h-12 rounded-2xl bg-slate-900 text-white shadow-xl flex items-center justify-center hover:bg-slate-800 active:scale-[0.98] transition"
        >
          <Bot className="h-5 w-5" />
        </button>
      ) : (
        <div className="w-[320px] max-w-[calc(100vw-2rem)] rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200 bg-white">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center">
                <Bot className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">AI Assistant</p>
                <p className="text-[11px] text-slate-500">QR • Location • Help</p>
              </div>
            </div>
            <button
              type="button"
              onClick={closeWidget}
              aria-label="Close AI chat"
              className="w-9 h-9 rounded-xl border border-slate-200 flex items-center justify-center hover:bg-slate-50"
            >
              <X className="h-4 w-4 text-slate-700" />
            </button>
          </div>

          <div className="h-[320px] overflow-y-auto p-3 space-y-2 bg-slate-50">
            {messages.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-white p-3 text-xs text-slate-600">
                اسأل: “ليه الـ QR مش بيظهر؟” أو “أعمل check-in بالـ location ازاي؟”
              </div>
            ) : (
              messages.map((m, idx) => (
                <div key={idx} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                  <div
                    className={[
                      'max-w-[85%] rounded-2xl px-3 py-2 text-xs',
                      m.role === 'user' ? 'bg-slate-900 text-white' : 'bg-white text-slate-900 border border-slate-200',
                    ].join(' ')}
                  >
                    {m.content}
                  </div>
                </div>
              ))
            )}
            {sending ? <div className="text-[11px] text-slate-500">Thinking…</div> : null}
            <div ref={endRef} />
          </div>

          <div className="p-3 border-t border-slate-200 bg-white">
            <div className="flex gap-2">
              <input
                className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-slate-400"
                placeholder="اكتب رسالتك…"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') send();
                }}
              />
              <button
                className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                onClick={send}
                disabled={sending || input.trim().length === 0}
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

