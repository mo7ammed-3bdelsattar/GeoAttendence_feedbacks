import { create } from 'zustand';
import { aiApi } from '../services/api.ts';

export type AiChatMessage = { role: 'user' | 'assistant'; content: string };

type State = {
  open: boolean;
  messages: AiChatMessage[];
  input: string;
  sending: boolean;
  error: string | null;
  openWidget: () => void;
  closeWidget: () => void;
  toggleWidget: () => void;
  setInput: (v: string) => void;
  send: () => Promise<void>;
  clear: () => void;
};

export const useAiChatStore = create<State>()((set, get) => ({
  open: false,
  messages: [],
  input: '',
  sending: false,
  error: null,
  openWidget: () => set({ open: true }),
  closeWidget: () => set({ open: false }),
  toggleWidget: () => set((s) => ({ open: !s.open })),
  setInput: (v) => set({ input: v }),
  clear: () => set({ messages: [], input: '', error: null }),
  send: async () => {
    const text = get().input.trim();
    if (!text || get().sending) return;

    const nextMessages: AiChatMessage[] = [...get().messages, { role: 'user', content: text }];
    set({ messages: nextMessages, input: '', sending: true, error: null });
    try {
      const res = await aiApi.chat({
        message: text,
        messages: nextMessages.map((m) => ({ role: m.role, content: m.content })),
      });
      const reply = (res?.message || '').trim() || 'No response.';
      set((s) => ({ messages: [...s.messages, { role: 'assistant', content: reply }], sending: false }));
    } catch (e: any) {
      set({ sending: false, error: e?.message || 'Failed to send.' });
      set((s) => ({ messages: [...s.messages, { role: 'assistant', content: e?.message || 'Failed to send.' }] }));
    }
  },
}));

