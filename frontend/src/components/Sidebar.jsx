import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Settings, Users, Shield,
  ShoppingCart, ClipboardList, FileText, Package,
  ChevronDown, ChevronRight, LogOut,
  TrendingUp, Archive, Tag
} from 'lucide-react';

const ICONS = {
  LayoutDashboard,
  Settings,
  Users,
  Shield,
  ShoppingCart,
  ClipboardList,
  FileText,
  Package,
  TrendingUp,
  Archive,
  Tag,
};

function MenuItem({ item, depth = 0 }) {
  const { pathname } = useLocation();
  const hasChildren = item.children?.length > 0;
  const isChildActive = hasChildren && item.children.some(c => pathname.startsWith(c.path || ''));
  const [open, setOpen] = useState(isChildActive);
  const Icon = ICONS[item.icon] || LayoutDashboard;
  if (hasChildren) {
    return (
      <li>
        <button
          onClick={() => setOpen(o => !o)}
          className="flex items-center justify-between w-full px-3 py-2 rounded-lg text-sm text-gray-300 hover:bg-gray-700 transition"
          style={{ paddingLeft: `${12 + depth * 16}px` }}
        >
          <span className="flex items-center gap-2">
            <Icon size={16} />
            {item.label}
          </span>
          {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>
        {open && (
          <ul>
            {item.children.map(child => (
              <MenuItem key={child.id} item={child} depth={depth + 1} />
            ))}
          </ul>
        )}
      </li>
    );
  }

  return (
    <li>
      <NavLink
        to={item.path || '#'}
        className={({ isActive }) =>
          `flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition ${
            isActive
              ? 'bg-blue-600 text-white'
              : 'text-gray-300 hover:bg-gray-700'
          }`
        }
        style={{ paddingLeft: `${12 + depth * 16}px` }}
      >
        <Icon size={16} />
        {item.label}
      </NavLink>
    </li>
  );
}

export default function Sidebar() {
  const { user, menu, logout } = useAuth();

  return (
    <div className="flex flex-col w-56 min-h-screen bg-gray-800 text-white">
      <div className="px-4 py-5 border-b border-gray-700">
        <h1 className="text-lg font-bold">Sundery BI</h1>
        <p className="text-xs text-gray-400 mt-0.5">{user?.roleName}</p>
      </div>

      <nav className="flex-1 px-2 py-3 overflow-y-auto">
        <ul className="space-y-1">
          {menu.map(item => (
            <MenuItem key={item.id} item={item} />
          ))}
        </ul>
      </nav>

      <div className="px-4 py-3 border-t border-gray-700">
        <p className="text-xs text-gray-400 truncate mb-2">{user?.email}</p>
        <button
          onClick={logout}
          className="flex items-center gap-2 text-sm text-gray-300 hover:text-white transition"
        >
          <LogOut size={14} /> Sign out
        </button>
      </div>
    </div>
  );
}
