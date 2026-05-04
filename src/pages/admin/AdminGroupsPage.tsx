import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Users } from 'lucide-react';
import { AppShell } from '../../components/layout/AppShell.tsx';
import { groupApi, adminApi } from '../../services/api.ts';
import { toast } from 'react-hot-toast';

export function AdminGroupsPage() {
  const [groups, setGroups] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [instructors, setInstructors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [g, c, u] = await Promise.all([
        groupApi.getGroups(),
        adminApi.getCourses(),
        adminApi.getUsers('faculty')
      ]);
      setGroups(g);
      setCourses(c);
      setInstructors(u);
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editing.id) {
        await groupApi.updateGroup(editing.id, editing);
        toast.success('Group updated');
      } else {
        await groupApi.createGroup(editing);
        toast.success('Group created');
      }
      setEditing(null);
      loadData();
    } catch (error) {
      toast.error('Failed to save group');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure?')) return;
    try {
      await groupApi.deleteGroup(id);
      toast.success('Group deleted');
      loadData();
    } catch (error) {
      toast.error('Failed to delete group');
    }
  };

  return (
    <AppShell title="Manage Groups">
      <div className="max-w-6xl mx-auto py-8">
        <div className="flex justify-between items-center mb-8 px-4">
          <h1 className="text-2xl font-bold">Groups Management</h1>
          <button
            onClick={() => setEditing({ name: '', courseId: '', instructorId: '' })}
            className="bg-blue-600 text-white px-4 py-2 rounded-xl flex items-center gap-2"
          >
            <Plus className="h-5 w-5" />
            Create Group
          </button>
        </div>

        {editing && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md">
              <h2 className="text-xl font-bold mb-4">{editing.id ? 'Edit Group' : 'New Group'}</h2>
              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Group Name</label>
                  <input
                    type="text"
                    value={editing.name}
                    onChange={e => setEditing({ ...editing, name: e.target.value })}
                    className="w-full p-2 border rounded-lg"
                    placeholder="e.g. Group A"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Course</label>
                  <select
                    value={editing.courseId}
                    onChange={e => setEditing({ ...editing, courseId: e.target.value })}
                    className="w-full p-2 border rounded-lg"
                    required
                  >
                    <option value="">Select Course</option>
                    {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Instructor</label>
                  <select
                    value={editing.instructorId}
                    onChange={e => setEditing({ ...editing, instructorId: e.target.value })}
                    className="w-full p-2 border rounded-lg"
                    required
                  >
                    <option value="">Select Instructor</option>
                    {instructors.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                  </select>
                </div>
                <div className="flex gap-2 pt-4">
                  <button type="button" onClick={() => setEditing(null)} className="flex-1 py-2 bg-gray-100 rounded-lg">Cancel</button>
                  <button type="submit" className="flex-1 py-2 bg-blue-600 text-white rounded-lg">Save</button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="p-4 font-bold text-sm">Group Name</th>
                <th className="p-4 font-bold text-sm">Course</th>
                <th className="p-4 font-bold text-sm">Instructor</th>
                <th className="p-4 font-bold text-sm text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {groups.map(group => {
                const course = courses.find(c => c.id === group.courseId);
                const instructor = instructors.find(i => i.id === group.instructorId);
                return (
                  <tr key={group.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600">
                          <Users className="h-4 w-4" />
                        </div>
                        <span className="font-medium">{group.name}</span>
                      </div>
                    </td>
                    <td className="p-4 text-sm text-gray-600">{course?.name || 'N/A'}</td>
                    <td className="p-4 text-sm text-gray-600">{instructor?.name || 'N/A'}</td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => setEditing(group)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit2 className="h-4 w-4" /></button>
                        <button onClick={() => handleDelete(group.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {groups.length === 0 && !loading && <div className="p-20 text-center text-gray-400">No groups found.</div>}
        </div>
      </div>
    </AppShell>
  );
}
