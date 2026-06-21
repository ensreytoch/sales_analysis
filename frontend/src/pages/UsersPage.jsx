import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Plus, Pencil, Trash2, X, Check, ShieldCheck, ShieldOff } from 'lucide-react';
import Sidebar        from '../components/Sidebar';
import Header         from '../components/Header';
import { useAuth }   from '../context/AuthContext';
import api           from '../services/api';

const EMPTY_FORM = { email: '', full_name: '', password: '', role_id: '', is_active: true, location_id: '' };

function Badge({ active }) {
  return active
    ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700"><Check size={10}/>Active</span>
    : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500"><X size={10}/>Inactive</span>;
}

function Modal({ title, onClose, children }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-800">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition"><X size={18}/></button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

function UserForm({ form, setForm, roles, locations, isEdit, isSelf, submitting, onSubmit, onClose }) {
  const selectedRole = roles.find(r => String(r.id) === String(form.role_id));
  const isCashier    = selectedRole?.name === 'Cashier';
  const field = (label, key, type = 'text', placeholder = '') => (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <input
        type={type}
        value={form[key]}
        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        placeholder={placeholder}
        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
      />
    </div>
  );

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {field('Full Name', 'full_name', 'text', 'Jane Doe')}
      {field('Email', 'email', 'email', 'user@example.com')}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          Password {isEdit && <span className="text-gray-400 font-normal">(leave blank to keep current)</span>}
        </label>
        <input
          type="password"
          value={form.password}
          onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
          placeholder={isEdit ? '••••••••' : 'Min 6 characters'}
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Role</label>
        <select
          value={form.role_id}
          onChange={e => setForm(f => ({ ...f, role_id: e.target.value }))}
          required
          disabled={isSelf}
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition bg-white disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
        >
          <option value="">Select a role…</option>
          {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
        {isSelf && <p className="text-xs text-gray-400 mt-1">Cannot change your own role</p>}
      </div>

      {isCashier && (
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Assigned Location</label>
          <select
            value={form.location_id}
            onChange={e => setForm(f => ({ ...f, location_id: e.target.value }))}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition bg-white"
          >
            <option value="">Select a location…</option>
            {locations.map(l => (
              <option key={l.id} value={l.id}>{l.name} · {l.organization}</option>
            ))}
          </select>
        </div>
      )}
      <div className={`flex items-center justify-between p-3 rounded-xl ${isSelf ? 'bg-gray-100 opacity-50' : 'bg-gray-50'}`}>
        <div>
          <span className="text-sm text-gray-700">Active</span>
          {isSelf && <p className="text-xs text-gray-400">Cannot change your own status</p>}
        </div>
        <button
          type="button"
          disabled={isSelf}
          onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}
          className={`relative inline-flex h-5 w-9 rounded-full transition-colors ${form.is_active ? 'bg-blue-500' : 'bg-gray-300'} ${isSelf ? 'cursor-not-allowed' : ''}`}
        >
          <span className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${form.is_active ? 'translate-x-4' : ''}`}/>
        </button>
      </div>

      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onClose} className="flex-1 px-4 py-2 text-sm border border-gray-200 rounded-xl hover:bg-gray-50 transition">Cancel</button>
        <button
          type="submit"
          disabled={submitting}
          className="flex-1 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition"
        >
          {submitting ? 'Saving…' : isEdit ? 'Save Changes' : 'Create User'}
        </button>
      </div>
    </form>
  );
}

export default function UsersPage() {
  const { user: me } = useAuth();
  const [users,      setUsers]      = useState([]);
  const [roles,      setRoles]      = useState([]);
  const [locations,  setLocations]  = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [modal,      setModal]      = useState(null); // null | 'create' | 'edit' | 'delete'
  const [selected,   setSelected]   = useState(null);
  const [form,       setForm]       = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState('');

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([api.get('/users'), api.get('/roles'), api.get('/locations')])
      .then(([u, r, l]) => { setUsers(u.data); setRoles(r.data); setLocations(l.data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setForm(EMPTY_FORM); setError(''); setModal('create'); };
  const openEdit   = (u) => {
    setSelected(u);
    setForm({ email: u.email, full_name: u.full_name || '', password: '', role_id: String(u.role_id || ''), is_active: u.is_active, location_id: String(u.location_id || '') });
    setError('');
    setModal('edit');
  };
  const openDelete = (u) => { setSelected(u); setModal('delete'); };
  const close      = () => { setModal(null); setSelected(null); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      if (modal === 'create') {
        const payload = { ...form };
        if (!payload.password) { setError('Password is required'); setSubmitting(false); return; }
        await api.post('/users', payload);
      } else {
        const payload = { ...form };
        if (!payload.password) delete payload.password;
        await api.put(`/users/${selected.id}`, payload);
      }
      close();
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setSubmitting(true);
    try {
      await api.delete(`/users/${selected.id}`);
      close();
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />

        <main className="flex-1 overflow-y-auto p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-base font-semibold text-gray-800">Users</h2>
              <p className="text-xs text-gray-400 mt-0.5">Manage system accounts and roles</p>
            </div>
            <button
              onClick={openCreate}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition"
            >
              <Plus size={15}/> Add User
            </button>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-20 text-gray-400 text-sm">Loading…</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Email</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Role</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Location</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Created</th>
                    <th className="px-5 py-3"/>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {users.map(u => (
                    <tr key={u.id} className="hover:bg-gray-50 transition">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold shrink-0">
                            {(u.full_name || u.email).charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium text-gray-800">{u.full_name || '—'}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-gray-500">{u.email}</td>
                      <td className="px-5 py-3.5">
                        <span className="px-2 py-0.5 rounded-lg text-xs font-medium bg-blue-50 text-blue-700">{u.role_name}</span>
                      </td>
                      <td className="px-5 py-3.5 text-gray-500 text-xs">{u.location_name || <span className="text-gray-300">—</span>}</td>
                      <td className="px-5 py-3.5"><Badge active={u.is_active}/></td>
                      <td className="px-5 py-3.5 text-gray-400 text-xs">{new Date(u.created_at).toLocaleDateString()}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => openEdit(u)} className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition"><Pencil size={14}/></button>
                          {u.id !== me?.userId && (
                            <button onClick={() => openDelete(u)} className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition"><Trash2 size={14}/></button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr><td colSpan={6} className="text-center py-12 text-gray-400 text-sm">No users found</td></tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </main>
      </div>

      {(modal === 'create' || modal === 'edit') && (
        <Modal title={modal === 'create' ? 'Add User' : 'Edit User'} onClose={close}>
          {error && <p className="mb-4 text-xs text-rose-600 bg-rose-50 rounded-xl px-3 py-2">{error}</p>}
          <UserForm
            form={form} setForm={setForm}
            roles={roles} locations={locations}
            isEdit={modal === 'edit'}
            isSelf={selected?.id === me?.userId}
            submitting={submitting}
            onSubmit={handleSubmit} onClose={close}
          />
        </Modal>
      )}

      {modal === 'delete' && (
        <Modal title="Delete User" onClose={close}>
          <p className="text-sm text-gray-600 mb-1">
            Are you sure you want to delete <span className="font-semibold text-gray-800">{selected?.full_name || selected?.email}</span>?
          </p>
          <p className="text-xs text-gray-400 mb-5">This action cannot be undone.</p>
          {error && <p className="mb-4 text-xs text-rose-600 bg-rose-50 rounded-xl px-3 py-2">{error}</p>}
          <div className="flex gap-3">
            <button onClick={close} className="flex-1 px-4 py-2 text-sm border border-gray-200 rounded-xl hover:bg-gray-50 transition">Cancel</button>
            <button
              onClick={handleDelete}
              disabled={submitting}
              className="flex-1 px-4 py-2 text-sm font-medium bg-rose-600 text-white rounded-xl hover:bg-rose-700 disabled:opacity-50 transition"
            >
              {submitting ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
