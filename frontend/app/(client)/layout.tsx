'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import WireframeBox from '@/components/WireframeBox';
import {
  Folder,
  FileText,
  CreditCard,
  Files,
  HelpCircle,
  Settings,
  Bell,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from 'lucide-react';

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isOrgDropdownOpen, setIsOrgDropdownOpen] = useState(false);

  const menuItems = [
    { label: 'Dashboard', path: '/dashboard', icon: Folder },
    { label: 'Projects', path: '/projects', icon: Folder },
    { label: 'Requests', path: '/requests', icon: FileText },
    { label: 'Activity & Logs', path: '/activity-logs', icon: FileText },
    { label: 'Payments', path: '/payments', icon: CreditCard },
    { label: 'Documents', path: '/documents', icon: Files },
    { label: 'Help Desk', path: '/help-desk', icon: HelpCircle },
    { label: 'Settings', path: '/settings', icon: Settings },
  ];

  const getPageTitle = () => {
    const matched = menuItems.find((item) => pathname.startsWith(item.path));
    return matched ? matched.label : 'Dashboard';
  };

  return (
    <div className="portal-layout">
      {/* ── Sidebar Navigation ── */}
      <aside
        className="sidebar"
        style={{
          width: isCollapsed ? '72px' : '240px',
          transition: 'width 0.2s ease',
        }}
      >
        {/* Sidebar Brand Header */}
        <div className="sidebar-header" style={{ padding: isCollapsed ? '1rem 0.5rem' : '1.25rem' }}>
          <WireframeBox width={34} height={34} style={{ borderRadius: '4px', flexShrink: 0 }} />
          {!isCollapsed && (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.95rem', fontWeight: 800, letterSpacing: '0.04em', lineHeight: 1.2 }}>
                LATRICS
              </span>
              <span style={{ fontSize: '0.725rem', color: 'var(--text-secondary)' }}>
                Client Portal
              </span>
            </div>
          )}
        </div>

        {/* Sidebar Navigation Items */}
        <nav className="sidebar-nav" style={{ padding: isCollapsed ? '1rem 0.5rem' : '1rem 0.75rem' }}>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.path ||
              (item.path !== '/dashboard' && pathname.startsWith(item.path + '/'));

            return (
              <Link
                key={item.path}
                href={item.path}
                className={`sidebar-item ${isActive ? 'active' : ''}`}
                style={{
                  justifyContent: isCollapsed ? 'center' : 'flex-start',
                  padding: isCollapsed ? '0.65rem 0' : '0.55rem 0.85rem',
                }}
                title={isCollapsed ? item.label : undefined}
              >
                <Icon size={18} strokeWidth={isActive ? 2.2 : 1.75} />
                {!isCollapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer Organization Badge & Collapse Toggle */}
        <div className="sidebar-footer" style={{ padding: isCollapsed ? '0.75rem 0.5rem' : '1rem' }}>
          {!isCollapsed ? (
            <>
              <div
                onClick={() => setIsOrgDropdownOpen(!isOrgDropdownOpen)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.5rem',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  backgroundColor: '#ffffff',
                  position: 'relative',
                }}
              >
                <WireframeBox width={28} height={28} style={{ borderRadius: '4px', flexShrink: 0 }} />
                <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, overflow: 'hidden' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                    Acme Industries
                  </span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                    Client Admin
                  </span>
                </div>
                <ChevronDown size={14} color="#71717a" />
              </div>

              {isOrgDropdownOpen && (
                <div
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    padding: '0.35rem',
                    boxShadow: 'var(--shadow-md)',
                  }}
                >
                  <button
                    onClick={logout}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      width: '100%',
                      padding: '0.4rem 0.6rem',
                      background: 'none',
                      border: 'none',
                      fontSize: '0.8rem',
                      color: '#09090b',
                      cursor: 'pointer',
                      borderRadius: '4px',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f4f4f5')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <LogOut size={14} /> Sign Out
                  </button>
                </div>
              )}

              <button
                onClick={() => setIsCollapsed(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  background: 'none',
                  border: 'none',
                  fontSize: '0.775rem',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  padding: '0.25rem 0',
                }}
              >
                <ChevronLeft size={14} /> Collapse
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsCollapsed(false)}
              style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '0.5rem 0',
                color: 'var(--text-secondary)',
              }}
              title="Expand Sidebar"
            >
              <ChevronRight size={18} />
            </button>
          )}
        </div>
      </aside>

      {/* ── Main Content Viewport ── */}
      <div className="main-container">
        {/* Top Header Bar */}
        <header className="top-bar">
          <h1 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#09090b' }}>
            {getPageTitle()}
          </h1>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            {/* Notification Bell with Unread Dot */}
            <div style={{ position: 'relative', cursor: 'pointer' }} title="Notifications">
              <Bell size={20} color="#09090b" />
              <span
                style={{
                  position: 'absolute',
                  top: '-2px',
                  right: '-2px',
                  width: '7px',
                  height: '7px',
                  backgroundColor: '#09090b',
                  borderRadius: '50%',
                }}
              />
            </div>

            {/* User Profile Capsule */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  border: '1px solid #09090b',
                  backgroundColor: '#fafafa',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                }}
              >
                JD
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.825rem', fontWeight: 700, lineHeight: 1.2 }}>
                  John Doe
                </span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                  Acme Industries
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="content-area animate-fade-in">{children}</main>
      </div>
    </div>
  );
}
