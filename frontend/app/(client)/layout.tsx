'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { isLatricsRole } from '@/lib/role';
import LatricsLayout from '@/app/(latrics)/layout';
import WireframeBox from '@/components/WireframeBox';
import {
  Folder,
  FileText,
  CreditCard,
  HelpCircle,
  Settings,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Building,
  Loader2,
} from 'lucide-react';
import { ClientLiveWalletSyncBadge } from '@/modules/payments/components/ClientLiveWalletSyncBadge';

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading: authLoading, logout } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  const displayName = user?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'Client';
  const companyLabel = user?.company_name || (user?.role === 'client_primary' ? 'Primary Client' : 'Client Workspace');
  const displayEmail = user?.email || '';
  const userInitials = user?.full_name
    ? user.full_name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : user?.email?.slice(0, 2).toUpperCase() || 'CL';

  // Session Timeout Guard:
  // If session has expired or user is not logged in, immediately redirect to login page
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login?session_expired=true');
    }
  }, [authLoading, user, router]);

  // First-time Onboarding Guard:
  // When entering the application for the first time, clients must see the profile form
  // at the very beginning just after authenticating, and only thereafter start with dashboard.
  useEffect(() => {
    if (!authLoading && user) {
      const isClientRole = user.role === 'client' || user.role === 'client_primary';
      const isOnboarded = Boolean(user.company_profile?.is_onboarded);
      if (isClientRole && !isOnboarded && pathname !== '/company-profile') {
        router.replace('/company-profile?first_time=true');
      }
    }
  }, [user, authLoading, pathname, router]);

  // Close profile dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(event.target as Node)
      ) {
        setIsProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  // If user is Admin or Operations or Pilot, use Latrics Layout
  if (user && isLatricsRole(user.role)) {
    return <LatricsLayout>{children}</LatricsLayout>;
  }

  const menuItems = [
    { label: 'Dashboard', path: '/dashboard', icon: Folder },
    { label: 'Requests', path: '/requests', icon: FileText },
    { label: 'Projects', path: '/projects', icon: Folder },
    { label: 'Report', path: '/activity-logs', icon: FileText },
    { label: 'Payments', path: '/payments', icon: CreditCard },
  ];

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

        {/* Real-time Client Wallet Sync Widget */}
        <div style={{ padding: isCollapsed ? '0.5rem 0.4rem' : '0 0.75rem 0.75rem' }}>
          <ClientLiveWalletSyncBadge collapsed={isCollapsed} variant="sidebar" />
        </div>

        {/* Sidebar Footer — Claude-style User Dropdown Menu & Collapse */}
        <div style={{ padding: isCollapsed ? '0.75rem 0.5rem' : '0.75rem 0.75rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', borderTop: '1px solid #f4f4f5' }}>
          {/* Claude-style User Button & Dropdown */}
          <div style={{ position: 'relative' }} ref={profileMenuRef}>
            <button
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: isCollapsed ? 'center' : 'space-between',
                gap: '0.5rem',
                width: '100%',
                padding: isCollapsed ? '0.45rem' : '0.45rem 0.55rem',
                backgroundColor: isProfileMenuOpen ? '#f4f4f5' : 'transparent',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'background-color 0.15s ease',
                textAlign: 'left',
              }}
              onMouseEnter={(e) => {
                if (!isProfileMenuOpen) e.currentTarget.style.backgroundColor = '#f4f4f5';
              }}
              onMouseLeave={(e) => {
                if (!isProfileMenuOpen) e.currentTarget.style.backgroundColor = 'transparent';
              }}
              title={isCollapsed ? `${displayName} · ${companyLabel}` : undefined}
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
                  {userInitials}
                </div>
                {!isCollapsed && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', minWidth: 0, flex: 1, overflow: 'hidden' }}>
                    <span style={{ fontSize: '0.825rem', fontWeight: 600, color: '#09090b', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                      {displayName}
                    </span>
                    <span style={{ color: '#a1a1aa', fontSize: '0.8rem' }}>·</span>
                    <span style={{ fontSize: '0.8rem', color: '#71717a', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                      {companyLabel}
                    </span>
                  </div>
                )}
              </div>
              {!isCollapsed && (
                <ChevronDown
                  size={14}
                  color="#71717a"
                  style={{
                    flexShrink: 0,
                    transform: isProfileMenuOpen ? 'rotate(180deg)' : 'none',
                    transition: 'transform 0.15s ease',
                  }}
                />
              )}
            </button>

            {/* Claude-style Dropdown Menu Popup (Image 5) */}
            {isProfileMenuOpen && (
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
                  {displayEmail}
                </div>

                <div style={{ height: '1px', backgroundColor: '#f4f4f5', margin: '0.3rem 0' }} />

                {/* Company Profile */}
                <Link
                  href="/company-profile"
                  onClick={() => setIsProfileMenuOpen(false)}
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
                  <Building size={15} color="#52525b" />
                  <span>Company profile</span>
                </Link>

                {/* Settings */}
                <Link
                  href="/settings"
                  onClick={() => setIsProfileMenuOpen(false)}
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
                  onClick={() => setIsProfileMenuOpen(false)}
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
                    borderRadius: '6px',
                    cursor: 'pointer',
                    transition: 'background-color 0.15s ease',
                    textAlign: 'left',
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

          {/* Sidebar Collapse Toggle */}
          {!isCollapsed ? (
            <button
              onClick={() => setIsCollapsed(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                background: 'none',
                border: 'none',
                fontSize: '0.75rem',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                padding: '0.2rem 0.4rem',
                borderRadius: '4px',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#09090b')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
            >
              <ChevronLeft size={14} />
              <span>Collapse</span>
            </button>
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
                padding: '0.25rem 0',
                color: 'var(--text-secondary)',
                borderRadius: '4px',
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
        {/* Content Area */}
        <main className="content-area">{children}</main>
      </div>
    </div>
  );
}
