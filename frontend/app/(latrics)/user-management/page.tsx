'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  User,
  Plane,
  Building2,
  Search,
  ChevronDown,
  Download,
  Plus,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  CheckSquare,
  Square,
  Shield,
  Loader2,
  UserCheck,
  UserX,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  X,
  Info,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { usersApi } from '@/modules/users/api';
import { UserProfile } from '@/modules/users/types';
import { InviteUserDrawer } from '@/modules/users/components/InviteUserDrawer';

type TabKey = 'all' | 'ops' | 'pilots' | 'clients';

export default function UserManagementPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Tab & Filters
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [orgFilter, setOrgFilter] = useState('all');

  // Table selection & pagination
  const [selectedUserIds, setSelectedUserIds] = useState<Record<string, boolean>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Modals & Drawers
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [actionMenuOpenId, setActionMenuOpenId] = useState<string | null>(null);
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);
  const [isDeletingUser, setIsDeletingUser] = useState(false);
  const [userToView, setUserToView] = useState<UserProfile | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await usersApi.listUsers();
      setUsers(data || []);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load user directory.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleUserStatus = async (targetUser: UserProfile) => {
    setActionMenuOpenId(null);
    if (currentUser && currentUser.id === targetUser.id) {
      setFeedbackMessage({ type: 'error', text: 'You cannot change your own account status.' });
      return;
    }
    const newStatus = !targetUser.is_active;
    try {
      await usersApi.updateUserStatus(targetUser.id, newStatus);
      setFeedbackMessage({
        type: 'success',
        text: `User ${targetUser.email} has been ${newStatus ? 'activated' : 'deactivated'} successfully.`,
      });
      fetchUsers();
    } catch (err: any) {
      setFeedbackMessage({ type: 'error', text: err.message || 'Failed to update user status.' });
    }
  };

  const handleConfirmDeleteUser = async () => {
    if (!userToDelete) return;
    setIsDeletingUser(true);
    try {
      await usersApi.deleteUser(userToDelete.id, false);
      setFeedbackMessage({
        type: 'success',
        text: `User ${userToDelete.email} has been deleted successfully.`,
      });
      setUserToDelete(null);
      fetchUsers();
    } catch (err: any) {
      setFeedbackMessage({ type: 'error', text: err.message || 'Failed to delete user.' });
    } finally {
      setIsDeletingUser(false);
    }
  };


  // Helper functions for roles & organizations
  const formatRole = (role: string) => {
    switch (role?.toLowerCase()) {
      case 'admin':
        return 'Admin';
      case 'operations':
        return 'Ops';
      case 'pilot':
        return 'Pilot';
      case 'client_primary':
        return 'Client (Primary)';
      case 'client_sub':
        return 'Client (Sub)';
      case 'client':
        return 'Client';
      default:
        return role || 'User';
    }
  };

  const getRoleBadgeStyle = (role: string) => {
    switch (role?.toLowerCase()) {
      case 'admin':
        return { backgroundColor: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca' };
      case 'operations':
        return { backgroundColor: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1' };
      case 'pilot':
        return { backgroundColor: '#fefce8', color: '#854d0e', border: '1px solid #fef08a' };
      case 'client_primary':
      case 'client_sub':
      case 'client':
        return { backgroundColor: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0' };
      default:
        return { backgroundColor: '#f8fafc', color: '#475569', border: '1px solid #e2e8f0' };
    }
  };

  const getOrganizationName = (u: UserProfile) => {
    const roleLower = u.role?.toString().toLowerCase();
    if (roleLower === 'admin' || roleLower === 'operations' || roleLower === 'pilot') {
      return 'Latrics';
    }
    return u.company_name || 'Individual Client';
  };

  const getInitials = (u: UserProfile) => {
    if (u.full_name && u.full_name.trim()) {
      const parts = u.full_name.trim().split(' ');
      if (parts.length >= 2) {
        return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      }
      return u.full_name.substring(0, 2).toUpperCase();
    }
    return u.email.substring(0, 2).toUpperCase();
  };

  const getDisplayName = (u: UserProfile) => {
    if (u.full_name && u.full_name.trim()) {
      return u.full_name;
    }
    return u.email.split('@')[0];
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return '—';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return '—';
    }
  };

  // KPI Calculations
  const kpis = useMemo(() => {
    const totalUsers = users.length;
    const totalActive = users.filter((u) => u.is_active).length;
    const totalInactive = totalUsers - totalActive;

    const opsUsers = users.filter((u) => {
      const r = u.role?.toString().toLowerCase();
      return r === 'operations' || r === 'admin';
    });
    const opsActive = opsUsers.filter((u) => u.is_active).length;
    const opsInactive = opsUsers.length - opsActive;

    const pilots = users.filter((u) => u.role?.toString().toLowerCase() === 'pilot');
    const pilotsActive = pilots.filter((u) => u.is_active).length;
    const pilotsInactive = pilots.length - pilotsActive;

    const clients = users.filter((u) => {
      const r = u.role?.toString().toLowerCase();
      return r === 'client' || r === 'client_primary' || r === 'client_sub';
    });
    const clientsActive = clients.filter((u) => u.is_active).length;
    const clientsInactive = clients.length - clientsActive;

    return {
      total: { count: totalUsers, active: totalActive, inactive: totalInactive },
      ops: { count: opsUsers.length, active: opsActive, inactive: opsInactive },
      pilots: { count: pilots.length, active: pilotsActive, inactive: pilotsInactive },
      clients: { count: clients.length, active: clientsActive, inactive: clientsInactive },
    };
  }, [users]);

  // Distinct Filter Options
  const distinctRoles = useMemo(() => {
    const set = new Set<string>();
    users.forEach((u) => {
      if (u.role) set.add(u.role.toString().toLowerCase());
    });
    return Array.from(set);
  }, [users]);

  const distinctOrganizations = useMemo(() => {
    const set = new Set<string>();
    users.forEach((u) => {
      const org = getOrganizationName(u);
      if (org) set.add(org);
    });
    return Array.from(set);
  }, [users]);

  // Filtered Users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const roleLower = u.role?.toString().toLowerCase();
      const orgName = getOrganizationName(u).toLowerCase();
      const name = (u.full_name || '').toLowerCase();
      const email = (u.email || '').toLowerCase();
      const phone = (u.phone_number || '').toLowerCase();

      // Tab filter
      if (activeTab === 'ops' && roleLower !== 'operations' && roleLower !== 'admin') {
        return false;
      }
      if (activeTab === 'pilots' && roleLower !== 'pilot') {
        return false;
      }
      if (activeTab === 'clients' && roleLower !== 'client' && roleLower !== 'client_primary' && roleLower !== 'client_sub') {
        return false;
      }

      // Role filter
      if (roleFilter !== 'all' && roleLower !== roleFilter.toLowerCase()) {
        return false;
      }

      // Status filter
      if (statusFilter === 'active' && !u.is_active) return false;
      if (statusFilter === 'inactive' && u.is_active) return false;

      // Organization filter
      if (orgFilter !== 'all' && getOrganizationName(u) !== orgFilter) {
        return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matches =
          name.includes(q) ||
          email.includes(q) ||
          phone.includes(q) ||
          orgName.includes(q) ||
          roleLower.includes(q);
        if (!matches) return false;
      }

      return true;
    });
  }, [users, activeTab, roleFilter, statusFilter, orgFilter, searchQuery]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredUsers.length / pageSize) || 1;
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredUsers.slice(start, start + pageSize);
  }, [filteredUsers, currentPage]);

  const handleSelectAll = (checked: boolean) => {
    const newSelected: Record<string, boolean> = {};
    if (checked) {
      paginatedUsers.forEach((u) => {
        newSelected[u.id] = true;
      });
    }
    setSelectedUserIds(newSelected);
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    setSelectedUserIds((prev) => ({
      ...prev,
      [id]: checked,
    }));
  };

  const clearFilters = () => {
    setSearchQuery('');
    setRoleFilter('all');
    setStatusFilter('all');
    setOrgFilter('all');
    setCurrentPage(1);
  };

  // Export Users to CSV
  const handleExportCSV = () => {
    if (filteredUsers.length === 0) return;
    const headers = ['Name', 'Role', 'Organization', 'Email', 'Phone', 'Status', 'Joined On'];
    const rows = filteredUsers.map((u) => [
      `"${getDisplayName(u)}"`,
      `"${formatRole(u.role?.toString())}"`,
      `"${getOrganizationName(u)}"`,
      `"${u.email}"`,
      `"${u.phone_number || ''}"`,
      `"${u.is_active ? 'Active' : 'Inactive'}"`,
      `"${formatDate(u.created_at)}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `aerostake_users_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ padding: '0.25rem 0', maxWidth: '1440px', margin: '0 auto' }}>
      {/* ── Page Header ── */}
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 style={{ fontSize: '1.65rem', fontWeight: 700, color: '#09090b', margin: 0, letterSpacing: '-0.02em' }}>
          Users
        </h1>
        <p style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '0.35rem', margin: 0 }}>
          Manage team members, pilots and clients across the platform
        </p>
      </div>

      {/* ── KPI Strip (4 Cards) ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '1rem',
          marginBottom: '1.75rem',
        }}
      >
        {/* Total Users */}
        <div
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              backgroundColor: '#f8fafc',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#09090b',
              flexShrink: 0,
            }}
          >
            <Users size={24} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              TOTAL USERS
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#09090b', lineHeight: 1.1, marginTop: '0.2rem' }}>
              {isLoading ? '—' : kpis.total.count}
            </div>
            <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.35rem' }}>
              Active <b style={{ color: '#09090b', fontWeight: 600 }}>{kpis.total.active}</b> &nbsp;|&nbsp; Inactive <b style={{ color: '#09090b', fontWeight: 600 }}>{kpis.total.inactive}</b>
            </div>
          </div>
        </div>

        {/* Ops Users */}
        <div
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              backgroundColor: '#f8fafc',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#09090b',
              flexShrink: 0,
            }}
          >
            <User size={24} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              OPS USERS
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#09090b', lineHeight: 1.1, marginTop: '0.2rem' }}>
              {isLoading ? '—' : kpis.ops.count}
            </div>
            <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.35rem' }}>
              Active <b style={{ color: '#09090b', fontWeight: 600 }}>{kpis.ops.active}</b> &nbsp;|&nbsp; Inactive <b style={{ color: '#09090b', fontWeight: 600 }}>{kpis.ops.inactive}</b>
            </div>
          </div>
        </div>

        {/* Pilots */}
        <div
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              backgroundColor: '#f8fafc',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#09090b',
              flexShrink: 0,
            }}
          >
            <Plane size={24} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              PILOTS
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#09090b', lineHeight: 1.1, marginTop: '0.2rem' }}>
              {isLoading ? '—' : kpis.pilots.count}
            </div>
            <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.35rem' }}>
              Active <b style={{ color: '#09090b', fontWeight: 600 }}>{kpis.pilots.active}</b> &nbsp;|&nbsp; Inactive <b style={{ color: '#09090b', fontWeight: 600 }}>{kpis.pilots.inactive}</b>
            </div>
          </div>
        </div>

        {/* Clients */}
        <div
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              backgroundColor: '#f8fafc',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#09090b',
              flexShrink: 0,
            }}
          >
            <Building2 size={24} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              CLIENTS
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#09090b', lineHeight: 1.1, marginTop: '0.2rem' }}>
              {isLoading ? '—' : kpis.clients.count}
            </div>
            <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.35rem' }}>
              Active <b style={{ color: '#09090b', fontWeight: 600 }}>{kpis.clients.active}</b> &nbsp;|&nbsp; Inactive <b style={{ color: '#09090b', fontWeight: 600 }}>{kpis.clients.inactive}</b>
            </div>
          </div>
        </div>
      </div>

      {/* ── Feedback Message Banner ── */}
      {feedbackMessage && (
        <div
          style={{
            marginBottom: '1rem',
            padding: '0.75rem 1rem',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: feedbackMessage.type === 'success' ? '#f0fdf4' : '#fef2f2',
            border: `1px solid ${feedbackMessage.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
            color: feedbackMessage.type === 'success' ? '#166534' : '#991b1b',
            fontSize: '0.85rem',
            fontWeight: 500,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {feedbackMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
            <span>{feedbackMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackMessage(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: '2px' }}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── Tab Bar & Top Actions ── */}

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #e2e8f0',
          marginBottom: '1.25rem',
          paddingBottom: '0.25rem',
        }}
      >
        {/* Left Tabs */}
        <div style={{ display: 'flex', gap: '2rem' }}>
          {[
            { key: 'all', label: 'All Users' },
            { key: 'ops', label: 'Ops Users' },
            { key: 'pilots', label: 'Pilots' },
            { key: 'clients', label: 'Clients' },
          ].map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => {
                  setActiveTab(tab.key as TabKey);
                  setCurrentPage(1);
                }}
                style={{
                  border: 'none',
                  background: 'none',
                  padding: '0.75rem 0',
                  fontSize: '0.92rem',
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? '#09090b' : '#64748b',
                  cursor: 'pointer',
                  position: 'relative',
                  outline: 'none',
                }}
              >
                {tab.label}
                {isActive && (
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '-1px',
                      left: 0,
                      right: 0,
                      height: '2.5px',
                      backgroundColor: '#09090b',
                    }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Right Actions */}
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            type="button"
            onClick={handleExportCSV}
            style={{
              padding: '0.55rem 0.95rem',
              backgroundColor: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              fontSize: '0.85rem',
              fontWeight: 600,
              color: '#0f172a',
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              cursor: 'pointer',
            }}
          >
            <Download size={15} />
            <span>Export Users</span>
          </button>

          <button
            type="button"
            onClick={() => setIsInviteOpen(true)}
            style={{
              padding: '0.55rem 1rem',
              backgroundColor: '#18181b',
              border: 'none',
              borderRadius: '6px',
              fontSize: '0.85rem',
              fontWeight: 600,
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              cursor: 'pointer',
            }}
          >
            <Plus size={16} />
            <span>Invite User</span>
          </button>
        </div>
      </div>

      {/* ── Toolbar / Filters Card ── */}
      <div
        style={{
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          padding: '0.75rem 1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          marginBottom: '1rem',
          flexWrap: 'wrap',
        }}
      >
        {/* Universal Search */}
        <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
          <Search
            size={16}
            style={{
              position: 'absolute',
              left: '0.75rem',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#94a3b8',
            }}
          />
          <input
            type="text"
            placeholder="Search by name, email, phone or organization..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            style={{
              width: '100%',
              padding: '0.5rem 0.75rem 0.5rem 2.25rem',
              fontSize: '0.85rem',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              backgroundColor: '#f8fafc',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Role Filter */}
        <div style={{ position: 'relative' }}>
          <select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setCurrentPage(1);
            }}
            style={{
              padding: '0.5rem 2rem 0.5rem 0.75rem',
              fontSize: '0.85rem',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              backgroundColor: '#ffffff',
              color: '#0f172a',
              cursor: 'pointer',
              appearance: 'none',
              outline: 'none',
            }}
          >
            <option value="all">Role: All</option>
            <option value="admin">Role: Admin</option>
            <option value="operations">Role: Ops</option>
            <option value="pilot">Role: Pilot</option>
            <option value="client_primary">Role: Client (Primary)</option>
            <option value="client_sub">Role: Client (Sub)</option>
          </select>
          <ChevronDown
            size={14}
            style={{
              position: 'absolute',
              right: '0.65rem',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#64748b',
              pointerEvents: 'none',
            }}
          />
        </div>

        {/* Status Filter */}
        <div style={{ position: 'relative' }}>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            style={{
              padding: '0.5rem 2rem 0.5rem 0.75rem',
              fontSize: '0.85rem',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              backgroundColor: '#ffffff',
              color: '#0f172a',
              cursor: 'pointer',
              appearance: 'none',
              outline: 'none',
            }}
          >
            <option value="all">Status: All</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <ChevronDown
            size={14}
            style={{
              position: 'absolute',
              right: '0.65rem',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#64748b',
              pointerEvents: 'none',
            }}
          />
        </div>

        {/* Organization Filter */}
        <div style={{ position: 'relative' }}>
          <select
            value={orgFilter}
            onChange={(e) => {
              setOrgFilter(e.target.value);
              setCurrentPage(1);
            }}
            style={{
              padding: '0.5rem 2rem 0.5rem 0.75rem',
              fontSize: '0.85rem',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              backgroundColor: '#ffffff',
              color: '#0f172a',
              cursor: 'pointer',
              appearance: 'none',
              outline: 'none',
            }}
          >
            <option value="all">Organization: All</option>
            {distinctOrganizations.map((org) => (
              <option key={org} value={org}>
                {org}
              </option>
            ))}
          </select>
          <ChevronDown
            size={14}
            style={{
              position: 'absolute',
              right: '0.65rem',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#64748b',
              pointerEvents: 'none',
            }}
          />
        </div>

        {/* Clear Filters */}
        {(searchQuery || roleFilter !== 'all' || statusFilter !== 'all' || orgFilter !== 'all') && (
          <button
            type="button"
            onClick={clearFilters}
            style={{
              border: 'none',
              background: 'none',
              fontSize: '0.85rem',
              color: '#64748b',
              cursor: 'pointer',
              padding: '0.5rem',
              textDecoration: 'underline',
            }}
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* ── Table Container ── */}
      <div
        style={{
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          overflow: 'hidden',
          marginBottom: '1rem',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <th style={{ padding: '0.85rem 1rem', width: '40px' }}>
                <input
                  type="checkbox"
                  checked={paginatedUsers.length > 0 && paginatedUsers.every((u) => selectedUserIds[u.id])}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  style={{ cursor: 'pointer' }}
                />
              </th>
              <th style={{ padding: '0.85rem 1rem', fontSize: '0.78rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
                Name
              </th>
              <th style={{ padding: '0.85rem 1rem', fontSize: '0.78rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
                Role
              </th>
              <th style={{ padding: '0.85rem 1rem', fontSize: '0.78rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
                Organization
              </th>
              <th style={{ padding: '0.85rem 1rem', fontSize: '0.78rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
                Email
              </th>
              <th style={{ padding: '0.85rem 1rem', fontSize: '0.78rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
                Phone
              </th>
              <th style={{ padding: '0.85rem 1rem', fontSize: '0.78rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
                Status
              </th>
              <th style={{ padding: '0.85rem 1rem', fontSize: '0.78rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
                Joined On
              </th>
              <th style={{ padding: '0.85rem 1rem', width: '60px', textAlign: 'center', fontSize: '0.78rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={9} style={{ padding: '4rem 1rem', textAlign: 'center', color: '#64748b' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                    <Loader2 size={18} className="animate-spin" />
                    <span>Loading users directory from database...</span>
                  </div>
                </td>
              </tr>
            ) : paginatedUsers.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ padding: '4rem 1rem', textAlign: 'center', color: '#64748b' }}>
                  <div style={{ maxWidth: '320px', margin: '0 auto' }}>
                    <Users size={32} style={{ color: '#94a3b8', marginBottom: '0.5rem' }} />
                    <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#0f172a' }}>No users found</div>
                    <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '0.25rem' }}>
                      {searchQuery || roleFilter !== 'all' || statusFilter !== 'all' || orgFilter !== 'all'
                        ? 'Try adjusting your search criteria or clear filters.'
                        : 'No users have been registered under this role yet.'}
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedUsers.map((u, idx) => {
                const isSelected = !!selectedUserIds[u.id];
                const isMenuOpen = actionMenuOpenId === u.id;
                return (
                  <tr
                    key={u.id}
                    style={{
                      borderBottom: idx === paginatedUsers.length - 1 ? 'none' : '1px solid #f1f5f9',
                      backgroundColor: isSelected ? '#f8fafc' : '#ffffff',
                      transition: 'background-color 0.15s ease',
                    }}
                  >
                    {/* Checkbox */}
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => handleSelectRow(u.id, e.target.checked)}
                        style={{ cursor: 'pointer' }}
                      />
                    </td>

                    {/* Name with Avatar Initials */}
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            backgroundColor: '#f1f5f9',
                            border: '1px solid #cbd5e1',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            color: '#1e293b',
                            flexShrink: 0,
                          }}
                        >
                          {getInitials(u)}
                        </div>
                        <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#09090b' }}>
                          {getDisplayName(u)}
                        </div>
                      </div>
                    </td>

                    {/* Role Badge */}
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '0.2rem 0.6rem',
                          borderRadius: '12px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          ...getRoleBadgeStyle(u.role?.toString()),
                        }}
                      >
                        {formatRole(u.role?.toString())}
                      </span>
                    </td>

                    {/* Organization */}
                    <td style={{ padding: '0.85rem 1rem', fontSize: '0.85rem', color: '#334155' }}>
                      {getOrganizationName(u)}
                    </td>

                    {/* Email */}
                    <td style={{ padding: '0.85rem 1rem', fontSize: '0.85rem', color: '#64748b' }}>
                      {u.email}
                    </td>

                    {/* Phone */}
                    <td style={{ padding: '0.85rem 1rem', fontSize: '0.85rem', color: '#64748b' }}>
                      {u.phone_number || '—'}
                    </td>

                    {/* Status Dot */}
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          fontSize: '0.82rem',
                          fontWeight: 500,
                          color: u.is_active ? '#15803d' : '#64748b',
                        }}
                      >
                        <span
                          style={{
                            width: '7px',
                            height: '7px',
                            borderRadius: '50%',
                            backgroundColor: u.is_active ? '#22c55e' : '#94a3b8',
                          }}
                        />
                        {u.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>

                    {/* Joined On */}
                    <td style={{ padding: '0.85rem 1rem', fontSize: '0.85rem', color: '#64748b' }}>
                      {formatDate(u.created_at)}
                    </td>

                    {/* Row Actions Menu */}
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'center', position: 'relative' }}>
                      <button
                        type="button"
                        onClick={() => setActionMenuOpenId(isMenuOpen ? null : u.id)}
                        style={{
                          border: 'none',
                          background: 'none',
                          color: '#64748b',
                          cursor: 'pointer',
                          padding: '0.25rem',
                          borderRadius: '4px',
                        }}
                      >
                        <MoreVertical size={16} />
                      </button>

                      {isMenuOpen && (
                        <div
                          style={{
                            position: 'absolute',
                            right: '1rem',
                            top: '2.5rem',
                            backgroundColor: '#ffffff',
                            border: '1px solid #e2e8f0',
                            borderRadius: '6px',
                            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                            zIndex: 100,
                            minWidth: '160px',
                            textAlign: 'left',
                            padding: '0.25rem 0',
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setActionMenuOpenId(null);
                              setUserToView(u);
                            }}
                            style={{
                              width: '100%',
                              padding: '0.5rem 0.85rem',
                              border: 'none',
                              background: 'none',
                              fontSize: '0.8rem',
                              color: '#0f172a',
                              cursor: 'pointer',
                              textAlign: 'left',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.45rem',
                            }}
                          >
                            <Info size={14} color="#64748b" />
                            <span>View User Details</span>
                          </button>

                          {/* Toggle Active / Deactivate */}
                          {currentUser && currentUser.id === u.id ? (
                            <button
                              type="button"
                              disabled
                              title="You cannot deactivate your own administrator account"
                              style={{
                                width: '100%',
                                padding: '0.5rem 0.85rem',
                                border: 'none',
                                background: 'none',
                                fontSize: '0.8rem',
                                color: '#94a3b8',
                                cursor: 'not-allowed',
                                textAlign: 'left',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.45rem',
                              }}
                            >
                              <UserX size={14} color="#94a3b8" />
                              <span>Deactivate (Self)</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleToggleUserStatus(u)}
                              style={{
                                width: '100%',
                                padding: '0.5rem 0.85rem',
                                border: 'none',
                                background: 'none',
                                fontSize: '0.8rem',
                                color: u.is_active ? '#d97706' : '#16a34a',
                                cursor: 'pointer',
                                textAlign: 'left',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.45rem',
                              }}
                            >
                              {u.is_active ? <UserX size={14} color="#d97706" /> : <UserCheck size={14} color="#16a34a" />}
                              <span>{u.is_active ? 'Deactivate User' : 'Activate User'}</span>
                            </button>
                          )}

                          {/* Delete Option */}
                          {currentUser && currentUser.id === u.id ? (
                            <button
                              type="button"
                              disabled
                              title="You cannot delete your own administrator account"
                              style={{
                                width: '100%',
                                padding: '0.5rem 0.85rem',
                                border: 'none',
                                borderTop: '1px solid #f1f5f9',
                                background: 'none',
                                fontSize: '0.8rem',
                                color: '#94a3b8',
                                cursor: 'not-allowed',
                                textAlign: 'left',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.45rem',
                              }}
                            >
                              <Trash2 size={14} color="#94a3b8" />
                              <span>Delete (Self)</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setActionMenuOpenId(null);
                                setUserToDelete(u);
                              }}
                              style={{
                                width: '100%',
                                padding: '0.5rem 0.85rem',
                                border: 'none',
                                borderTop: '1px solid #f1f5f9',
                                background: 'none',
                                fontSize: '0.8rem',
                                color: '#dc2626',
                                cursor: 'pointer',
                                textAlign: 'left',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.45rem',
                                fontWeight: 600,
                              }}
                            >
                              <Trash2 size={14} color="#dc2626" />
                              <span>Delete User</span>
                            </button>
                          )}
                        </div>
                      )}

                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── Pagination Footer ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.5rem 0',
          fontSize: '0.85rem',
          color: '#64748b',
        }}
      >
        <div>
          Showing {filteredUsers.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}–
          {Math.min(currentPage * pageSize, filteredUsers.length)} of {filteredUsers.length} users
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <button
            type="button"
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            style={{
              width: '32px',
              height: '32px',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              backgroundColor: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
              color: currentPage <= 1 ? '#cbd5e1' : '#0f172a',
            }}
          >
            <ChevronLeft size={16} />
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
            const isCurrent = p === currentPage;
            return (
              <button
                key={p}
                type="button"
                onClick={() => setCurrentPage(p)}
                style={{
                  width: '32px',
                  height: '32px',
                  border: isCurrent ? '1px solid #18181b' : '1px solid #e2e8f0',
                  borderRadius: '6px',
                  backgroundColor: isCurrent ? '#18181b' : '#ffffff',
                  color: isCurrent ? '#ffffff' : '#0f172a',
                  fontWeight: isCurrent ? 700 : 500,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                }}
              >
                {p}
              </button>
            );
          })}

          <button
            type="button"
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            style={{
              width: '32px',
              height: '32px',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              backgroundColor: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
              color: currentPage >= totalPages ? '#cbd5e1' : '#0f172a',
            }}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* ── Delete User Confirmation Modal ── */}
      {userToDelete && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              maxWidth: '480px',
              width: '100%',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              border: '1px solid #e2e8f0',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: '1.25rem 1.5rem',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    backgroundColor: '#fee2e2',
                    color: '#dc2626',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Trash2 size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>
                    Delete User Account
                  </h3>
                  <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0 }}>
                    Permanent deletion and access revocation
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '1.25rem 1.5rem' }}>
              <p style={{ fontSize: '0.875rem', color: '#334155', lineHeight: 1.5, margin: 0 }}>
                Are you sure you want to delete <strong>{getDisplayName(userToDelete)}</strong> (
                <span style={{ color: '#0f172a', fontWeight: 600 }}>{userToDelete.email}</span>)?
              </p>
              <div
                style={{
                  marginTop: '1rem',
                  padding: '0.75rem 1rem',
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  color: '#991b1b',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.5rem',
                }}
              >
                <AlertTriangle size={16} color="#dc2626" style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>
                  This action will permanently delete or revoke credentials for this user account.
                </span>
              </div>
            </div>

            <div
              style={{
                padding: '1rem 1.5rem',
                backgroundColor: '#f8fafc',
                borderTop: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '0.75rem',
              }}
            >
              <button
                type="button"
                disabled={isDeletingUser}
                onClick={() => setUserToDelete(null)}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: '#334155',
                  fontSize: '0.825rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingUser}
                onClick={handleConfirmDeleteUser}
                style={{
                  padding: '0.5rem 1.25rem',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: '#dc2626',
                  color: '#ffffff',
                  fontSize: '0.825rem',
                  fontWeight: 700,
                  cursor: isDeletingUser ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
              >
                {isDeletingUser ? <Loader2 className="animate-spin" size={15} /> : <Trash2 size={15} />}
                <span>{isDeletingUser ? 'Deleting...' : 'Confirm Delete'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── View User Details Modal ── */}
      {userToView && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              maxWidth: '520px',
              width: '100%',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
              border: '1px solid #e2e8f0',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: '1.25rem 1.5rem',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '8px',
                    backgroundColor: '#f1f5f9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    color: '#0f172a',
                  }}
                >
                  {getInitials(userToView)}
                </div>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>
                    {getDisplayName(userToView)}
                  </h3>
                  <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0 }}>
                    {userToView.email}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setUserToView(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: '0.5rem', fontSize: '0.825rem' }}>
                <span style={{ color: '#64748b', fontWeight: 600 }}>User ID:</span>
                <span style={{ color: '#0f172a', fontFamily: 'monospace', fontSize: '0.78rem' }}>{userToView.id}</span>

                <span style={{ color: '#64748b', fontWeight: 600 }}>Role:</span>
                <div>
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '0.2rem 0.6rem',
                      borderRadius: '12px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      ...getRoleBadgeStyle(userToView.role?.toString()),
                    }}
                  >
                    {formatRole(userToView.role?.toString())}
                  </span>
                </div>

                <span style={{ color: '#64748b', fontWeight: 600 }}>Account Status:</span>
                <div>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      fontSize: '0.82rem',
                      fontWeight: 500,
                      color: userToView.is_active ? '#15803d' : '#64748b',
                    }}
                  >
                    <span
                      style={{
                        width: '7px',
                        height: '7px',
                        borderRadius: '50%',
                        backgroundColor: userToView.is_active ? '#22c55e' : '#94a3b8',
                      }}
                    />
                    {userToView.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>


                <span style={{ color: '#64748b', fontWeight: 600 }}>Organization:</span>
                <span style={{ color: '#0f172a' }}>{getOrganizationName(userToView)}</span>

                <span style={{ color: '#64748b', fontWeight: 600 }}>Phone Number:</span>
                <span style={{ color: '#0f172a' }}>{userToView.phone_number || '—'}</span>

                <span style={{ color: '#64748b', fontWeight: 600 }}>Designation:</span>
                <span style={{ color: '#0f172a' }}>{userToView.designation || '—'}</span>

                <span style={{ color: '#64748b', fontWeight: 600 }}>Joined On:</span>
                <span style={{ color: '#0f172a' }}>{formatDate(userToView.created_at)}</span>
              </div>
            </div>

            <div
              style={{
                padding: '1rem 1.5rem',
                backgroundColor: '#f8fafc',
                borderTop: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'flex-end',
              }}
            >
              <button
                type="button"
                onClick={() => setUserToView(null)}
                style={{
                  padding: '0.5rem 1.25rem',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: '#334155',
                  fontSize: '0.825rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Invite User Slide-Out Drawer ── */}

      <InviteUserDrawer
        isOpen={isInviteOpen}
        onClose={() => setIsInviteOpen(false)}
        onSuccess={() => {
          fetchUsers();
        }}
      />
    </div>
  );
}
