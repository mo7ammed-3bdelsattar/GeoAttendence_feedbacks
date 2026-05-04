import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Save, X, BookOpen } from 'lucide-react';
import { AppShell } from '../../components/layout/AppShell.tsx';
import { chatbotApi } from '../../services/api.ts';
import { toast } from 'react-hot-toast';

export function AdminPoliciesPage() {
  const [policies, setPolicies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any | null>(null);

  useEffect(() => {
    loadPolicies();
  }, []);

  const loadPolicies = async () => {
    try {
      setLoading(true);
      const data = await chatbotApi.getPolicies();
      setPolicies(data);
    } catch (error) {
      toast.error('Failed to load policies');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing.title || !editing.content) return;

    try {
      await chatbotApi.upsertPolicy(editing);
      toast.success(editing.id ? 'Policy updated' : 'Policy created');
      setEditing(null);
      loadPolicies();
    } catch (error) {
      toast.error('Failed to save policy');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this policy?')) return;
    try {
      await chatbotApi.deletePolicy(id);
      toast.success('Policy deleted');
      loadPolicies();
    } catch (error) {
      toast.error('Failed to delete policy');
    }
  };

  return (
    <AppShell title="Manage Chatbot Knowledge Base">
      <div className="max-w-6xl mx-auto py-8 px-4">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Policies & Rules</h1>
            <p className="text-gray-500">Configure the chatbot knowledge base by adding policy documents.</p>
          </div>
          <button
            onClick={() => setEditing({ title: '', content: '', keywords: '' })}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-5 w-5" />
            Add New Policy
          </button>
        </div>

        {editing && (
          <div className="mb-8 bg-white p-6 rounded-2xl border border-blue-100 shadow-md">
            <h2 className="text-lg font-bold mb-4">{editing.id ? 'Edit Policy' : 'New Policy'}</h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  value={editing.title}
                  onChange={e => setEditing({ ...editing, title: e.target.value })}
                  className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. Attendance Policy"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Keywords (comma separated)</label>
                <input
                  type="text"
                  value={editing.keywords}
                  onChange={e => setEditing({ ...editing, keywords: e.target.value })}
                  className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="attendance, absent, late, check-in"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Content (The answer provided by bot)</label>
                <textarea
                  value={editing.content}
                  onChange={e => setEditing({ ...editing, content: e.target.value })}
                  className="w-full p-2 border border-gray-200 rounded-lg h-40 focus:ring-2 focus:ring-blue-500"
                  placeholder="Detailed policy content..."
                  required
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setEditing(null)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  Save Policy
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {loading ? (
            <div className="col-span-2 text-center py-20">Loading policies...</div>
          ) : policies.length === 0 ? (
            <div className="col-span-2 text-center py-20 bg-gray-50 rounded-3xl border-2 border-dashed">
              <BookOpen className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">No policies added yet. Start by adding one to train your chatbot.</p>
            </div>
          ) : (
            policies.map(policy => (
              <div key={policy.id} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="font-bold text-lg text-gray-900">{policy.title}</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditing(policy)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(policy.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="mb-4">
                  <p className="text-sm text-gray-600 line-clamp-3">{policy.content}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(Array.isArray(policy.keywords) ? policy.keywords : []).map((k: string, i: number) => (
                    <span key={i} className="text-[10px] bg-gray-100 text-gray-600 px-2 py-1 rounded-md uppercase font-bold">
                      {k}
                    </span>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </AppShell>
  );
}
