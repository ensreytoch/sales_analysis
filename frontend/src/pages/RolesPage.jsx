import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, Shield, X, Check, ChevronDown, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import Header  from '../components/Header';
import api from '../services/api';

const SYSTEM_ROLES = ['Admin', 'Viewer', 'Cashier'];

const PERMISSION_GROUPS = [
  { label: 'Dashboard',       prefix: 'dashboard' },
  { label: 'Sales (POS)',     prefix: 'sales' },
  { label: 'Transactions',    prefix: 'transactions' },
  { label: 'Invoices',        prefix: 'invoices' },
  { label: 'Inventory',       prefix: 'products' },
  { label: 'Product Catalog', prefix: 'product-configs' },
  { label: 'Users',           prefix: 'users' },
  { label: 'Roles',           prefix: 'roles' },
  { label: 'Menus',           prefix: 'menus' },
];

const ROLE_COLORS = {
  Admin:   { badge: 'bg-violet-100 text-violet-700 border-violet-200', dot: 'bg-violet-400' },
  Viewer:  { badge: 'bg-blue-100 text-blue-700 border-blue-200',       dot: 'bg-blue-400' },
  Cashier: { badge: 'bg-amber-100 text-amber-700 border-amber-200',    dot: 'bg-amber-400' },
};
const DEFAULT_COLOR = { badge: 'bg-gray-100 text-gray-700 border-gray-200', dot: 'bg-gray-400' };

function ActionBadge({ action }) {
  return (
    <span className={`px-1.5 py-0.5 rounded text-xs font-semibold
      ${action === 'write' ? 'bg-amber-100 text-amber-700' : 'bg-blue-50 text-blue-600'}`}>
      {action}
    </span>
  );
}

function Checkbox({ checked, indeterminate, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition
        ${checked       ? 'bg-indigo-600 border-indigo-600' :
          indeterminate ? 'bg-indigo-100 border-indigo-400' :
                          'border-gray-300 bg-white hover:border-indigo-300'}`}>
      {checked       && <Check size={11} className="text-white" strokeWidth={3}/>}
      {indeterminate && !checked && <div className="w-2 h-0.5 bg-indigo-500 rounded"/>}
    </button>
  );
}

function RoleModal({ role, allPermissions, onSave, onClose, saving, error }) {
  const [name,        setName]        = useState(role?.name        || '');
  const [description, setDescription] = useState(role?.description || '');
  const [selected,    setSelected]    = useState(
    new Set((role?.permissions || []).map(p => p.id))
  );

  const isEdit   = !!role;
  const isSystem = isEdit && SYSTEM_ROLES.includes(role.name);

  useEffect(() => {
    const h = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  const toggle = (id) =>
    setSelected(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

  const toggleGroup = (ids) => {
    const allOn = ids.every(id => selected.has(id));
    setSelected(prev => {
      const s = new Set(prev);
      if (allOn) ids.forEach(id => s.delete(id));
      else       ids.forEach(id => s.add(id));
      return s;
    });
  };

  const grouped = PERMISSION_GROUPS.map(g => ({
    ...g,
    perms: allPermissions.filter(p => p.code.startsWith(g.prefix + ':')),
  })).filter(g => g.perms.length > 0);

  const totalSelected = selected.size;
  const totalPerms    = allPermissions.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="bg-gradient-to-br from-indigo-600 to-indigo-500 px-6 py-5 shrink-0">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-white font-bold text-base">{isEdit ? 'Edit Role' : 'Create Role'}</p>
              <p className="text-indigo-200 text-xs mt-0.5">
                {isSystem ? 'System role — only permissions can be changed' : isEdit ? 'Modify name, description & permissions' : 'Set up a new role with access permissions'}
              </p>
            </div>
            <button onClick={onClose} className="text-indigo-200 hover:text-white mt-0.5"><X size={18}/></button>
          </div>

          {/* Name + Description inline in header */}
          {!isSystem && (
            <div className="grid grid-cols-2 gap-2 mt-4">
              <input value={name} onChange={e => setName(e.target.value)}
                placeholder="Role name"
                className="bg-white/20 border border-white/30 text-white placeholder-indigo-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:bg-white/30 focus:border-white/60"/>
              <input value={description} onChange={e => setDescription(e.target.value)}
                placeholder="Short description"
                className="bg-white/20 border border-white/30 text-white placeholder-indigo-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:bg-white/30 focus:border-white/60"/>
            </div>
          )}
          {isSystem && (
            <div className="mt-3 bg-white/10 rounded-xl px-3 py-2 text-sm text-indigo-100">{role.name}</div>
          )}
        </div>

        {/* Permissions body */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-2">
          {error && <p className="text-sm text-red-500 bg-red-50 rounded-xl px-3 py-2 mb-3">{error}</p>}

          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Permissions</p>
            <span className="text-xs text-indigo-600 font-semibold bg-indigo-50 px-2 py-0.5 rounded-full">
              {totalSelected} / {totalPerms} selected
            </span>
          </div>

          {grouped.map(g => {
            const ids     = g.perms.map(p => p.id);
            const allOn   = ids.every(id => selected.has(id));
            const someOn  = ids.some(id => selected.has(id));

            return (
              <div key={g.prefix} className="rounded-2xl border border-gray-100 overflow-hidden">
                {/* Group header */}
                <button
                  onClick={() => toggleGroup(ids)}
                  className="flex items-center gap-3 w-full px-4 py-2.5 bg-gray-50 hover:bg-gray-100/80 transition text-left"
                >
                  <Checkbox checked={allOn} indeterminate={someOn && !allOn} onClick={() => toggleGroup(ids)}/>
                  <span className="text-xs font-bold text-gray-600 uppercase tracking-wide flex-1">{g.label}</span>
                  <span className="text-xs text-gray-400">
                    {ids.filter(id => selected.has(id)).length}/{ids.length}
                  </span>
                </button>

                {/* Permission items — 2-column grid */}
                <div className="grid grid-cols-2 gap-px bg-gray-100">
                  {g.perms.map(p => {
                    const action = p.code.split(':')[1];
                    const isOn   = selected.has(p.id);
                    return (
                      <button
                        key={p.id}
                        onClick={() => toggle(p.id)}
                        className={`flex items-center gap-3 px-4 py-3 text-left transition
                          ${isOn ? 'bg-indigo-50' : 'bg-white hover:bg-gray-50'}`}
                      >
                        <Checkbox checked={isOn} onClick={() => toggle(p.id)}/>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-medium text-gray-700 truncate">{p.name}</span>
                            <span className={`shrink-0 px-1.5 py-0.5 rounded text-xs font-bold
                              ${action === 'write' ? 'bg-amber-100 text-amber-600' : 'bg-blue-50 text-blue-500'}`}>
                              {action}
                            </span>
                          </div>
                          <p className="text-xs text-gray-400 font-mono truncate">{p.code}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-100 flex gap-3 shrink-0 bg-gray-50/60">
          <button onClick={onClose}
            className="flex-1 py-2.5 text-sm border border-gray-200 rounded-2xl hover:bg-white transition font-medium text-gray-600">
            Cancel
          </button>
          <button onClick={() => onSave({ name, description, permission_ids: [...selected] })} disabled={saving}
            className="flex-1 py-2.5 text-sm font-semibold bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 disabled:opacity-50 transition shadow-sm shadow-indigo-200">
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Role'}
          </button>
        </div>
      </div>
    </div>
  );
}

function RoleRow({ role, canWrite, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const isSystem = SYSTEM_ROLES.includes(role.name);
  const colors   = ROLE_COLORS[role.name] || DEFAULT_COLOR;

  const permGroups = PERMISSION_GROUPS.map(g => ({
    ...g,
    perms: role.permissions.filter(p => p.code.startsWith(g.prefix + ':')),
  })).filter(g => g.perms.length > 0);

  return (
    <>
      <tr
        className="hover:bg-gray-50/60 transition cursor-pointer"
        onClick={() => setExpanded(e => !e)}
      >
        {/* Role */}
        <td className="px-4 py-3.5">
          <div className="flex items-center gap-2.5">
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${colors.badge}`}>
              {role.name}
            </span>
            {isSystem && (
              <span className="px-1.5 py-0.5 rounded text-xs bg-gray-100 text-gray-400 font-medium">System</span>
            )}
          </div>
        </td>

        {/* Description */}
        <td className="px-4 py-3.5 text-sm text-gray-500">
          {role.description || <span className="text-gray-300 italic">—</span>}
        </td>

        {/* Permissions summary */}
        <td className="px-4 py-3.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-600">{role.permissions.length}</span>
            <span className="text-xs text-gray-400">permissions</span>
            <div className="flex gap-1 ml-1">
              {permGroups.slice(0, 4).map(g => (
                <span key={g.prefix} className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600 text-xs font-medium">
                  {g.label}
                </span>
              ))}
              {permGroups.length > 4 && (
                <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 text-xs">+{permGroups.length - 4}</span>
              )}
            </div>
          </div>
        </td>

        {/* Actions */}
        <td className="px-4 py-3.5">
          <div className="flex items-center gap-1 justify-end">
            {canWrite && (
              <>
                <button
                  onClick={e => { e.stopPropagation(); onEdit(role); }}
                  title="Edit role"
                  className="p-1.5 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition">
                  <Pencil size={14}/>
                </button>
                {!isSystem && (
                  <button
                    onClick={e => { e.stopPropagation(); onDelete(role); }}
                    title="Delete role"
                    className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition">
                    <Trash2 size={14}/>
                  </button>
                )}
              </>
            )}
            <span className="ml-1 text-gray-300">
              {expanded ? <ChevronDown size={14}/> : <ChevronRight size={14}/>}
            </span>
          </div>
        </td>
      </tr>

      {/* Expanded permission detail */}
      {expanded && (
        <tr>
          <td colSpan={4} className="px-0 pb-0">
            <div className="mx-4 mb-3 bg-gray-50 rounded-2xl p-4">
              {permGroups.length === 0 ? (
                <p className="text-xs text-gray-400 italic">No permissions assigned</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {permGroups.map(g => (
                    <div key={g.prefix} className="bg-white rounded-xl px-3 py-2.5 border border-gray-100">
                      <p className="text-xs font-semibold text-gray-500 mb-2">{g.label}</p>
                      <div className="flex flex-wrap gap-1">
                        {g.perms.map(p => (
                          <ActionBadge key={p.id} action={p.code.split(':')[1]}/>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export default function RolesPage() {
  const { user }  = useAuth();
  const canWrite  = user?.permissions?.includes('roles:write');

  const [roles,       setRoles]      = useState([]);
  const [permissions, setPermissions]= useState([]);
  const [loading,     setLoading]    = useState(true);

  const [modal,       setModal]      = useState(null);
  const [target,      setTarget]     = useState(null);
  const [saving,      setSaving]     = useState(false);
  const [modalError,  setModalError] = useState('');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [rRes, pRes] = await Promise.all([
        api.get('/roles'),
        api.get('/roles/permissions'),
      ]);
      setRoles(rRes.data);
      setPermissions(pRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, []);

  const openAdd  = () => { setTarget(null); setModalError(''); setModal('add'); };
  const openEdit = (r) => { setTarget(r);   setModalError(''); setModal('edit'); };

  const handleSave = async ({ name, description, permission_ids }) => {
    setModalError('');
    if (!target && !name) return setModalError('Role name is required.');
    setSaving(true);
    try {
      if (modal === 'add') {
        await api.post('/roles', { name, description, permission_ids });
      } else {
        await api.put(`/roles/${target.id}`, { name, description, permission_ids });
      }
      setModal(null);
      fetchAll();
    } catch (err) {
      setModalError(err.response?.data?.error || 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (r) => {
    if (!window.confirm(`Delete role "${r.name}"?`)) return;
    try {
      await api.delete(`/roles/${r.id}`);
      fetchAll();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete role.');
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden min-h-0">
        <Header loading={loading} onRefresh={fetchAll}/>

        <main className="flex-1 flex flex-col overflow-hidden p-6 gap-4 min-h-0">

          {/* Page header */}
          <div className="flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center">
                <Shield size={16} className="text-white"/>
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">Roles & Permissions</h1>
                <p className="text-xs text-gray-400">{roles.length} roles</p>
              </div>
            </div>
            {canWrite && (
              <button onClick={openAdd}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition shadow-sm shadow-indigo-200">
                <Plus size={15}/> Create Role
              </button>
            )}
          </div>

          {/* Table */}
          <div className="flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col min-h-0">
            <div className="overflow-auto flex-1">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-gray-50 border-b border-gray-100 z-10">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide w-40">Role</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Description</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Permissions</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wide w-28">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {loading ? (
                    <tr><td colSpan={4} className="py-16 text-center text-gray-300 text-sm">Loading…</td></tr>
                  ) : roles.length === 0 ? (
                    <tr><td colSpan={4} className="py-16 text-center text-gray-400 text-sm">No roles found</td></tr>
                  ) : roles.map(r => (
                    <RoleRow
                      key={r.id}
                      role={r}
                      canWrite={canWrite}
                      onEdit={openEdit}
                      onDelete={handleDelete}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>

      {modal && (
        <RoleModal
          role={modal === 'edit' ? target : null}
          allPermissions={permissions}
          onSave={handleSave}
          onClose={() => setModal(null)}
          saving={saving}
          error={modalError}
        />
      )}
    </div>
  );
}
