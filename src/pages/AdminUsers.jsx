import React, { useEffect, useState } from 'react';
import api from '../lib/api';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('lecturer');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  async function load() {
    try {
      const res = await api.get('/users');
      setUsers(Array.isArray(res.data) ? res.data : []);
    } catch {
      setUsers([]);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleCreate(e) {
    e && e.preventDefault();
    if (!email) return alert('Enter email');
    setLoading(true);
    try {
      const res = await api.post('/users', { email, name, role });
      const created = res.data || { id: `local-${Date.now()}`, email, name, role };
      setUsers(prev => [created, ...prev]);
      setEmail(''); setName('');
    } catch (err) {
      // fallback: create local stub user
      const created = { id: `local-${Date.now()}`, email, name, role };
      setUsers(prev => [created, ...prev]);
      setEmail(''); setName('');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-4">
      <h2 className="text-lg font-semibold mb-3">Manage Users</h2>

      <form onSubmit={handleCreate} className="mb-4 space-y-2">
        <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" className="w-full border px-3 py-2 rounded" />
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Full name" className="w-full border px-3 py-2 rounded" />
        <select value={role} onChange={e => setRole(e.target.value)} className="w-full border px-3 py-2 rounded">
          <option value="lecturer">Lecturer</option>
          <option value="admin">Admin</option>
          <option value="student">Student</option>
        </select>
        <div>
          <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded">{loading ? 'Creating...' : 'Create user'}</button>
        </div>
      </form>

      <div>
        <h3 className="font-medium mb-2">Existing users</h3>
        {users.length === 0 ? <div className="text-sm text-gray-500">No users yet</div> : (
          <div className="space-y-2">
            {users.map(u => (
              <div key={u.id || u.email} className="p-2 border rounded flex justify-between items-center">
                <div>
                  <div className="font-medium">{u.name || u.email}</div>
                  <div className="text-sm text-gray-600">{u.email} • {u.role}</div>
                </div>
                <div className="text-sm text-gray-500">{u.id?.toString().slice(0,8)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

