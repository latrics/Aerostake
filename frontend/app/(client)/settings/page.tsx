'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Save,
  Bell,
  Building,
  AlertCircle,
  Loader2,
  Lock,
  User as UserIcon,
  Mail,
  Phone,
  Briefcase,
  Eye,
  EyeOff,
  CheckCircle2,
  ArrowRight,
  Award,
  Calendar,
  CreditCard as IdCard,
  ShieldCheck,
  LogOut,
  Trash2,
  AlertTriangle,
  X,
} from 'lucide-react';
import { usersApi } from '@/modules/users/api';
import { useAuth, authService } from '@/lib/auth';
import { setCookie } from '@/lib/api-client';
import { PageHeader } from '@/components/PageHeader';

export default function ClientSettingsPage() {
  const { user: authUser, refreshProfile } = useAuth();

  // Loading & Global Status
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 1. Personal Profile Form State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [designation, setDesignation] = useState('');
  // Pilot Profile Credentials State
  const [age, setAge] = useState<string | number>('');
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [dgcaLicenseNumber, setDgcaLicenseNumber] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  // 2. Password Change Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // 3. Notification Preferences State
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [pushAlerts, setPushAlerts] = useState(true);
  const [savingNotifications, setSavingNotifications] = useState(false);
  const [notificationSuccess, setNotificationSuccess] = useState(false);

  // 4. Organization Membership & Leave State
  const [companyName, setCompanyName] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>('client');
  const [showLeaveOrgModal, setShowLeaveOrgModal] = useState(false);
  const [isLeavingOrg, setIsLeavingOrg] = useState(false);
  const [leaveOrgSuccess, setLeaveOrgSuccess] = useState(false);
  const [leaveOrgError, setLeaveOrgError] = useState<string | null>(null);

  // 5. Delete Account State
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteAccountError, setDeleteAccountError] = useState<string | null>(null);


  // Load profile data on mount
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    usersApi
      .getMe()
      .then((userData) => {
        if (!isMounted) return;
        setFullName(userData.full_name || '');
        setEmail(userData.email || '');
        setPhone(userData.phone_number || '');
        setDesignation(
          userData.designation ||
            (userData.company_profile && (userData.company_profile as any).designation) ||
            (userData.company_profile &&
              (userData.company_profile as any).primary_contact &&
              (userData.company_profile as any).primary_contact.department) ||
            ''
        );
        setCompanyName(
          userData.company_name ||
            (userData.company_profile && (userData.company_profile as any).company_name) ||
            null
        );
        setUserRole(userData.role?.toString() || 'client');

        // Load Pilot Credentials if available
        if (userData.pilot_profile) {
          setAge(userData.pilot_profile.age ?? '');
          setAadhaarNumber(userData.pilot_profile.aadhaar_number ?? '');
          setDgcaLicenseNumber(userData.pilot_profile.dgca_license_number ?? '');
        } else if (userData.company_profile && (userData.company_profile as any).pilot_profile) {
          const pp = (userData.company_profile as any).pilot_profile;
          setAge(pp.age ?? '');
          setAadhaarNumber(pp.aadhaar_number ?? '');
          setDgcaLicenseNumber(pp.dgca_license_number ?? '');
        }
      })

      .catch((err: any) => {
        if (!isMounted) return;
        setError(err.message || 'Failed to load personal profile');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Handle Save Personal Profile Details
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileError(null);
    setProfileSuccess(false);

    if (!email.trim()) {
      setProfileError('Email address cannot be empty.');
      setSavingProfile(false);
      return;
    }

    const isPilot = userRole === 'pilot' || authUser?.role === 'pilot' || authUser?.role?.toString() === 'pilot';

    try {
      const updatePayload: any = {
        full_name: fullName.trim() || undefined,
        email: email.trim().toLowerCase(),
        phone_number: phone.trim() || undefined,
      };

      if (isPilot) {
        updatePayload.pilot_profile = {
          age: age ? String(age).trim() : undefined,
          aadhaar_number: aadhaarNumber.trim() || undefined,
          dgca_license_number: dgcaLicenseNumber.trim() || undefined,
        };
      } else {
        updatePayload.designation = designation.trim() || undefined;
      }

      await usersApi.updateProfile(updatePayload);

      if (refreshProfile) {
        await refreshProfile();
      }

      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 4000);
    } catch (err: any) {
      setProfileError(err.message || 'Failed to update personal credentials');
    } finally {
      setSavingProfile(false);
    }
  };

  // Handle Change Password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);

    if (!currentPassword) {
      setPasswordError('Please enter your current password.');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match. Please verify and try again.');
      return;
    }

    setSavingPassword(true);

    try {
      await usersApi.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      });

      setPasswordSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccess(false), 5000);
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to change password. Please check your current password.');
    } finally {
      setSavingPassword(false);
    }
  };

  // Handle Save Notification Preferences
  const handleSaveNotifications = (e: React.FormEvent) => {
    e.preventDefault();
    setSavingNotifications(true);
    setNotificationSuccess(false);

    setTimeout(() => {
      setSavingNotifications(false);
      setNotificationSuccess(true);
      setTimeout(() => setNotificationSuccess(false), 4000);
    }, 400);
  };

  // Handle Leave Organization
  const handleConfirmLeaveOrg = async () => {
    setIsLeavingOrg(true);
    setLeaveOrgError(null);
    setLeaveOrgSuccess(false);
    try {
      const updated = await usersApi.leaveOrganization();
      setCompanyName(null);
      setUserRole(updated.role?.toString() || 'client');
      setCookie('is_onboarded', 'false', 7);
      await refreshProfile();
      setShowLeaveOrgModal(false);
      setLeaveOrgSuccess(true);
    } catch (err: any) {
      setLeaveOrgError(err.message || 'Failed to leave organization workspace');
    } finally {
      setIsLeavingOrg(false);
    }
  };

  // Handle Self Account Deletion
  const handleConfirmDeleteAccount = async () => {
    setIsDeletingAccount(true);
    setDeleteAccountError(null);
    try {
      await usersApi.deleteMyAccount();
      authService.logout();
    } catch (err: any) {
      setDeleteAccountError(err.message || 'Failed to delete account');
      setIsDeletingAccount(false);
    }
  };


  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: '850px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Settings</h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Manage your personal profile credentials, contact details, job designation, and password security.
          </p>
        </div>
        <div className="wf-card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}>
            <Loader2 className="animate-spin" size={20} />
            <span>Loading personal settings...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '850px', paddingBottom: '3rem' }}>
      {/* Page Header */}
      <PageHeader
        title="Personal Settings"
        subtitle="Update your personal credentials, contact details, job designation, and password security."
      />

      {/* Global Error Banner if initial load failed */}
      {error && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1rem',
            backgroundColor: '#f4f4f5',
            border: '1px solid #09090b',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--error)',
            fontSize: '0.85rem',
          }}
        >
          <AlertCircle size={16} style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      {/* Quick Navigation Banner: Pilot Certification vs Company Profile */}
      {userRole === 'pilot' || authUser?.role === 'pilot' ? (
        <div
          className="wf-card"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem',
            padding: '1rem 1.25rem',
            backgroundColor: '#fafafa',
            border: '1.5px solid #09090b',
            borderRadius: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '8px',
                backgroundColor: '#ffffff',
                border: '1px solid #d4d4d8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Award size={22} color="#09090b" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.875rem', fontWeight: 800, color: '#09090b' }}>
                  DGCA Remote Pilot Certification & Identity
                </span>
                <span
                  style={{
                    fontSize: '0.675rem',
                    fontWeight: 700,
                    padding: '0.1rem 0.45rem',
                    backgroundColor: '#09090b',
                    color: '#ffffff',
                    borderRadius: '4px',
                  }}
                >
                  Active Pilot Roster
                </span>
              </div>
              <p style={{ fontSize: '0.75rem', color: '#71717a', marginTop: '0.15rem' }}>
                Commercial drone pilot licensed under DGCA / DigitalSky regulations and affiliated with LATRICS Flight Operations.
              </p>
            </div>
          </div>

          <Link
            href="/schedule"
            className="btn btn-outline"
            style={{
              fontSize: '0.8rem',
              height: '36px',
              padding: '0 1rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              textDecoration: 'none',
              fontWeight: 700,
              backgroundColor: '#ffffff',
            }}
          >
            <span>My Flight Schedule</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      ) : (
        <div
          className="wf-card"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem',
            padding: '1rem 1.25rem',
            backgroundColor: '#fafafa',
            border: '1.5px solid #09090b',
            borderRadius: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '6px',
                backgroundColor: '#ffffff',
                border: '1px solid #d4d4d8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Building size={20} color="#09090b" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#09090b' }}>
                  Company & Organization Profile
                </span>
                <span
                  style={{
                    fontSize: '0.675rem',
                    fontWeight: 700,
                    padding: '0.1rem 0.4rem',
                    backgroundColor: '#09090b',
                    color: '#ffffff',
                    borderRadius: '4px',
                  }}
                >
                  {authUser?.company_name || 'Organization'}
                </span>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                {authUser?.role === 'client_sub'
                  ? 'Your organization\'s company profile is managed by the Primary Client. Click to view details.'
                  : 'Looking to manage company registration, GST number, business address, or team invitations?'}
              </p>
            </div>
          </div>

          <Link
            href="/company-profile"
            className="btn btn-outline"
            style={{
              fontSize: '0.8rem',
              height: '36px',
              padding: '0 1rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              textDecoration: 'none',
              fontWeight: 700,
              backgroundColor: '#ffffff',
            }}
          >
            <span>Open Company Profile</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      )}

      {/* ── SECTION 1: Personal Credentials & Information ── */}
      <div className="wf-card">
        <div className="wf-card-header" style={{ paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <UserIcon size={18} color="#09090b" />
            <div>
              <h3 className="wf-title" style={{ fontSize: '0.95rem' }}>
                Personal Profile & Credentials
              </h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>
                Update your personal contact information, login email, and organizational designation.
              </p>
            </div>
          </div>
        </div>

        {profileError && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginTop: '1rem',
              padding: '0.75rem 1rem',
              backgroundColor: '#f4f4f5',
              border: '1px solid #09090b',
              borderRadius: '6px',
              color: 'var(--error)',
              fontSize: '0.825rem',
            }}
          >
            <AlertCircle size={15} style={{ flexShrink: 0 }} />
            <span>{profileError}</span>
          </div>
        )}

        {profileSuccess && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginTop: '1rem',
              padding: '0.75rem 1rem',
              backgroundColor: '#f4f4f5',
              border: '1px solid #d4d4d8',
              borderRadius: '6px',
              color: '#09090b',
              fontSize: '0.825rem',
              fontWeight: 600,
            }}
          >
            <CheckCircle2 size={16} color="#09090b" style={{ flexShrink: 0 }} />
            <span>Personal profile details updated successfully!</span>
          </div>
        )}

        <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1.25rem' }}>
          {userRole === 'pilot' || authUser?.role === 'pilot' ? (
            <>
              {/* Pilot Credentials Row 1: Name & Contact no. */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                {/* Name */}
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.775rem', fontWeight: 700, marginBottom: '0.35rem', color: '#09090b' }}>
                    <UserIcon size={14} color="#71717a" />
                    <span>Pilot Name</span>
                    <span style={{ color: '#09090b' }}>*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Vikramaditya Singh"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    className="form-input"
                    style={{ width: '100%', height: '38px', fontSize: '0.85rem' }}
                  />
                </div>

                {/* Contact no. */}
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.775rem', fontWeight: 700, marginBottom: '0.35rem', color: '#09090b' }}>
                    <Phone size={14} color="#71717a" />
                    <span>Contact Number</span>
                    <span style={{ color: '#09090b' }}>*</span>
                  </label>
                  <input
                    type="tel"
                    placeholder="e.g. +91 98765 43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    className="form-input"
                    style={{ width: '100%', height: '38px', fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              {/* Pilot Credentials Row 2: Age & Email */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                {/* Age */}
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.775rem', fontWeight: 700, marginBottom: '0.35rem', color: '#09090b' }}>
                    <Calendar size={14} color="#71717a" />
                    <span>Age (Years)</span>
                    <span style={{ color: '#09090b' }}>*</span>
                  </label>
                  <input
                    type="number"
                    min="18"
                    max="75"
                    placeholder="e.g. 28"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    required
                    className="form-input"
                    style={{ width: '100%', height: '38px', fontSize: '0.85rem' }}
                  />
                  <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                    Standard pilot flight eligibility under civil aviation rules.
                  </span>
                </div>

                {/* Email Address */}
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.775rem', fontWeight: 700, marginBottom: '0.35rem', color: '#09090b' }}>
                    <Mail size={14} color="#71717a" />
                    <span>Email Address (Login Credential)</span>
                    <span style={{ color: '#09090b' }}>*</span>
                  </label>
                  <input
                    type="email"
                    placeholder="e.g. pilot@latrics.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="form-input"
                    style={{ width: '100%', height: '38px', fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              {/* Pilot Credentials Row 3: Aadhaar no. & DGCA lisence no. */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                {/* Aadhaar no. */}
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.775rem', fontWeight: 700, marginBottom: '0.35rem', color: '#09090b' }}>
                    <IdCard size={14} color="#71717a" />
                    <span>Aadhaar Number</span>
                    <span style={{ color: '#09090b' }}>*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 5432 1098 7654"
                    value={aadhaarNumber}
                    onChange={(e) => setAadhaarNumber(e.target.value)}
                    required
                    className="form-input"
                    style={{ width: '100%', height: '38px', fontSize: '0.85rem' }}
                  />
                  <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                    12-digit UIDAI identity verification number.
                  </span>
                </div>

                {/* DGCA lisence no. */}
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.775rem', fontWeight: 700, marginBottom: '0.35rem', color: '#09090b' }}>
                    <Award size={14} color="#71717a" />
                    <span>DGCA License No. (RPC)</span>
                    <span style={{ color: '#09090b' }}>*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. DGCA-RPC-2024-88419"
                    value={dgcaLicenseNumber}
                    onChange={(e) => setDgcaLicenseNumber(e.target.value)}
                    required
                    className="form-input"
                    style={{ width: '100%', height: '38px', fontSize: '0.85rem' }}
                  />
                  <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                    Remote Pilot Certificate (RPC) issued under DGCA DigitalSky.
                  </span>
                </div>
              </div>
            </>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                {/* Full Name */}
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.775rem', fontWeight: 700, marginBottom: '0.35rem', color: '#09090b' }}>
                    <UserIcon size={14} color="#71717a" />
                    <span>Full Name</span>
                    <span style={{ color: '#09090b' }}>*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. John Doe"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    className="form-input"
                    style={{ width: '100%', height: '38px', fontSize: '0.85rem' }}
                  />
                </div>

                {/* Email Address */}
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.775rem', fontWeight: 700, marginBottom: '0.35rem', color: '#09090b' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Mail size={14} color="#71717a" />
                      <span>Email Address (Login Credential)</span>
                      <span style={{ color: '#09090b' }}>*</span>
                    </span>
                    {authUser?.role === 'client_sub' && (
                      <span style={{ fontSize: '0.675rem', color: '#71717a', display: 'inline-flex', alignItems: 'center', gap: '3px', fontWeight: 500 }}>
                        <Lock size={10} /> Locked to invitation
                      </span>
                    )}
                  </label>
                  <input
                    type="email"
                    disabled={authUser?.role === 'client_sub'}
                    readOnly={authUser?.role === 'client_sub'}
                    placeholder="e.g. john.doe@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="form-input"
                    style={{
                      width: '100%',
                      height: '38px',
                      fontSize: '0.85rem',
                      backgroundColor: authUser?.role === 'client_sub' ? '#f4f4f5' : '#ffffff',
                      cursor: authUser?.role === 'client_sub' ? 'not-allowed' : undefined,
                      color: '#09090b',
                    }}
                  />
                  <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                    {authUser?.role === 'client_sub'
                      ? 'Bound to your organization workspace invitation.'
                      : 'Used for account sign in, portal notifications, and project communications.'}
                  </span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                {/* Phone Number */}
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.775rem', fontWeight: 700, marginBottom: '0.35rem', color: '#09090b' }}>
                    <Phone size={14} color="#71717a" />
                    <span>Contact Phone Number</span>
                  </label>
                  <input
                    type="tel"
                    placeholder="e.g. +91 98765 43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="form-input"
                    style={{ width: '100%', height: '38px', fontSize: '0.85rem' }}
                  />
                </div>

                {/* Designation / Department */}
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.775rem', fontWeight: 700, marginBottom: '0.35rem', color: '#09090b' }}>
                    <Briefcase size={14} color="#71717a" />
                    <span>Job Designation / Department</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Project Manager, Lead Surveyor, GIS Specialist"
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    className="form-input"
                    style={{ width: '100%', height: '38px', fontSize: '0.85rem' }}
                  />
                </div>
              </div>
            </>
          )}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', paddingTop: '0.5rem' }}>
            <button
              type="submit"
              disabled={savingProfile}
              className="btn btn-primary"
              style={{
                height: '38px',
                padding: '0 1.25rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                fontSize: '0.825rem',
                fontWeight: 700,
              }}
            >
              {savingProfile ? <Loader2 className="animate-spin" size={15} /> : <Save size={15} />}
              <span>{savingProfile ? 'Saving Changes...' : 'Save Profile Details'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* ── SECTION 2: Password & Account Security ── */}
      <div className="wf-card">
        <div className="wf-card-header" style={{ paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Lock size={18} color="#09090b" />
            <div>
              <h3 className="wf-title" style={{ fontSize: '0.95rem' }}>
                Change Password & Security
              </h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>
                Ensure your account is using a secure password (minimum 6 characters).
              </p>
            </div>
          </div>
        </div>

        {passwordError && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginTop: '1rem',
              padding: '0.75rem 1rem',
              backgroundColor: '#f4f4f5',
              border: '1px solid #09090b',
              borderRadius: '6px',
              color: 'var(--error)',
              fontSize: '0.825rem',
            }}
          >
            <AlertCircle size={15} style={{ flexShrink: 0 }} />
            <span>{passwordError}</span>
          </div>
        )}

        {passwordSuccess && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginTop: '1rem',
              padding: '0.75rem 1rem',
              backgroundColor: '#f4f4f5',
              border: '1px solid #d4d4d8',
              borderRadius: '6px',
              color: '#09090b',
              fontSize: '0.825rem',
              fontWeight: 600,
            }}
          >
            <ShieldCheck size={16} color="#09090b" style={{ flexShrink: 0 }} />
            <span>Password updated successfully! Your account credentials have been updated.</span>
          </div>
        )}

        <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1.25rem' }}>
          {/* Current Password */}
          <div style={{ maxWidth: '400px' }}>
            <label style={{ display: 'block', fontSize: '0.775rem', fontWeight: 700, marginBottom: '0.35rem', color: '#09090b' }}>
              Current Password <span style={{ color: '#09090b' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showCurrentPw ? 'text' : 'password'}
                placeholder="Enter current password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                className="form-input"
                style={{ width: '100%', height: '38px', paddingRight: '2.5rem', fontSize: '0.85rem' }}
              />
              <button
                type="button"
                onClick={() => setShowCurrentPw(!showCurrentPw)}
                style={{
                  position: 'absolute',
                  right: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#71717a',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                {showCurrentPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
            {/* New Password */}
            <div>
              <label style={{ display: 'block', fontSize: '0.775rem', fontWeight: 700, marginBottom: '0.35rem', color: '#09090b' }}>
                New Password <span style={{ color: '#09090b' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showNewPw ? 'text' : 'password'}
                  placeholder="Minimum 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  className="form-input"
                  style={{ width: '100%', height: '38px', paddingRight: '2.5rem', fontSize: '0.85rem' }}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPw(!showNewPw)}
                  style={{
                    position: 'absolute',
                    right: '0.75rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#71717a',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  {showNewPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Confirm New Password */}
            <div>
              <label style={{ display: 'block', fontSize: '0.775rem', fontWeight: 700, marginBottom: '0.35rem', color: '#09090b' }}>
                Confirm New Password <span style={{ color: '#09090b' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showConfirmPw ? 'text' : 'password'}
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="form-input"
                  style={{ width: '100%', height: '38px', paddingRight: '2.5rem', fontSize: '0.85rem' }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPw(!showConfirmPw)}
                  style={{
                    position: 'absolute',
                    right: '0.75rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#71717a',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  {showConfirmPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', paddingTop: '0.5rem' }}>
            <button
              type="submit"
              disabled={savingPassword}
              className="btn btn-primary"
              style={{
                height: '38px',
                padding: '0 1.25rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                fontSize: '0.825rem',
                fontWeight: 700,
              }}
            >
              {savingPassword ? <Loader2 className="animate-spin" size={15} /> : <Lock size={15} />}
              <span>{savingPassword ? 'Updating Password...' : 'Update Password'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* ── SECTION 3: Notification Preferences ── */}
      <div className="wf-card">
        <div className="wf-card-header" style={{ paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Bell size={18} color="#09090b" />
            <div>
              <h3 className="wf-title" style={{ fontSize: '0.95rem' }}>
                Notification Preferences
              </h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>
                Configure how and when you receive survey updates, quotation approvals, and flight reports.
              </p>
            </div>
          </div>
        </div>

        {notificationSuccess && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginTop: '1rem',
              padding: '0.75rem 1rem',
              backgroundColor: '#f4f4f5',
              border: '1px solid #d4d4d8',
              borderRadius: '6px',
              color: '#09090b',
              fontSize: '0.825rem',
              fontWeight: 600,
            }}
          >
            <CheckCircle2 size={16} color="#09090b" style={{ flexShrink: 0 }} />
            <span>Notification preferences saved successfully!</span>
          </div>
        )}

        <form onSubmit={handleSaveNotifications} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1.25rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <label
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.75rem',
                cursor: 'pointer',
                padding: '0.75rem',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                backgroundColor: '#ffffff',
              }}
            >
              <input
                type="checkbox"
                checked={emailAlerts}
                onChange={(e) => setEmailAlerts(e.target.checked)}
                style={{ width: '17px', height: '17px', marginTop: '2px', accentColor: '#09090b', cursor: 'pointer' }}
              />
              <div>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#09090b' }}>
                  Transactional Email Notifications
                </span>
                <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                  Receive flight status updates, quotation approvals, invoice receipts, and deliverable download links via email.
                </span>
              </div>
            </label>

            <label
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.75rem',
                cursor: 'pointer',
                padding: '0.75rem',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                backgroundColor: '#ffffff',
              }}
            >
              <input
                type="checkbox"
                checked={pushAlerts}
                onChange={(e) => setPushAlerts(e.target.checked)}
                style={{ width: '17px', height: '17px', marginTop: '2px', accentColor: '#09090b', cursor: 'pointer' }}
              />
              <div>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#09090b' }}>
                  Browser & Web Push Notifications
                </span>
                <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                  Instant push alerts when a drone mission starts or finishes, or when staff post updates in project chat.
                </span>
              </div>
            </label>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', paddingTop: '0.5rem' }}>
            <button
              type="submit"
              disabled={savingNotifications}
              className="btn btn-primary"
              style={{
                height: '38px',
                padding: '0 1.25rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                fontSize: '0.825rem',
                fontWeight: 700,
              }}
            >
              {savingNotifications ? <Loader2 className="animate-spin" size={15} /> : <Save size={15} />}
              <span>{savingNotifications ? 'Saving...' : 'Save Notification Preferences'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* ── SECTION 4: Organization Membership & Workspace ── */}
      {userRole !== 'pilot' && (
        <div className="wf-card">
          <div className="wf-card-header" style={{ paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Building size={18} color="#09090b" />
              <div>
                <h3 className="wf-title" style={{ fontSize: '0.95rem' }}>
                  Organization & Company Workspace
                </h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>
                  View your current company affiliation and manage workspace membership.
                </p>
              </div>
            </div>
          </div>

          {leaveOrgSuccess && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginTop: '1rem',
                padding: '0.75rem 1rem',
                backgroundColor: '#f4f4f5',
                border: '1px solid #d4d4d8',
                borderRadius: '6px',
                color: '#09090b',
                fontSize: '0.825rem',
                fontWeight: 600,
              }}
            >
              <CheckCircle2 size={16} color="#09090b" style={{ flexShrink: 0 }} />
              <span>You have successfully left the organization workspace. Your account has returned to an individual client profile.</span>
            </div>
          )}

          {leaveOrgError && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginTop: '1rem',
                padding: '0.75rem 1rem',
                backgroundColor: '#f4f4f5',
                border: '1px solid #d4d4d8',
                borderRadius: '6px',
                color: '#09090b',
                fontSize: '0.825rem',
                fontWeight: 600,
              }}
            >
              <AlertCircle size={16} color="#09090b" style={{ flexShrink: 0 }} />
              <span>{leaveOrgError}</span>
            </div>
          )}

          <div style={{ marginTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div
              style={{
                padding: '1rem',
                borderRadius: '6px',
                backgroundColor: '#fafafa',
                border: '1px solid var(--border-color)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '1rem',
                flexWrap: 'wrap',
              }}
            >
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  CURRENT COMPANY / WORKSPACE
                </div>
                <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#09090b', marginTop: '0.2rem' }}>
                  {companyName || 'Individual Account (No Company Linked)'}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                  Role: <span style={{ fontWeight: 600, color: '#09090b' }}>
                    {userRole === 'client_sub' ? 'Client Team Member' : userRole === 'client_primary' ? 'Primary Client' : 'Individual Client'}
                  </span>
                </div>
              </div>

              {companyName ? (
                <button
                  type="button"
                  onClick={() => setShowLeaveOrgModal(true)}
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '6px',
                    border: '1px solid #d4d4d8',
                    backgroundColor: '#ffffff',
                    color: '#09090b',
                    fontSize: '0.825rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    transition: 'background-color 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f4f4f5')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ffffff')}
                >
                  <LogOut size={15} color="#09090b" />
                  <span>Leave Organization</span>
                </button>
              ) : (
                <span
                  style={{
                    fontSize: '0.8rem',
                    color: 'var(--text-secondary)',
                    backgroundColor: '#ffffff',
                    border: '1px solid var(--border-color)',
                    padding: '0.35rem 0.75rem',
                    borderRadius: '6px',
                  }}
                >
                  Independent Client
                </span>
              )}
            </div>

            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
              {companyName
                ? 'Leaving this organization will disconnect your user account from team project communications and shared company data. You will retain your personal login credentials as an individual client.'
                : 'You are currently an individual client. If invited to an organization by an enterprise client, your team workspace affiliation will appear here.'}
            </p>
          </div>
        </div>
      )}

      {/* ── SECTION 5: Danger Zone ── */}
      <div
        className="wf-card"
        style={{
          border: '1px solid #d4d4d8',
          backgroundColor: '#fafafa',
        }}
      >
        <div className="wf-card-header" style={{ paddingBottom: '0.75rem', borderBottom: '1px solid #f4f4f5' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertTriangle size={18} color="#09090b" />
            <div>
              <h3 className="wf-title" style={{ fontSize: '0.95rem', color: '#09090b' }}>
                Danger Zone
              </h3>
              <p style={{ fontSize: '0.75rem', color: '#09090b', marginTop: '0.1rem' }}>
                Irreversible account deletion and deactivation
              </p>
            </div>
          </div>
        </div>

        {deleteAccountError && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginTop: '1rem',
              padding: '0.75rem 1rem',
              backgroundColor: '#f4f4f5',
              border: '1px solid #d4d4d8',
              borderRadius: '6px',
              color: '#09090b',
              fontSize: '0.825rem',
              fontWeight: 600,
            }}
          >
            <AlertCircle size={16} color="#09090b" style={{ flexShrink: 0 }} />
            <span>{deleteAccountError}</span>
          </div>
        )}

        <div
          style={{
            marginTop: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            flexWrap: 'wrap',
          }}
        >
          <div>
            <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#09090b' }}>
              Delete Personal Account
            </div>
            <div style={{ fontSize: '0.78rem', color: '#09090b', marginTop: '0.2rem', maxWidth: '520px', lineHeight: 1.4 }}>
              Permanently deactivate and delete your account. You will immediately lose access to the Aerostake portal, active projects, and joint ownership features.
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowDeleteAccountModal(true)}
            style={{
              padding: '0.5rem 1.15rem',
              borderRadius: '6px',
              border: '1px solid #09090b',
              backgroundColor: '#09090b',
              color: '#ffffff',
              fontSize: '0.825rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
            }}
          >
            <Trash2 size={15} color="#ffffff" />
            <span>Delete Account</span>
          </button>
        </div>
      </div>

      {/* ── Modal: Leave Organization Confirmation ── */}
      {showLeaveOrgModal && (
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
              maxWidth: '460px',
              width: '100%',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
              border: '1px solid #e4e4e7',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: '1.25rem 1.5rem',
                borderBottom: '1px solid #e4e4e7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <LogOut size={18} color="#09090b" />
                <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: '#09090b' }}>
                  Leave Organization Workspace
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowLeaveOrgModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#71717a' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '1.25rem 1.5rem' }}>
              <p style={{ fontSize: '0.875rem', color: '#27272a', lineHeight: 1.5, margin: 0 }}>
                Are you sure you want to leave <strong>{companyName || 'your company'}</strong>?
              </p>
              <div
                style={{
                  marginTop: '1rem',
                  padding: '0.75rem 1rem',
                  backgroundColor: '#fafafa',
                  border: '1px solid #f4f4f5',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  color: '#27272a',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.5rem',
                }}
              >
                <AlertTriangle size={16} color="#09090b" style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>
                  You will lose access to team project communications and shared company deliverables. Your account will revert to an individual profile.
                </span>
              </div>
            </div>

            <div
              style={{
                padding: '1rem 1.5rem',
                backgroundColor: '#fafafa',
                borderTop: '1px solid #e4e4e7',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '0.75rem',
              }}
            >
              <button
                type="button"
                disabled={isLeavingOrg}
                onClick={() => setShowLeaveOrgModal(false)}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  border: '1px solid #d4d4d8',
                  backgroundColor: '#ffffff',
                  color: '#27272a',
                  fontSize: '0.825rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isLeavingOrg}
                onClick={handleConfirmLeaveOrg}
                style={{
                  padding: '0.5rem 1.25rem',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: '#09090b',
                  color: '#ffffff',
                  fontSize: '0.825rem',
                  fontWeight: 700,
                  cursor: isLeavingOrg ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
              >
                {isLeavingOrg ? <Loader2 className="animate-spin" size={15} /> : <LogOut size={15} />}
                <span>{isLeavingOrg ? 'Leaving...' : 'Confirm Leave'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Delete Account Confirmation ── */}
      {showDeleteAccountModal && (
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
              maxWidth: '460px',
              width: '100%',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
              border: '1px solid #e4e4e7',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: '1.25rem 1.5rem',
                borderBottom: '1px solid #e4e4e7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Trash2 size={18} color="#09090b" />
                <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: '#09090b' }}>
                  Delete Account Confirmation
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowDeleteAccountModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#71717a' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '1.25rem 1.5rem' }}>
              <p style={{ fontSize: '0.875rem', color: '#27272a', lineHeight: 1.5, margin: 0 }}>
                Are you sure you want to permanently delete your account (<strong>{email}</strong>)?
              </p>
              <div
                style={{
                  marginTop: '1rem',
                  padding: '0.75rem 1rem',
                  backgroundColor: '#f4f4f5',
                  border: '1px solid #d4d4d8',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  color: '#09090b',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.5rem',
                }}
              >
                <AlertTriangle size={16} color="#09090b" style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>
                  This action is permanent and cannot be undone. All active sessions and credentials will be terminated immediately.
                </span>
              </div>
            </div>

            <div
              style={{
                padding: '1rem 1.5rem',
                backgroundColor: '#fafafa',
                borderTop: '1px solid #e4e4e7',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '0.75rem',
              }}
            >
              <button
                type="button"
                disabled={isDeletingAccount}
                onClick={() => setShowDeleteAccountModal(false)}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  border: '1px solid #d4d4d8',
                  backgroundColor: '#ffffff',
                  color: '#27272a',
                  fontSize: '0.825rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingAccount}
                onClick={handleConfirmDeleteAccount}
                style={{
                  padding: '0.5rem 1.25rem',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: '#09090b',
                  color: '#ffffff',
                  fontSize: '0.825rem',
                  fontWeight: 700,
                  cursor: isDeletingAccount ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
              >
                {isDeletingAccount ? <Loader2 className="animate-spin" size={15} /> : <Trash2 size={15} />}
                <span>{isDeletingAccount ? 'Deleting...' : 'Delete My Account'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

