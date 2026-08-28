'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { getAllowedNavigation } from '@/lib/role';

export default function LatricsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user, logout, loading } = useAuth();

  const allowedNav = getAllowedNavigation(user?.role);

  const getPageTitle = () => {
    const matched = allowedNav.find((item) => pathname.startsWith(item.path));
    return matched ? matched.label : 'Latrics Operations';
  };

  return (
    <div className="portal-layout">
      {/* Sidebar navigation */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <span style={{ color: '#7c3aed' }}>▲</span> AEROSTAKE <span style={{ fontSize: '0.65rem', padding: '0.15rem 0.35rem', background: '#242c42', borderRadius: '4px', verticalAlign: 'middle' }}>OPS</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {allowedNav.map((item) => {
            const isActive = pathname === item.path || pathname.startsWith(item.path + '/');
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
            Operations Portal
          </div>
        </header>

        <main className="content-area animate-fade-in">{children}</main>
      </div>
    </div>
  );
}
