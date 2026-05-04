import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Send, User, ChevronLeft } from 'lucide-react';
import { AppShell } from '../../components/layout/AppShell.tsx';
import { chatApi, adminApi } from '../../services/api.ts';
import { useAuthStore } from '../../stores/authStore.ts';
import { toast } from 'react-hot-toast';

export function AdminChatPage() {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const admin = useAuthStore((s) => s.user);
  const [text, setText] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  const [student, setStudent] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (studentId) {
      loadStudent();
      loadMessages();
      const interval = setInterval(loadMessages, 5000);
      return () => clearInterval(interval);
    }
  }, [studentId]);

  const loadStudent = async () => {
    try {
      const users = await adminApi.getUsers('student');
      const found = users.find(u => u.id === studentId);
      setStudent(found);
    } catch (error) {
      console.error('Failed to load student info');
    }
  };

  const loadMessages = async () => {
    try {
      if (!studentId) return;
      const data = await chatApi.getMessages(studentId);
      setMessages(data);
    } catch (error) {
      console.error('Failed to load messages');
    }
  };

  const handleSend = async () => {
    if (!text.trim() || !studentId || !admin?.id) return;
    
    const msgText = text.trim();
    setText('');
    setLoading(true);

    try {
      await chatApi.sendMessage({
        studentId,
        senderId: admin.id,
        text: msgText,
        isAdmin: true
      });
      loadMessages();
    } catch (error) {
      toast.error('Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell title={`Chat with ${student?.name || 'Student'}`}>
      <div className="max-w-4xl mx-auto flex flex-col h-[calc(100vh-12rem)]">
        <div className="bg-white border-x border-t border-gray-100 p-3 rounded-t-2xl flex items-center gap-4">
          <button onClick={() => navigate('/admin/chats')} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <ChevronLeft className="h-5 w-5 text-gray-500" />
          </button>
          <div>
            <h2 className="font-bold text-gray-900">{student?.name || 'Loading...'}</h2>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{student?.email}</p>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 border-x border-gray-200">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.isAdmin ? 'justify-end' : 'justify-start'}`}>
              <div className={`flex max-w-[80%] items-start gap-2 ${msg.isAdmin ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`p-2 rounded-full ${msg.isAdmin ? 'bg-blue-100' : 'bg-gray-200'}`}>
                  <User className={`h-5 w-5 ${msg.isAdmin ? 'text-blue-600' : 'text-gray-600'}`} />
                </div>
                <div>
                  <div className={`p-3 rounded-2xl ${msg.isAdmin ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-800 shadow-sm'}`}>
                    <p className="text-sm">{msg.text}</p>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1 px-1">
                    {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString() : ''}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="p-4 bg-white border border-gray-200 rounded-b-2xl shadow-sm">
          <div className="flex gap-2">
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Type your reply..."
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
