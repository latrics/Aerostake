'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import {
  Home,
  FileText,
  Folder,
  Calendar,
  Users,
  CreditCard,
  BarChart3,
  UserCheck,
  FileCheck,
  HelpCircle,
  Settings,
  ChevronDown,
  LogOut,
  User as UserIcon,
} from 'lucide-react';

export default function LatricsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  // Role identification for Ops / Admin
  const isOpsRole = user?.role === 'operations';
  const portalLabel = isOpsRole ? 'OPS Portal' : 'Admin Portal';
  const defaultDisplayName = isOpsRole ? 'Operations Lead' : 'Admin User';
  const defaultEmail = user?.email || (isOpsRole ? 'ops@latrics.com' : 'admin@latrics.com');

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: Home },
    { label: 'Requests', path: '/requests', icon: FileText, badge: 42 },
    { label: 'Projects', path: '/projects', icon: Folder },
    { label: 'Planning', path: '/planning', icon: Calendar },
    { label: 'Resources', path: '/allocations', icon: Users },
    { label: 'Payments', path: '/payments', icon: CreditCard },
    { label: 'Reports', path: '/activity-logs', icon: BarChart3 },
    { label: 'Users', path: '/user-management', icon: UserCheck },
    { label: 'Documents', path: '/documents', icon: FileCheck },
    { label: 'Help Desk', path: '/help-desk', icon: HelpCircle },
    { label: 'Settings', path: '/portal-settings', icon: Settings },
  ];

  return (
    <div className="portal-layout">
      {/* ── Left Sidebar Navigation ── */}
      <aside className="sidebar">
        {/* Brand Header */}
        <div className="sidebar-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                border: '1.5px solid #09090b',
                backgroundColor: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 900,
                fontSize: '1.1rem',
                color: '#09090b',
                flexShrink: 0,
              }}
            >
              ▲
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '1.05rem', fontWeight: 900, letterSpacing: '-0.02em', color: '#09090b', lineHeight: 1.1 }}>
                LATRICS
              </span>
              <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                {portalLabel}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.path || (item.path !== '/dashboard' && pathname.startsWith(item.path + '/'));
            return (
              <Link
                key={item.path}
                href={item.path}
                className={`sidebar-item ${isActive ? 'active' : ''}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  textDecoration: 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <Icon size={16} strokeWidth={isActive ? 2.2 : 1.8} />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span
                    style={{
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      padding: '0.1rem 0.45rem',
                      borderRadius: '10px',
                      backgroundColor: isActive ? '#09090b' : '#f4f4f5',
                      border: '1px solid #d4d4d8',
                      color: isActive ? '#ffffff' : '#09090b',
                    }}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer — User Card & Log out */}
        <div className="sidebar-footer" style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
          {/* User Account Card */}
          <div
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.6rem 0.75rem',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              backgroundColor: '#ffffff',
              cursor: 'pointer',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: '#09090b',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                <UserIcon size={16} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#09090b', lineHeight: 1.2 }}>
                  {defaultDisplayName}
                </span>
                <span style={{ fontSize: '0.675rem', color: 'var(--text-muted)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                  {defaultEmail}
                </span>
              </div>
            </div>
            <ChevronDown size={14} color="#71717a" />
          </div>

          {/* Log Out Button */}
          <button
            onClick={logout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              width: '100%',
              background: 'none',
              border: 'none',
              padding: '0.45rem 0.75rem',
              fontSize: '0.8rem',
              fontWeight: 600,
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              borderRadius: '6px',
              textAlign: 'left',
              transition: 'all 0.15s ease',
            }}
          >
            <LogOut size={15} />
            <span>Log out</span>
          </button>
        </div>
      </aside>

      {/* ── Main Container Viewport ── */}
      <div className="main-container">
        <main className="content-area">{children}</main>
      </div>
    </div>
  );
}
