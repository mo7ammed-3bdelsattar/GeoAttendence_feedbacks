import { useState, useEffect } from 'react';
import { MessageSquare, User, Search } from 'lucide-react';
import { AppShell } from '../../components/layout/AppShell.tsx';
import { chatApi, adminApi } from '../../services/api.ts';
import { Link } from 'react-router-dom';

export function AdminChatThreadsPage() {
  const [chats, setChats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadChats();
  }, []);

  const loadChats = async () => {
    try {
      const data = await chatApi.getMyChats('', 'admin');
      // Enrich chats with student names if possible
      const students = await adminApi.getUsers('student');
      const enriched = data.map(chat => {
        const student = students.find(s => s.id === chat.studentId);
        return { ...chat, studentName: student?.name || 'Unknown Student' };
      });
      setChats(enriched);
    } catch (error) {
      console.error('Failed to load chats');
    } finally {
      setLoading(false);
    }
  };

  const filteredChats = chats.filter(chat => 
    chat.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    chat.lastMessage.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <AppShell title="Student Support Chats">
      <div className="max-w-6xl mx-auto py-8 px-4">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Support Threads</h1>
            <p className="text-gray-500">Respond to student inquiries and support requests.</p>
          </div>
          <div className="relative">
            <Search className="h-5 w-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search students..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20">Loading conversations...</div>
        ) : filteredChats.length === 0 ? (
          <div className="text-center py-20 bg-gray-50 rounded-3xl border-2 border-dashed">
            <MessageSquare className="h-12 w-12 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">No active support threads found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredChats.map(chat => (
              <Link
                key={chat.id}
                to={`/admin/chat/${chat.studentId}`}
                className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all group"
              >
                <div className="h-12 w-12 bg-blue-50 rounded-full flex items-center justify-center text-blue-600">
                  <User className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <h3 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{chat.studentName}</h3>
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">
                      {new Date(chat.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 line-clamp-1">{chat.lastMessage}</p>
                </div>
                <div className="h-8 w-8 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all">
                  <MessageSquare className="h-4 w-4" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
