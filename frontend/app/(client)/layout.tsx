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
  Files,
  HelpCircle,
  Settings,
  Bell,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Building,
  User as UserIcon,
} from 'lucide-react';

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading: authLoading, logout } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isOrgDropdownOpen, setIsOrgDropdownOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

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

  // If user is Admin or Operations or Pilot, use Latrics Layout
  if (user && isLatricsRole(user.role)) {
    return <LatricsLayout>{children}</LatricsLayout>;
  }

  const menuItems = [
    { label: 'Dashboard', path: '/dashboard', icon: Folder },
    { label: 'Projects', path: '/projects', icon: Folder },
    { label: 'Daily logs', path: '/activity-logs', icon: FileText },
    { label: 'Payments', path: '/payments', icon: CreditCard },
    { label: 'Documents', path: '/documents', icon: Files },
    { label: 'Help Desk', path: '/help-desk', icon: HelpCircle },
  ];

  const getPageTitle = () => {
    if (pathname.startsWith('/settings')) return 'Settings';
    if (pathname.startsWith('/company-profile')) return 'Company Profile';
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
                    {user?.company_name || 'Organization Workspace'}
                  </span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                    {user?.role === 'client_primary' ? 'Primary Client' : 'Client Workspace'}
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

            {/* User Profile Capsule with Interactive Dropdown Menu */}
            <div ref={profileMenuRef} style={{ position: 'relative' }}>
              <div
                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.65rem',
                  cursor: 'pointer',
                  padding: '0.35rem 0.5rem',
                  borderRadius: '6px',
                  backgroundColor: isProfileMenuOpen ? '#f4f4f5' : 'transparent',
                  transition: 'background-color 0.15s ease',
                }}
              >
                <div
                  style={{
                    width: '34px',
                    height: '34px',
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
                  {user?.full_name
                    ? user.full_name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .toUpperCase()
                        .slice(0, 2)
                    : user?.email?.slice(0, 2).toUpperCase() || 'JD'}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '0.825rem', fontWeight: 700, lineHeight: 1.2, color: '#09090b' }}>
                    {user?.full_name || 'John Doe'}
                  </span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                    {user?.company_name || 'Acme Industries'}
                  </span>
                </div>
                <ChevronDown size={14} color="#71717a" />
              </div>

              {/* Top-Right Profile Dropdown Popover */}
              {isProfileMenuOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: '48px',
                    right: 0,
                    width: '180px',
                    backgroundColor: '#ffffff',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
                    zIndex: 100,
                    padding: '0.4rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.2rem',
                  }}
                >
                  <Link
                    href="/company-profile"
                    onClick={() => setIsProfileMenuOpen(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.6rem',
                      padding: '0.55rem 0.75rem',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      color: '#09090b',
                      borderRadius: '4px',
                      textDecoration: 'none',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f4f4f5')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <Building size={15} color="#09090b" />
                    <span>Company Profile</span>
                  </Link>

                  <Link
                    href="/settings"
                    onClick={() => setIsProfileMenuOpen(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.6rem',
                      padding: '0.55rem 0.75rem',
                      fontSize: '0.8rem',
                      fontWeight: 500,
                      color: '#09090b',
                      borderRadius: '4px',
                      textDecoration: 'none',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f4f4f5')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <Settings size={15} color="#09090b" />
                    <span>Settings</span>
                  </Link>

                  <div style={{ height: '1px', backgroundColor: 'var(--border-color)', margin: '0.2rem 0' }} />

                  <button
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      logout();
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.6rem',
                      padding: '0.55rem 0.75rem',
                      fontSize: '0.8rem',
                      fontWeight: 500,
                      color: '#09090b',
                      background: 'none',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      width: '100%',
                      textAlign: 'left',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f4f4f5')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <LogOut size={15} color="#09090b" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="content-area animate-fade-in">{children}</main>
      </div>
    </div>
  );
}
