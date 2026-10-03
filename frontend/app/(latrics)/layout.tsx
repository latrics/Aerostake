'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { requestApi } from '@/modules/requests/api';
import {
  calculateRequestsNotificationCount,
  NOTIFICATIONS_CHANGED_EVENT,
} from '@/modules/requests/notifications';
import {
  Home,
  FileText,
  Folder,
  CreditCard,
  BarChart3,
  UserCheck,
  HelpCircle,
  Settings,
  ChevronDown,
  LogOut,
  User as UserIcon,
  Calendar,
  Users,
  Loader2,
} from 'lucide-react';

import { isLatricsRole } from '@/lib/role';
import ClientLayout from '@/app/(client)/layout';
import { InviteUserDrawer } from '@/modules/users/components/InviteUserDrawer';

export default function LatricsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading: authLoading, logout } = useAuth();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isInviteDrawerOpen, setIsInviteDrawerOpen] = useState(false);
  const [requestCount, setRequestCount] = useState<number | undefined>(undefined);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const refreshNotificationCount = useCallback(async () => {
    if (user && isLatricsRole(user.role)) {
      try {
        const reqs = await requestApi.listAllRequests();
        const { totalBadgeCount } = calculateRequestsNotificationCount(reqs || []);
        setRequestCount(totalBadgeCount > 0 ? totalBadgeCount : undefined);
      } catch {
        setRequestCount(undefined);
      }
    } else {
      setRequestCount(undefined);
    }
  }, [user]);

  useEffect(() => {
    refreshNotificationCount();
  }, [pathname, refreshNotificationCount]);

  useEffect(() => {
    const handleUpdate = () => {
      refreshNotificationCount();
    };
    window.addEventListener(NOTIFICATIONS_CHANGED_EVENT, handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener(NOTIFICATIONS_CHANGED_EVENT, handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [refreshNotificationCount]);

  // Close profile dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Session Timeout Guard:
  // If session has expired or user is unauthenticated, redirect to login page
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login?session_expired=true');
    }
  }, [authLoading, user, router]);

  // If session is loading or user is unauthenticated, do NOT display base layout
  if (authLoading || !user) {
    return (
      <div style={{ display: 'flex', height: '100vh', width: '100vw', alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
          <Loader2 size={32} className="spinner" color="#09090b" />
          <span style={{ fontSize: '0.8rem', color: '#71717a', fontWeight: 500 }}>Authenticating session...</span>
        </div>
      </div>
    );
  }

  if (user && !isLatricsRole(user.role)) {
    return <ClientLayout>{children}</ClientLayout>;
  }

  // Role & Identity identification sourced from real authenticated user object
  const userRole = user?.role?.toLowerCase();
  const isAdminRole = userRole === 'admin';
  const isOpsRole = userRole === 'operations';
  const isPilotRole = userRole === 'pilot';

  const portalLabel = isAdminRole ? 'Admin Portal' : isOpsRole ? 'OPS Portal' : isPilotRole ? 'Pilot Portal' : 'Latrics Portal';
  const displayName = user?.full_name || (isAdminRole ? 'Admin' : isOpsRole ? 'Ops User' : isPilotRole ? 'Pilot' : user?.email?.split('@')[0] || 'Staff User');
  const teamLabel = isAdminRole ? 'Platform Admin' : isOpsRole ? 'Operations Team' : isPilotRole ? 'LATRICS' : 'Latrics Team';
  const displayEmail = user?.email || '';

  const allNavItems = [
    // Pilot Portal Navigation (matching design)
    { label: 'Dashboard', path: '/dashboard', icon: Folder, roles: ['pilot'] },
    { label: 'Projects', path: '/projects', icon: FileText, roles: ['pilot'] },
    { label: 'Schedule', path: '/schedule', icon: Calendar, roles: ['pilot'] },
    { label: 'Reports', path: '/reports', icon: BarChart3, roles: ['pilot'] },

    // Admin & Ops Navigation
    { label: 'Dashboard', path: '/dashboard', icon: Home, roles: ['admin', 'operations'] },
    { label: 'Requests', path: '/requests', icon: FileText, badge: requestCount !== undefined && requestCount > 0 ? requestCount : undefined, roles: ['admin', 'operations'] },
    { label: 'Projects', path: '/projects', icon: Folder, roles: ['admin', 'operations'] },
    { label: 'Report', path: '/activity-logs', icon: FileText, roles: ['admin', 'operations'] },
    { label: 'Payments', path: '/payments', icon: CreditCard, roles: ['admin', 'operations'] },
    { label: 'Users', path: '/user-management', icon: UserIcon, roles: ['admin', 'operations'] },
    { label: 'Clients', path: '/clients', icon: Users, roles: ['admin', 'operations'] },
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
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        <div>
          {/* Brand Header */}
          <div className="sidebar-header" style={{ padding: isCollapsed ? '1rem 0.5rem' : '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '6px',
                  backgroundColor: '#09090b',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {/* Geometric Bowtie / Hourglass Latrics Icon */}
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M4 3h16l-8 9 8 9H4l8-9-8-9z" />
                </svg>
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
        </div>

        {/* Sidebar Footer — Claude-style User Dropdown Menu & Collapse */}
        <div style={{ padding: isCollapsed ? '0.75rem 0.5rem' : '0.75rem 0.75rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', borderTop: '1px solid #f4f4f5' }}>
          {/* Claude-style User Button & Dropdown */}
          <div style={{ position: 'relative' }} ref={userMenuRef}>
            <button
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: isCollapsed ? 'center' : 'space-between',
                gap: '0.5rem',
                width: '100%',
                padding: isCollapsed ? '0.45rem' : '0.45rem 0.55rem',
                backgroundColor: isUserMenuOpen ? '#f4f4f5' : 'transparent',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'background-color 0.15s ease',
                textAlign: 'left',
              }}
              onMouseEnter={(e) => {
                if (!isUserMenuOpen) e.currentTarget.style.backgroundColor = '#f4f4f5';
              }}
              onMouseLeave={(e) => {
                if (!isUserMenuOpen) e.currentTarget.style.backgroundColor = 'transparent';
              }}
              title={isCollapsed ? `${displayName} · ${teamLabel}` : undefined}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', minWidth: 0, flex: 1 }}>
                <div
                  style={{
                    width: '30px',
                    height: '30px',
                    borderRadius: '6px',
                    border: '1px solid #e4e4e7',
                    backgroundColor: '#fafafa',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    color: '#09090b',
                    flexShrink: 0,
                  }}
                >
                  {isPilotRole ? 'P' : displayName.slice(0, 2).toUpperCase()}
                </div>
                {!isCollapsed && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', minWidth: 0, flex: 1, overflow: 'hidden' }}>
                    <span style={{ fontSize: '0.825rem', fontWeight: 600, color: '#09090b', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                      {isPilotRole ? 'Pilot' : displayName}
                    </span>
                    <span style={{ color: '#a1a1aa', fontSize: '0.8rem' }}>·</span>
                    <span style={{ fontSize: '0.8rem', color: '#71717a', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                      {teamLabel}
                    </span>
                  </div>
                )}
              </div>
              {!isCollapsed && (
                <ChevronDown size={14} color="#71717a" style={{ flexShrink: 0, transform: isUserMenuOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s ease' }} />
              )}
            </button>

            {/* Claude-style Dropdown Menu Popup (Image 5) */}
            {isUserMenuOpen && (
              <div
                style={{
                  position: 'absolute',
                  bottom: 'calc(100% + 8px)',
                  left: isCollapsed ? '0' : '0',
                  width: isCollapsed ? '220px' : '100%',
                  minWidth: '210px',
                  backgroundColor: '#ffffff',
                  border: '1px solid #e4e4e7',
                  borderRadius: '12px',
                  padding: '0.35rem',
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.08)',
                  zIndex: 1000,
                }}
              >
                {/* User email header in subtle gray */}
                <div style={{ padding: '0.45rem 0.65rem 0.25rem', fontSize: '0.75rem', color: '#71717a', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user?.email || displayEmail}
                </div>

                <div style={{ height: '1px', backgroundColor: '#f4f4f5', margin: '0.3rem 0' }} />

                {/* Settings */}
                <Link
                  href={isAdminRole || isOpsRole ? '/portal-settings' : '/settings'}
                  onClick={() => setIsUserMenuOpen(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.65rem',
                    padding: '0.5rem 0.65rem',
                    fontSize: '0.8rem',
                    fontWeight: 500,
                    color: '#09090b',
                    textDecoration: 'none',
                    borderRadius: '6px',
                    transition: 'background-color 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f4f4f5')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <Settings size={15} color="#52525b" />
                  <span>Settings</span>
                </Link>

                {/* Get Help */}
                <Link
                  href="/help-desk"
                  onClick={() => setIsUserMenuOpen(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.65rem',
                    padding: '0.5rem 0.65rem',
                    fontSize: '0.8rem',
                    fontWeight: 500,
                    color: '#09090b',
                    textDecoration: 'none',
                    borderRadius: '6px',
                    transition: 'background-color 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f4f4f5')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <HelpCircle size={15} color="#52525b" />
                  <span>Get help</span>
                </Link>

                {/* Invite users (only for admin / operations) */}
                {(isAdminRole || isOpsRole) && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      setIsInviteDrawerOpen(true);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.65rem',
                      width: '100%',
                      background: 'none',
                      border: 'none',
                      padding: '0.5rem 0.65rem',
                      fontSize: '0.8rem',
                      fontWeight: 500,
                      color: '#09090b',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      transition: 'background-color 0.15s ease',
                      textAlign: 'left',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f4f4f5')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <UserCheck size={15} color="#52525b" />
                    <span>Invite users</span>
                  </button>
                )}

                <div style={{ height: '1px', backgroundColor: '#f4f4f5', margin: '0.3rem 0' }} />

                {/* Log out */}
                <button
                  onClick={logout}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.65rem',
                    width: '100%',
                    background: 'none',
                    border: 'none',
                    padding: '0.5rem 0.65rem',
                    fontSize: '0.8rem',
                    fontWeight: 500,
                    color: '#09090b',
                    cursor: 'pointer',
                    borderRadius: '6px',
                    textAlign: 'left',
                    transition: 'background-color 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f4f4f5')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <LogOut size={15} color="#09090b" />
                  <span>Log out</span>
                </button>
              </div>
            )}
          </div>

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
              fontSize: '0.75rem',
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

      {/* Invite User Drawer Side Popup */}
      <InviteUserDrawer
        isOpen={isInviteDrawerOpen}
        onClose={() => setIsInviteDrawerOpen(false)}
        onSuccess={() => {
          // Keep drawer open so user can view generated link, copy email layout & launch platform!
        }}
      />
    </div>
  );
}

