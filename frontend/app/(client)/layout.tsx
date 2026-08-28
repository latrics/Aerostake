'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user, logout, loading } = useAuth();

  const menuItems = [
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'My Projects', path: '/projects' },
    { label: 'Help Desk', path: '/help-desk' },
  ];

  const getPageTitle = () => {
    const matched = menuItems.find((item) => pathname.startsWith(item.path));
    return matched ? matched.label : 'Client Portal';
  };

  return (
    <div className="portal-layout">
      {/* Sidebar navigation */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <span style={{ color: '#3b82f6' }}>▲</span> AEROSTAKE
          </div>
        </div>

        <nav className="sidebar-nav">
          {menuItems.map((item) => {
            const isActive = pathname === item.path || (item.path !== '/dashboard' && pathname.startsWith(item.path + '/'));
            return (
              <Link
                key={item.path}
                href={item.path}
                className={`sidebar-item ${isActive ? 'active' : ''}`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          {!loading && user && (
            <div className="user-badge">
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: 'var(--brand-gradient)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                }}
              >
                {user.email.substring(0, 2).toUpperCase()}
              </div>
              <div className="user-badge-info">
                <span className="user-badge-name">{user.email.split('@')[0]}</span>
                <span className="user-badge-role">{user.role}</span>
              </div>
            </div>
          )}
          <button
            onClick={logout}
            className="btn btn-secondary btn-block"
            style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
          >
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content viewport */}
      <div className="main-container">
        <header className="top-bar">
          <div className="page-title">{getPageTitle()}</div>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Client Workspace
          </div>
        </header>

        <main className="content-area animate-fade-in">{children}</main>
      </div>
    </div>
  );
}
