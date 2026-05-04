import { useState } from 'react';
import { Send, Bot, User } from 'lucide-react';
import { AppShell } from '../../components/layout/AppShell.tsx';
import { chatbotApi } from '../../services/api.ts';

export function StudentChatbotPage() {
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<{ sender: 'user' | 'bot', text: string }[]>([
    { sender: 'bot', text: 'Hello! I am Absattar your Assistant. Ask me anything about college policies.' }
  ]);
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!query.trim()) return;
    
    const userMsg = query.trim();
    setMessages(prev => [...prev, { sender: 'user', text: userMsg }]);
    setQuery('');
    setLoading(true);

    try {
      const data = await chatbotApi.ask(userMsg);
      setMessages(prev => [...prev, { sender: 'bot', text: data.response }]);
    } catch (error) {
      setMessages(prev => [...prev, { sender: 'bot', text: 'Sorry, I encountered an error. Please try again later.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell title="Policy Chatbot">
      <div className="max-w-4xl mx-auto flex flex-col h-[calc(100vh-12rem)]">
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 rounded-t-2xl border border-gray-200">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`flex max-w-[80%] items-start gap-2 ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`p-2 rounded-full ${msg.sender === 'user' ? 'bg-blue-100' : 'bg-white shadow-sm'}`}>
                  {msg.sender === 'user' ? <User className="h-5 w-5 text-blue-600" /> : <Bot className="h-5 w-5 text-indigo-600" />}
                </div>
                <div className={`p-3 rounded-2xl ${msg.sender === 'user' ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-800 shadow-sm'}`}>
                  <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                </div>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-white border border-gray-200 p-3 rounded-2xl shadow-sm animate-pulse">
                <p className="text-sm text-gray-400">Typing...</p>
              </div>
            </div>
          )}
        </div>
        
        <div className="p-4 bg-white border-x border-b border-gray-200 rounded-b-2xl shadow-sm">
          <div className="flex gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask about attendance policies, grading, etc..."
              className="flex-1 p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleSend}
              disabled={loading || !query.trim()}
              className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              <Send className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
