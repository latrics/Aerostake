'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { requestApi } from '@/modules/requests/api';
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
  const [requestCount, setRequestCount] = useState<number | undefined>(undefined);

  useEffect(() => {
    async function fetchCount() {
      try {
        const reqs = await requestApi.listAllRequests();
        setRequestCount(reqs ? reqs.length : 0);
      } catch {
        setRequestCount(0);
      }
    }
    fetchCount();
  }, [pathname]);

  // Role & Identity identification sourced from real authenticated user object
  const userRole = user?.role?.toLowerCase();
  const isAdminRole = userRole === 'admin';
  const isOpsRole = userRole === 'operations';
  const isPilotRole = userRole === 'pilot';

  const portalLabel = isAdminRole ? 'Admin Portal' : isOpsRole ? 'OPS Portal' : isPilotRole ? 'Pilot Portal' : 'Latrics Portal';
  const displayName = user?.full_name || (isAdminRole ? 'Admin' : isOpsRole ? 'Ops User' : user?.email?.split('@')[0] || 'Staff User');
  const teamLabel = isAdminRole ? 'Platform Admin' : isOpsRole ? 'Operations Team' : isPilotRole ? 'Flight Operations' : 'Latrics Team';
  const displayEmail = user?.email || (isAdminRole ? 'admin@latrics.com' : 'ops@latrics.com');

  const [isCollapsed, setIsCollapsed] = useState(false);

  const allNavItems = [
    { label: 'Dashboard', path: '/dashboard', icon: Home, roles: ['admin', 'operations'] },
    { label: 'Requests', path: '/requests', icon: FileText, badge: requestCount !== undefined && requestCount > 0 ? requestCount : undefined, roles: ['admin', 'operations'] },
    { label: 'Projects', path: '/projects', icon: Folder, roles: ['admin', 'operations'] },
    { label: 'Planning', path: '/planning', icon: Calendar, roles: ['admin', 'operations'] },
    { label: 'Resources', path: '/allocations', icon: Users, roles: ['admin', 'operations'] },
    { label: 'Payments', path: '/payments', icon: CreditCard, roles: ['admin', 'operations'] },
    { label: 'Reports', path: '/activity-logs', icon: BarChart3, roles: ['admin', 'operations'] },
    { label: 'Users', path: '/user-management', icon: UserCheck, roles: ['admin', 'operations'] },
    { label: 'Documents', path: '/documents', icon: FileCheck, roles: ['admin', 'operations'] },
    { label: 'Help Desk', path: '/help-desk', icon: HelpCircle, roles: ['admin', 'operations'] },
    { label: 'Settings', path: '/portal-settings', icon: Settings, roles: ['admin', 'operations'] },
  ];

  const navItems = allNavItems.filter((item) => !item.roles || item.roles.includes(userRole || 'admin'));

  return (
    <div className="portal-layout">
      {/* ── Left Sidebar Navigation ── */}
      <aside
        className="sidebar"
        style={{
          width: isCollapsed ? '72px' : '240px',
          minWidth: isCollapsed ? '72px' : '240px',
          transition: 'width 0.2s ease, min-width 0.2s ease',
        }}
      >
        {/* Brand Header */}
        <div className="sidebar-header" style={{ padding: isCollapsed ? '1rem 0.5rem' : '1.25rem' }}>
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
            {!isCollapsed && (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '1.05rem', fontWeight: 900, letterSpacing: '-0.02em', color: '#09090b', lineHeight: 1.1 }}>
                  LATRICS
                </span>
                <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  {portalLabel}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="sidebar-nav" style={{ padding: isCollapsed ? '1rem 0.5rem' : '1rem 0.75rem' }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.path || (item.path !== '/dashboard' && pathname.startsWith(item.path + '/'));
            return (
              <Link
                key={item.path}
                href={item.path}
                className={`sidebar-item ${isActive ? 'active' : ''}`}
                title={isCollapsed ? item.label : undefined}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: isCollapsed ? 'center' : 'space-between',
                  textDecoration: 'none',
                  padding: isCollapsed ? '0.65rem 0' : '0.55rem 0.85rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <Icon size={16} strokeWidth={isActive ? 2.2 : 1.8} />
                  {!isCollapsed && <span>{item.label}</span>}
                </div>
                {!isCollapsed && item.badge !== undefined && (
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
        <div className="sidebar-footer" style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', padding: isCollapsed ? '0.75rem 0.5rem' : '1rem' }}>
          {/* User Account Card */}
          <div
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: isCollapsed ? 'center' : 'space-between',
              padding: isCollapsed ? '0.5rem' : '0.6rem 0.75rem',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              backgroundColor: '#ffffff',
              cursor: 'pointer',
            }}
            title={isCollapsed ? `${displayName} (${teamLabel})` : undefined}
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
              {!isCollapsed && (
                <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#09090b', lineHeight: 1.2 }}>
                    {displayName}
                  </span>
                  <span style={{ fontSize: '0.675rem', color: 'var(--text-muted)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                    {teamLabel}
                  </span>
                </div>
              )}
            </div>
            {!isCollapsed && <ChevronDown size={14} color="#71717a" />}
          </div>

          {/* User Menu Dropdown Modal (Log out & Profile) */}
          {isUserMenuOpen && !isCollapsed && (
            <div
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '0.5rem',
                boxShadow: 'var(--shadow-md)',
              }}
            >
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', padding: '0.25rem 0.5rem', borderBottom: '1px solid var(--border-color)', marginBottom: '0.25rem' }}>
                {displayEmail}
              </div>
              <button
                onClick={logout}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  width: '100%',
                  background: 'none',
                  border: 'none',
                  padding: '0.45rem 0.5rem',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  color: 'var(--error)',
                  cursor: 'pointer',
                  borderRadius: '4px',
                  textAlign: 'left',
                }}
              >
                <LogOut size={14} />
                <span>Sign out</span>
              </button>
            </div>
          )}

          {/* Collapse Sidebar Button */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: isCollapsed ? 'center' : 'flex-start',
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
            <span style={{ fontSize: '0.9rem' }}>{isCollapsed ? '›' : '‹'}</span>
            {!isCollapsed && <span>Collapse</span>}
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
