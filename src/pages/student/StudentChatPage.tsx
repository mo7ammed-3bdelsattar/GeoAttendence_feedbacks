import { useState, useEffect } from 'react';
import { Send, User, ShieldAlert } from 'lucide-react';
import { AppShell } from '../../components/layout/AppShell.tsx';
import { chatApi } from '../../services/api.ts';
import { useAuthStore } from '../../stores/authStore.ts';
import { toast } from 'react-hot-toast';

export function StudentChatPage() {
  const user = useAuthStore((s) => s.user);
  const [text, setText] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user?.id) {
      loadMessages();
      const interval = setInterval(loadMessages, 5000); // Poll every 5s for simple real-time
      return () => clearInterval(interval);
    }
  }, [user?.id]);

  const loadMessages = async () => {
    try {
      if (!user?.id) return;
      const data = await chatApi.getMessages(user.id);
      setMessages(data);
    } catch (error) {
      console.error('Failed to load messages');
    }
  };

  const handleSend = async () => {
    if (!text.trim() || !user?.id) return;
    
    const msgText = text.trim();
    setText('');
    setLoading(true);

    try {
      await chatApi.sendMessage({
        studentId: user.id,
        senderId: user.id,
        text: msgText,
        isAdmin: false
      });
      loadMessages();
    } catch (error) {
      toast.error('Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell title="Contact Admin">
      <div className="max-w-4xl mx-auto flex flex-col h-[calc(100vh-12rem)]">
        <div className="bg-amber-50 border-x border-t border-amber-100 p-3 rounded-t-2xl flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-amber-600" />
          <p className="text-xs text-amber-700 font-medium">This chat is with the system administrators.</p>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 border-x border-gray-200">
          {messages.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <p>No messages yet. Start a conversation with an administrator.</p>
            </div>
          ) : (
            messages.map((msg, i) => (
              <div key={i} className={`flex ${!msg.isAdmin ? 'justify-end' : 'justify-start'}`}>
                <div className={`flex max-w-[80%] items-start gap-2 ${!msg.isAdmin ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className={`p-2 rounded-full ${!msg.isAdmin ? 'bg-blue-100' : 'bg-amber-100'}`}>
                    <User className={`h-5 w-5 ${!msg.isAdmin ? 'text-blue-600' : 'text-amber-600'}`} />
                  </div>
                  <div>
                    <div className={`p-3 rounded-2xl ${!msg.isAdmin ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-800 shadow-sm'}`}>
                      <p className="text-sm">{msg.text}</p>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1 px-1">
                      {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString() : ''}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        
        <div className="p-4 bg-white border border-gray-200 rounded-b-2xl shadow-sm">
          <div className="flex gap-2">
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Type your message to admin..."
              className="flex-1 p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleSend}
              disabled={loading || !text.trim()}
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
