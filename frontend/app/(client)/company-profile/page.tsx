'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ChevronLeft,
  Calendar,
  Trash2,
  Info,
  Check,
  X,
  AlertCircle,
  Loader2,
  Building,
  User,
  MapPin,
  Users,
  Copy,
  Mail,
  Eye,
  RefreshCw,
  ExternalLink,
  Send,
  Lock,
  CheckCircle2,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { setCookie } from '@/lib/api-client';
import { usersApi } from '@/modules/users/api';
import { invitationsApi } from '@/modules/invitations/api';
import { InvitationOut } from '@/modules/invitations/types';
import { CompanyProfileData, TeamMemberContact } from '@/modules/users/types';
import { Portal } from '@/components/Portal';
import { PageHeader } from '@/components/PageHeader';

// Indian States & Union Territories
const INDIAN_STATES = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  'Delhi',
  'Chandigarh',
  'Jammu and Kashmir',
  'Ladakh',
  'Puducherry',
];

const INDUSTRIES = [
  'Infrastructure & Construction',
  'Mining & Minerals',
  'Energy, Oil & Gas',
  'Renewable Energy (Solar & Wind)',
  'Surveying, Mapping & GIS',
  'Agriculture & Forestry',
  'Urban Planning & Real Estate',
  'Telecommunications',
  'Government Agency / PSU',
  'Environmental & Water Resources',
  'Transportation & Railways',
  'Other',
];

const COMPANY_TYPES = [
  'Private Limited',
  'Public Limited',
  'Limited Liability Partnership (LLP)',
  'Partnership Firm',
  'Sole Proprietorship',
  'Government Enterprise / PSU',
  'Non-Profit / NGO',
  'Other',
];

function CompanyProfileFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isFirstTime = searchParams?.get('first_time') === 'true';
  const { user, refreshProfile } = useAuth();
  const isSubClient = user?.role === 'client_sub' || user?.role?.toString() === 'client_sub';

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 1. Company Information State
  const [companyName, setCompanyName] = useState('');
  const [industry, setIndustry] = useState('');
  const [companyType, setCompanyType] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [yearOfEstablishment, setYearOfEstablishment] = useState('');
  const [website, setWebsite] = useState('');
  const [companyDescription, setCompanyDescription] = useState('');

  // 2. Company Address State
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [state, setState] = useState('');
  const [country, setCountry] = useState('India');

  // 3. Primary Contact (You)
  const [primaryFullName, setPrimaryFullName] = useState('');
  const [primaryPhoneCode, setPrimaryPhoneCode] = useState('+91');
  const [primaryPhone, setPrimaryPhone] = useState('');
  const [primaryEmail, setPrimaryEmail] = useState('');
  const [primaryDepartment, setPrimaryDepartment] = useState('');

  // 4. Team Members (Subordinate Contacts) - 4 Rows
  const [teamMembers, setTeamMembers] = useState<TeamMemberContact[]>([
    { id: 1, full_name: '', email: '', phone_number: '', department: '' },
    { id: 2, full_name: '', email: '', phone_number: '', department: '' },
    { id: 3, full_name: '', email: '', phone_number: '', department: '' },
    { id: 4, full_name: '', email: '', phone_number: '', department: '' },
  ]);

  // Invitations State
  const [invitations, setInvitations] = useState<InvitationOut[]>([]);
  const [copiedActionId, setCopiedActionId] = useState<string | null>(null);
  const [selectedMemberForInvite, setSelectedMemberForInvite] = useState<{
    member: TeamMemberContact;
    invite: InvitationOut | null;
    index: number;
  } | null>(null);
  const [isGeneratingInviteFor, setIsGeneratingInviteFor] = useState<string | null>(null);

  const loadInvitations = async () => {
    try {
      const data = await invitationsApi.getOrganizationInvitations();
      setInvitations(data || []);
    } catch (err) {
      console.error('Failed to load organization invitations:', err);
    }
  };

  // Load existing profile from API
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    loadInvitations();

    usersApi
      .getMe()
      .then((profile) => {
        if (!isMounted) return;

        const isUserSub = profile.role === 'client_sub' || profile.role?.toString() === 'client_sub';

        // Basic company name
        setCompanyName(profile.company_name || '');

        // Detailed company_profile object if exists
        const cp = profile.company_profile;

        if (isUserSub && cp?.primary_contact) {
          // Sub-clients see the Primary Client's contact information
          setPrimaryFullName(cp.primary_contact.full_name || '');
          setPrimaryEmail(cp.primary_contact.email || '');
          if (cp.primary_contact.department) setPrimaryDepartment(cp.primary_contact.department);
          if (cp.primary_contact.phone_number) {
            const phoneParts = cp.primary_contact.phone_number.split(' ');
            if (phoneParts.length > 1 && phoneParts[0].startsWith('+')) {
              setPrimaryPhoneCode(phoneParts[0]);
              setPrimaryPhone(phoneParts.slice(1).join(' '));
            } else {
              setPrimaryPhone(cp.primary_contact.phone_number);
            }
          }
        } else {
          setPrimaryFullName(profile.full_name || '');
          setPrimaryEmail(profile.email || '');

          if (profile.phone_number) {
            const phoneParts = profile.phone_number.split(' ');
            if (phoneParts.length > 1 && phoneParts[0].startsWith('+')) {
              setPrimaryPhoneCode(phoneParts[0]);
              setPrimaryPhone(phoneParts.slice(1).join(' '));
            } else {
              setPrimaryPhone(profile.phone_number);
            }
          }

          if (cp?.primary_contact?.department) {
            setPrimaryDepartment(cp.primary_contact.department);
          }
        }

        if (cp) {
          if (cp.industry) setIndustry(cp.industry);
          if (cp.company_type) setCompanyType(cp.company_type);
          if (cp.gst_number) setGstNumber(cp.gst_number);
          if (cp.registration_number) setRegistrationNumber(cp.registration_number);
          if (cp.year_of_establishment) setYearOfEstablishment(cp.year_of_establishment);
          if (cp.website) setWebsite(cp.website);
          if (cp.company_description) setCompanyDescription(cp.company_description);

          if (cp.address) {
            setAddressLine1(cp.address.address_line1 || '');
            setAddressLine2(cp.address.address_line2 || '');
            setCity(cp.address.city || '');
            setPinCode(cp.address.pin_code || '');
            setState(cp.address.state || '');
            setCountry(cp.address.country || 'India');
          }

          if (cp.primary_contact) {
            if (cp.primary_contact.department) setPrimaryDepartment(cp.primary_contact.department);
          }

          if (cp.team_members && Array.isArray(cp.team_members) && cp.team_members.length > 0) {
            const loaded = cp.team_members.slice(0, 4);
            const padded: TeamMemberContact[] = [
              ...loaded,
              ...Array(Math.max(0, 4 - loaded.length))
                .fill(null)
                .map((_, i) => ({
                  id: loaded.length + i + 1,
                  full_name: '',
                  email: '',
                  phone_number: '',
                  department: '',
                })),
            ];
            setTeamMembers(padded);
          }
        }
      })
      .catch((err) => {
        console.error('Error fetching profile:', err);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleUpdateTeamMember = (index: number, field: keyof TeamMemberContact, value: string) => {
    setTeamMembers((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleClearTeamMember = (index: number) => {
    setTeamMembers((prev) => {
      const copy = [...prev];
      copy[index] = { id: copy[index].id, full_name: '', email: '', phone_number: '', department: '' };
      return copy;
    });
  };

  const handleGenerateOrRefreshInvite = async (memberEmail: string) => {
    if (!memberEmail.trim()) return;
    try {
      setIsGeneratingInviteFor(memberEmail.trim());
      const updatedInvite = await invitationsApi.resendOrganizationInvitation(memberEmail.trim());
      setInvitations((prev) => {
        const filtered = prev.filter((i) => i.email.toLowerCase() !== memberEmail.toLowerCase().trim());
        return [updatedInvite, ...filtered];
      });
      setSelectedMemberForInvite((prev) => {
        if (prev && prev.member.email.toLowerCase() === memberEmail.toLowerCase().trim()) {
          return { ...prev, invite: updatedInvite };
        }
        return prev;
      });
      setSuccessMessage(`Active 24-hour invitation generated for ${memberEmail}`);
      setTimeout(() => setSuccessMessage(null), 3500);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to generate invitation link');
      setTimeout(() => setErrorMessage(null), 4000);
    } finally {
      setIsGeneratingInviteFor(null);
    }
  };

  const getInviteUrl = (invite: InvitationOut | null, fallbackToken?: string) => {
    const token = invite?.token || fallbackToken || '';
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
    return `${origin}/accept-invite?token=${encodeURIComponent(token)}`;
  };

  const generateEmailHtml = (member: TeamMemberContact, invite: InvitationOut | null) => {
    const inviteUrl = getInviteUrl(invite);
    const memberName = member.full_name?.trim() || 'Team Member';
    const inviterName = primaryFullName.trim() || user?.full_name || user?.email || 'Team Administrator';
    const compName = companyName.trim() || user?.company_name || 'Our Company';

    return `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; border: 1px solid #e4e4e7; border-radius: 8px; background-color: #ffffff; padding: 28px; color: #09090b;">
  <div style="border-bottom: 2px solid #09090b; padding-bottom: 14px; margin-bottom: 20px;">
    <div style="font-size: 11px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: #71717a;">Latrics Joint Ownership & Drone Survey Portal</div>
    <h1 style="margin: 6px 0 0 0; font-size: 20px; font-weight: 800; color: #09090b;">Aerostake Team Invitation</h1>
  </div>
  <p style="font-size: 14px; line-height: 1.6; color: #18181b; margin: 0 0 14px 0;">
    Hello <strong>${memberName}</strong>,
  </p>
  <p style="font-size: 14px; line-height: 1.6; color: #3f3f46; margin: 0 0 20px 0;">
    <strong>${inviterName}</strong> has added you to the <strong>${compName}</strong> team workspace on Aerostake. You have been granted access to collaborate on project requests, planning reviews, flight updates, and deliverables.
  </p>
  
  <!-- Outlook-Bulletproof Coloured Button (Preserves background colour across Outlook Web, Outlook Desktop, Gmail, and Yahoo) -->
  <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse: separate; margin: 24px 0;">
    <tbody>
      <tr>
        <td align="center" valign="middle" bgcolor="#09090b" style="background-color: #09090b; border: 1px solid #09090b; border-radius: 6px; padding: 13px 28px; text-align: center;">
          <!--[if mso]>
          <v:rect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${inviteUrl}" style="height:44px;v-text-anchor:middle;width:260px;" stroke="f" fillcolor="#09090b">
            <w:anchorlock/>
            <center style="color:#ffffff;font-family:-apple-system,sans-serif;font-size:14px;font-weight:bold;">Accept Invitation &amp; Set Password</center>
          </v:rect>
          <![endif]-->
          <a href="${inviteUrl}" target="_blank" style="color: #ffffff !important; text-decoration: none !important; font-size: 14px; font-weight: 700; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: inline-block;">
            <span style="color: #ffffff !important; text-decoration: none !important; font-weight: 700;">Accept Invitation &amp; Set Password</span>
          </a>
        </td>
      </tr>
    </tbody>
  </table>

  <div style="background-color: #f4f4f5; border-left: 4px solid #09090b; padding: 12px 16px; border-radius: 4px; margin: 20px 0;">
    <p style="margin: 0; font-size: 13px; color: #18181b; font-weight: 700;">Important Validity Notice:</p>
    <p style="margin: 4px 0 0 0; font-size: 12px; color: #52525b; line-height: 1.5;">This invitation link is valid for 24 hours. Please click above to establish your credentials and join the workspace.</p>
  </div>
  <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 24px 0;" />
  <p style="font-size: 12px; line-height: 1.5; color: #71717a; margin: 0;">
    If the button above does not work, copy and paste this URL into your web browser:<br />
    <a href="${inviteUrl}" style="color: #09090b; text-decoration: underline; word-break: break-all;">${inviteUrl}</a>
  </p>
</div>`;
  };

  const generateEmailPlainText = (member: TeamMemberContact, invite: InvitationOut | null) => {
    const inviteUrl = getInviteUrl(invite);
    const memberName = member.full_name?.trim() || 'Team Member';
    const inviterName = primaryFullName.trim() || user?.full_name || user?.email || 'Team Administrator';
    const compName = companyName.trim() || user?.company_name || 'Our Company';

    return `Latrics Joint Ownership & Drone Survey Portal\nAerostake Workspace Invitation\n\nHello ${memberName},\n\n${inviterName} has invited you to collaborate on the ${compName} workspace for drone survey project requests, flight reviews, and deliverables.\n\n[Accept Invitation & Set Password](${inviteUrl})\n\nImportant Validity Notice:\nThis invitation link is valid for 24 hours. Please click above to establish your credentials and join the workspace.\n\nIf the button above does not work, copy and paste this URL into your web browser:\n${inviteUrl}\n`;
  };

  const openEmailPlatform = (
    platform: 'gmail' | 'outlook-live' | 'outlook-office' | 'yahoo' | 'mailto',
    member: TeamMemberContact,
    invite: InvitationOut | null
  ) => {
    // Copy the rich HTML layout to clipboard in parallel so it's ready to paste
    handleCopyEmailLayout(0, member, invite).catch((err) => console.warn('Failed copying HTML to clipboard:', err));

    const compName = companyName.trim() || user?.company_name || 'Our Company';
    const subject = `Invitation to join ${compName} on Aerostake`;
    const to = member.email.trim();
    const body = generateEmailPlainText(member, invite);

    if (platform === 'gmail') {
      window.open(
        `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(to)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
        '_blank'
      );
    } else if (platform === 'outlook-live') {
      window.open(
        `https://outlook.live.com/mail/0/deeplink/compose?to=${encodeURIComponent(to)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
        '_blank'
      );
    } else if (platform === 'outlook-office') {
      window.open(
        `https://outlook.office.com/mail/deeplink/compose?to=${encodeURIComponent(to)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
        '_blank'
      );
    } else if (platform === 'yahoo') {
      window.open(
        `https://compose.mail.yahoo.com/?to=${encodeURIComponent(to)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
        '_blank'
      );
    } else if (platform === 'mailto') {
      window.location.href = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    }
  };

  const handleCopyInviteLink = async (memberIndex: number, invite: InvitationOut | null) => {
    if (!invite?.token) return;
    const url = getInviteUrl(invite);
    try {
      await navigator.clipboard.writeText(url);
      setCopiedActionId(`link-${memberIndex}`);
      setTimeout(() => setCopiedActionId(null), 2500);
    } catch (e) {
      console.error('Failed to copy link', e);
    }
  };

  const handleCopyEmailLayout = async (
    memberIndex: number,
    member: TeamMemberContact,
    invite: InvitationOut | null
  ) => {
    const html = generateEmailHtml(member, invite);
    const plain = generateEmailPlainText(member, invite);
    try {
      if (typeof window !== 'undefined' && navigator.clipboard && window.ClipboardItem) {
        const htmlBlob = new Blob([html], { type: 'text/html' });
        const textBlob = new Blob([plain], { type: 'text/plain' });
        await navigator.clipboard.write([
          new ClipboardItem({
            'text/html': htmlBlob,
            'text/plain': textBlob,
          }),
        ]);
      } else {
        await navigator.clipboard.writeText(plain);
      }
      setCopiedActionId(`email-${memberIndex}`);
      setTimeout(() => setCopiedActionId(null), 2500);
    } catch (e) {
      console.error('Failed to copy formatted email, falling back to text', e);
      try {
        await navigator.clipboard.writeText(plain);
        setCopiedActionId(`email-${memberIndex}`);
        setTimeout(() => setCopiedActionId(null), 2500);
      } catch (err2) {
        console.error('Failed fallback clipboard write', err2);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (isSubClient) {
      setErrorMessage('Sub-clients cannot edit the organization company profile. You can update your personal credentials in Settings.');
      return;
    }

    // Form Validations
    if (!companyName.trim()) {
      setErrorMessage('Company Name is required.');
      return;
    }
    if (!industry) {
      setErrorMessage('Please select an Industry / Sector.');
      return;
    }
    if (!companyType) {
      setErrorMessage('Please select a Company Type.');
      return;
    }
    if (!addressLine1.trim() || !city.trim() || !pinCode.trim() || !state) {
      setErrorMessage('Please fill in the complete company address (Address Line 1, City, PIN Code, State).');
      return;
    }
    if (!primaryFullName.trim()) {
      setErrorMessage('Primary contact full name is required.');
      return;
    }
    if (!primaryPhone.trim()) {
      setErrorMessage('Primary contact phone number is required.');
      return;
    }
    if (!primaryDepartment.trim()) {
      setErrorMessage('Primary contact department / designation is required.');
      return;
    }

    try {
      setIsSaving(true);

      // Validate team members if partially filled (adding team members is optional)
      for (let i = 0; i < teamMembers.length; i++) {
        const m = teamMembers[i];
        const hasName = m.full_name.trim() !== '';
        const hasEmail = m.email.trim() !== '';
        if (hasName && !hasEmail) {
          setErrorMessage(`Please enter an email address for team member #${i + 1} (${m.full_name}) or clear the row.`);
          setIsSaving(false);
          return;
        }
        if (!hasName && hasEmail) {
          setErrorMessage(`Please enter a full name for team member #${i + 1} (${m.email}) or clear the row.`);
          setIsSaving(false);
          return;
        }
      }

      const cleanedTeamMembers = teamMembers.filter(
        (m) => m.full_name.trim() !== '' && m.email.trim() !== ''
      );

      const companyProfilePayload: CompanyProfileData = {
        company_name: companyName.trim(),
        industry,
        company_type: companyType,
        gst_number: gstNumber.trim() || undefined,
        registration_number: registrationNumber.trim() || undefined,
        year_of_establishment: yearOfEstablishment.trim() || undefined,
        website: website.trim() || undefined,
        company_description: companyDescription.trim() || undefined,
        address: {
          address_line1: addressLine1.trim(),
          address_line2: addressLine2.trim() || undefined,
          city: city.trim(),
          pin_code: pinCode.trim(),
          state,
          country,
        },
        primary_contact: {
          full_name: primaryFullName.trim(),
          phone_number: `${primaryPhoneCode} ${primaryPhone.trim()}`,
          email: primaryEmail.trim(),
          department: primaryDepartment.trim(),
        },
        team_members: cleanedTeamMembers,
        is_onboarded: true,
      };

      await usersApi.updateProfile({
        full_name: primaryFullName.trim(),
        company_name: companyName.trim(),
        phone_number: `${primaryPhoneCode} ${primaryPhone.trim()}`,
        company_profile: companyProfilePayload,
      });

      // Update cookie so edge middleware and client layout immediately know client is onboarded
      setCookie('is_onboarded', 'true', 7);

      if (refreshProfile) {
        await refreshProfile();
      }

      // Refresh invitations list with newly generated tokens
      await loadInvitations();

      setSuccessMessage('Company profile saved successfully! Redirecting to dashboard...');
      setTimeout(() => {
        router.push('/dashboard');
      }, 1200);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save company profile.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <Loader2 size={32} className="animate-spin" color="#09090b" />
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
        maxWidth: '1200px',
        margin: '0 auto',
        paddingBottom: '3rem',
      }}
    >
      {/* ── Page Header ── */}
      <PageHeader
        title="Company Profile"
        subtitle="Manage your company information and team members. Keep your details up to date for smooth project collaboration."
        breadcrumbs={
          <Link
            href="/dashboard"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.2rem',
              color: '#71717a',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            <ChevronLeft size={15} /> Back to Dashboard
          </Link>
        }
      />

      {/* ── First-Time Onboarding Welcome Banner ── */}
      {isFirstTime && (
        <div
          style={{
            padding: '0.85rem 1.15rem',
            backgroundColor: '#f4f4f5',
            border: '1.5px solid #09090b',
            borderRadius: '6px',
            color: '#09090b',
            fontSize: '0.825rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
          }}
        >
          <Building size={18} color="#09090b" />
          <span>
            <strong>Welcome to Aerostake!</strong> Please complete your company information and subordinate team members to finish setup.
          </span>
        </div>
      )}

      {/* ── Sub-Client View-Only Notification Banner ── */}
      {isSubClient && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.9rem 1.25rem',
            backgroundColor: '#fafafa',
            border: '1.5px solid #09090b',
            borderRadius: '6px',
            color: '#09090b',
            fontSize: '0.825rem',
            flexWrap: 'wrap',
            gap: '0.75rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <ShieldCheck size={18} color="#09090b" style={{ flexShrink: 0 }} />
            <div>
              <span style={{ fontWeight: 700 }}>Single Company Profile (Managed by Primary Client)</span>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: '#52525b' }}>
                All sub-clients in your organization share this single company profile. Sub-clients cannot edit company information or invitations here.
              </p>
            </div>
          </div>
          <Link
            href="/settings"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.45rem 0.85rem',
              backgroundColor: '#09090b',
              color: '#ffffff',
              fontSize: '0.78rem',
              fontWeight: 700,
              borderRadius: '4px',
              textDecoration: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            <span>Update Details in Settings</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      )}

      {/* ── Feedback Notifications ── */}
      {errorMessage && (
        <div
          style={{
            padding: '0.85rem 1.25rem',
            backgroundColor: '#f4f4f5',
            border: '1.5px solid #09090b',
            borderRadius: '6px',
            color: '#09090b',
            fontWeight: 600,
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <AlertCircle size={18} color="#09090b" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div
          style={{
            padding: '0.85rem 1.25rem',
            backgroundColor: '#f4f4f5',
            border: '1.5px solid #09090b',
            borderRadius: '6px',
            color: '#09090b',
            fontWeight: 700,
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <Check size={18} />
          <span>{successMessage}</span>
        </div>
      )}

      {/* ── 1. Company Information ── */}
      <div
        className="wf-card"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          border: '1px solid #e4e4e7',
          padding: '1.25rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <h2 className="wf-title" style={{ fontSize: '0.95rem', fontWeight: 700, color: '#09090b' }}>
              1. Company Information
            </h2>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
              Provide your company&apos;s basic details.
            </p>
          </div>
          {isSubClient && (
            <span style={{ fontSize: '0.72rem', color: '#71717a', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <Lock size={12} /> Managed by Primary Client
            </span>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
          {/* Company Name */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#09090b' }}>
              Company Name <span style={{ color: '#09090b' }}>*</span>
            </label>
            <input
              type="text"
              required
              disabled={isSubClient}
              readOnly={isSubClient}
              placeholder="Enter company name"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="form-input"
              style={{
                fontSize: '0.8rem',
                height: '36px',
                border: '1px solid #d4d4d8',
                borderRadius: '4px',
                backgroundColor: isSubClient ? '#f4f4f5' : '#ffffff',
                cursor: isSubClient ? 'not-allowed' : undefined,
                color: '#09090b',
              }}
            />
          </div>

          {/* Industry / Sector */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#09090b' }}>
              Industry / Sector <span style={{ color: '#09090b' }}>*</span>
            </label>
            <select
              required
              disabled={isSubClient}
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              className="form-select"
              style={{
                fontSize: '0.8rem',
                height: '36px',
                border: '1px solid #d4d4d8',
                borderRadius: '4px',
                backgroundColor: isSubClient ? '#f4f4f5' : '#ffffff',
                cursor: isSubClient ? 'not-allowed' : undefined,
                color: '#09090b',
              }}
            >
              <option value="">Select industry</option>
              {INDUSTRIES.map((ind) => (
                <option key={ind} value={ind}>
                  {ind}
                </option>
              ))}
            </select>
          </div>

          {/* Company Type */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#09090b' }}>
              Company Type <span style={{ color: '#09090b' }}>*</span>
            </label>
            <select
              required
              disabled={isSubClient}
              value={companyType}
              onChange={(e) => setCompanyType(e.target.value)}
              className="form-select"
              style={{
                fontSize: '0.8rem',
                height: '36px',
                border: '1px solid #d4d4d8',
                borderRadius: '4px',
                backgroundColor: isSubClient ? '#f4f4f5' : '#ffffff',
                cursor: isSubClient ? 'not-allowed' : undefined,
                color: '#09090b',
              }}
            >
              <option value="">Select company type</option>
              {COMPANY_TYPES.map((ct) => (
                <option key={ct} value={ct}>
                  {ct}
                </option>
              ))}
            </select>
          </div>

          {/* GST Number */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#09090b' }}>
              GST Number (Optional)
            </label>
            <input
              type="text"
              disabled={isSubClient}
              readOnly={isSubClient}
              placeholder="Enter GST number"
              value={gstNumber}
              onChange={(e) => setGstNumber(e.target.value.toUpperCase())}
              className="form-input"
              style={{
                fontSize: '0.8rem',
                height: '36px',
                border: '1px solid #d4d4d8',
                borderRadius: '4px',
                backgroundColor: isSubClient ? '#f4f4f5' : '#ffffff',
                cursor: isSubClient ? 'not-allowed' : undefined,
                color: '#09090b',
              }}
            />
          </div>

          {/* Registration Number */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#09090b' }}>
              Registration Number (Optional)
            </label>
            <input
              type="text"
              disabled={isSubClient}
              readOnly={isSubClient}
              placeholder="Enter registration number"
              value={registrationNumber}
              onChange={(e) => setRegistrationNumber(e.target.value)}
              className="form-input"
              style={{
                fontSize: '0.8rem',
                height: '36px',
                border: '1px solid #d4d4d8',
                borderRadius: '4px',
                backgroundColor: isSubClient ? '#f4f4f5' : '#ffffff',
                cursor: isSubClient ? 'not-allowed' : undefined,
                color: '#09090b',
              }}
            />
          </div>

          {/* Year of Establishment */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#09090b' }}>
              Year of Establishment (Optional)
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                disabled={isSubClient}
                readOnly={isSubClient}
                placeholder="Select year"
                value={yearOfEstablishment}
                onChange={(e) => setYearOfEstablishment(e.target.value)}
                className="form-input"
                style={{
                  fontSize: '0.8rem',
                  height: '36px',
                  border: '1px solid #d4d4d8',
                  borderRadius: '4px',
                  paddingRight: '2rem',
                  backgroundColor: isSubClient ? '#f4f4f5' : '#ffffff',
                  cursor: isSubClient ? 'not-allowed' : undefined,
                  color: '#09090b',
                }}
              />
              <Calendar size={16} color="#71717a" style={{ position: 'absolute', right: '10px', top: '10px' }} />
            </div>
          </div>

          {/* Website */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#09090b' }}>
              Website (Optional)
            </label>
            <input
              type="text"
              disabled={isSubClient}
              readOnly={isSubClient}
              placeholder="https://www.yourcompany.com"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              className="form-input"
              style={{
                fontSize: '0.8rem',
                height: '36px',
                border: '1px solid #d4d4d8',
                borderRadius: '4px',
                backgroundColor: isSubClient ? '#f4f4f5' : '#ffffff',
                cursor: isSubClient ? 'not-allowed' : undefined,
                color: '#09090b',
              }}
            />
          </div>

          {/* Company Description */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#09090b' }}>
              Company Description (Optional)
            </label>
            <div style={{ position: 'relative' }}>
              <textarea
                rows={3}
                maxLength={500}
                disabled={isSubClient}
                readOnly={isSubClient}
                placeholder="Enter a brief description about your company..."
                value={companyDescription}
                onChange={(e) => setCompanyDescription(e.target.value)}
                className="form-textarea"
                style={{
                  fontSize: '0.8rem',
                  resize: 'vertical',
                  width: '100%',
                  padding: '0.65rem',
                  paddingBottom: '1.5rem',
                  border: '1px solid #d4d4d8',
                  borderRadius: '4px',
                  fontFamily: 'inherit',
                  outline: 'none',
                  backgroundColor: isSubClient ? '#f4f4f5' : '#ffffff',
                  cursor: isSubClient ? 'not-allowed' : undefined,
                  color: '#09090b',
                }}
              />
              <span
                style={{
                  position: 'absolute',
                  bottom: '8px',
                  right: '10px',
                  fontSize: '0.675rem',
                  color: 'var(--text-muted)',
                }}
              >
                {companyDescription.length}/500
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. Company Address ── */}
      <div
        className="wf-card"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          border: '1px solid #e4e4e7',
          padding: '1.25rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <h2 className="wf-title" style={{ fontSize: '0.95rem', fontWeight: 700, color: '#09090b' }}>
              2. Company Address
            </h2>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
              Provide your official business address.
            </p>
          </div>
          {isSubClient && (
            <span style={{ fontSize: '0.72rem', color: '#71717a', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <Lock size={12} /> Managed by Primary Client
            </span>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
          {/* Address Line 1 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#09090b' }}>
              Address Line 1 <span style={{ color: '#09090b' }}>*</span>
            </label>
            <input
              type="text"
              required
              disabled={isSubClient}
              readOnly={isSubClient}
              placeholder="Enter address line 1"
              value={addressLine1}
              onChange={(e) => setAddressLine1(e.target.value)}
              className="form-input"
              style={{
                fontSize: '0.8rem',
                height: '36px',
                border: '1px solid #d4d4d8',
                borderRadius: '4px',
                backgroundColor: isSubClient ? '#f4f4f5' : '#ffffff',
                cursor: isSubClient ? 'not-allowed' : undefined,
                color: '#09090b',
              }}
            />
          </div>

          {/* Address Line 2 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#09090b' }}>
              Address Line 2 (Optional)
            </label>
            <input
              type="text"
              disabled={isSubClient}
              readOnly={isSubClient}
              placeholder="Enter address line 2"
              value={addressLine2}
              onChange={(e) => setAddressLine2(e.target.value)}
              className="form-input"
              style={{
                fontSize: '0.8rem',
                height: '36px',
                border: '1px solid #d4d4d8',
                borderRadius: '4px',
                backgroundColor: isSubClient ? '#f4f4f5' : '#ffffff',
                cursor: isSubClient ? 'not-allowed' : undefined,
                color: '#09090b',
              }}
            />
          </div>

          {/* City */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#09090b' }}>
              City <span style={{ color: '#09090b' }}>*</span>
            </label>
            <input
              type="text"
              required
              disabled={isSubClient}
              readOnly={isSubClient}
              placeholder="Enter city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="form-input"
              style={{
                fontSize: '0.8rem',
                height: '36px',
                border: '1px solid #d4d4d8',
                borderRadius: '4px',
                backgroundColor: isSubClient ? '#f4f4f5' : '#ffffff',
                cursor: isSubClient ? 'not-allowed' : undefined,
                color: '#09090b',
              }}
            />
          </div>

          {/* PIN / Postal Code */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#09090b' }}>
              PIN / Postal Code <span style={{ color: '#09090b' }}>*</span>
            </label>
            <input
              type="text"
              required
              disabled={isSubClient}
              readOnly={isSubClient}
              placeholder="Enter PIN code"
              value={pinCode}
              onChange={(e) => setPinCode(e.target.value)}
              className="form-input"
              style={{
                fontSize: '0.8rem',
                height: '36px',
                border: '1px solid #d4d4d8',
                borderRadius: '4px',
                backgroundColor: isSubClient ? '#f4f4f5' : '#ffffff',
                cursor: isSubClient ? 'not-allowed' : undefined,
                color: '#09090b',
              }}
            />
          </div>

          {/* State */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#09090b' }}>
              State <span style={{ color: '#09090b' }}>*</span>
            </label>
            <select
              required
              disabled={isSubClient}
              value={state}
              onChange={(e) => setState(e.target.value)}
              className="form-select"
              style={{
                fontSize: '0.8rem',
                height: '36px',
                border: '1px solid #d4d4d8',
                borderRadius: '4px',
                backgroundColor: isSubClient ? '#f4f4f5' : '#ffffff',
                cursor: isSubClient ? 'not-allowed' : undefined,
                color: '#09090b',
              }}
            >
              <option value="">Select state</option>
              {INDIAN_STATES.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          {/* Country */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#09090b' }}>
              Country <span style={{ color: '#09090b' }}>*</span>
            </label>
            <select
              required
              disabled={isSubClient}
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="form-select"
              style={{
                fontSize: '0.8rem',
                height: '36px',
                border: '1px solid #d4d4d8',
                borderRadius: '4px',
                backgroundColor: isSubClient ? '#f4f4f5' : '#ffffff',
                cursor: isSubClient ? 'not-allowed' : undefined,
                color: '#09090b',
              }}
            >
              <option value="India">India</option>
              <option value="United States">United States</option>
              <option value="United Kingdom">United Kingdom</option>
              <option value="United Arab Emirates">United Arab Emirates</option>
              <option value="Australia">Australia</option>
              <option value="Singapore">Singapore</option>
              <option value="Germany">Germany</option>
              <option value="Canada">Canada</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── 3. Primary Contact (You) ── */}
      <div
        className="wf-card"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          border: '1px solid #e4e4e7',
          padding: '1.25rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <h2 className="wf-title" style={{ fontSize: '0.95rem', fontWeight: 700, color: '#09090b' }}>
              {isSubClient ? '3. Primary Contact (Organization Owner)' : '3. Primary Contact (You)'}
            </h2>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
              {isSubClient
                ? 'These details represent your organization\'s primary contact for official communications.'
                : 'These details will be used as the main point of contact for all communications.'}
            </p>
          </div>
          {isSubClient && (
            <span style={{ fontSize: '0.72rem', color: '#71717a', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <Lock size={12} /> Managed by Primary Client
            </span>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
          {/* Full Name */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#09090b' }}>
              Full Name <span style={{ color: '#09090b' }}>*</span>
            </label>
            <input
              type="text"
              required
              disabled={isSubClient}
              readOnly={isSubClient}
              placeholder="Enter full name"
              value={primaryFullName}
              onChange={(e) => setPrimaryFullName(e.target.value)}
              className="form-input"
              style={{
                fontSize: '0.8rem',
                height: '36px',
                border: '1px solid #d4d4d8',
                borderRadius: '4px',
                backgroundColor: isSubClient ? '#f4f4f5' : '#ffffff',
                cursor: isSubClient ? 'not-allowed' : undefined,
                color: '#09090b',
              }}
            />
          </div>

          {/* Phone Number */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#09090b' }}>
              Phone Number <span style={{ color: '#09090b' }}>*</span>
            </label>
            <div style={{ display: 'flex', gap: '0.35rem' }}>
              <select
                disabled={isSubClient}
                value={primaryPhoneCode}
                onChange={(e) => setPrimaryPhoneCode(e.target.value)}
                className="form-select"
                style={{
                  width: '68px',
                  fontSize: '0.75rem',
                  height: '36px',
                  border: '1px solid #d4d4d8',
                  borderRadius: '4px',
                  padding: '0 0.3rem',
                  backgroundColor: isSubClient ? '#f4f4f5' : '#ffffff',
                  cursor: isSubClient ? 'not-allowed' : undefined,
                  color: '#09090b',
                }}
              >
                <option value="+91">+91</option>
                <option value="+1">+1</option>
                <option value="+44">+44</option>
                <option value="+971">+971</option>
                <option value="+61">+61</option>
                <option value="+65">+65</option>
              </select>
              <input
                type="text"
                required
                disabled={isSubClient}
                readOnly={isSubClient}
                placeholder="Enter phone number"
                value={primaryPhone}
                onChange={(e) => setPrimaryPhone(e.target.value)}
                className="form-input"
                style={{
                  flex: 1,
                  fontSize: '0.8rem',
                  height: '36px',
                  border: '1px solid #d4d4d8',
                  borderRadius: '4px',
                  backgroundColor: isSubClient ? '#f4f4f5' : '#ffffff',
                  cursor: isSubClient ? 'not-allowed' : undefined,
                  color: '#09090b',
                }}
              />
            </div>
          </div>

          {/* Email Address */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#09090b' }}>
              Email Address <span style={{ color: '#09090b' }}>*</span>
            </label>
            <input
              type="email"
              required
              disabled={isSubClient}
              readOnly={isSubClient}
              placeholder="Enter email address"
              value={primaryEmail}
              onChange={(e) => setPrimaryEmail(e.target.value)}
              className="form-input"
              style={{
                fontSize: '0.8rem',
                height: '36px',
                border: '1px solid #d4d4d8',
                borderRadius: '4px',
                backgroundColor: isSubClient ? '#f4f4f5' : '#ffffff',
                cursor: isSubClient ? 'not-allowed' : undefined,
                color: '#09090b',
              }}
            />
          </div>

          {/* Department / Designation */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#09090b' }}>
              Department / Designation <span style={{ color: '#09090b' }}>*</span>
            </label>
            <input
              type="text"
              required
              disabled={isSubClient}
              readOnly={isSubClient}
              placeholder="Enter department or designation"
              value={primaryDepartment}
              onChange={(e) => setPrimaryDepartment(e.target.value)}
              className="form-input"
              style={{
                fontSize: '0.8rem',
                height: '36px',
                border: '1px solid #d4d4d8',
                borderRadius: '4px',
                backgroundColor: isSubClient ? '#f4f4f5' : '#ffffff',
                cursor: isSubClient ? 'not-allowed' : undefined,
                color: '#09090b',
              }}
            />
          </div>
        </div>
      </div>

      {/* ── 4. Team Members (Subordinate Contacts) ── */}
      <div
        className="wf-card"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.85rem',
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          border: '1px solid #e4e4e7',
          padding: '1.25rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <h2 className="wf-title" style={{ fontSize: '0.95rem', fontWeight: 700, color: '#09090b' }}>
              4. Team Members (Subordinate Contacts) <span style={{ fontWeight: 500, color: '#71717a', fontSize: '0.85rem' }}>(Optional)</span>
            </h2>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
              Add subordinate team members who will have access to joint projects. Each contact receives invitation-based authentication.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {isSubClient && (
              <span style={{ fontSize: '0.72rem', color: '#71717a', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <Lock size={12} /> Managed by Primary Client
              </span>
            )}
            <span style={{ fontSize: '0.725rem', color: '#71717a', backgroundColor: '#f4f4f5', padding: '3px 8px', borderRadius: '4px', border: '1px solid #e4e4e7' }}>
              Invitation Validity: 24 Hours
            </span>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="wf-table" style={{ margin: 0, minWidth: '960px' }}>
            <thead>
              <tr>
                <th style={{ width: '3%' }}>#</th>
                <th style={{ width: '18%' }}>Full Name (Optional)</th>
                <th style={{ width: '21%' }}>Email Address (Optional)</th>
                <th style={{ width: '18%' }}>Phone Number (Optional)</th>
                <th style={{ width: '14%' }}>Department</th>
                <th style={{ width: '23%' }}>Invitation & Email Layout</th>
                <th style={{ width: '3%', textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {teamMembers.map((member, idx) => {
                const cleanEmail = member.email?.trim().toLowerCase();
                const matchedInvite = cleanEmail
                  ? invitations.find((i) => i.email.toLowerCase() === cleanEmail) || null
                  : null;
                const isInvitePending = matchedInvite?.status === 'pending';
                const isInviteAccepted = matchedInvite?.status === 'accepted';
                const isInviteExpired = matchedInvite?.status === 'expired';

                return (
                  <tr key={idx}>
                    <td style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>{idx + 1}</td>
                    <td>
                      <input
                        type="text"
                        disabled={isSubClient}
                        readOnly={isSubClient}
                        placeholder="Enter full name"
                        value={member.full_name}
                        onChange={(e) => handleUpdateTeamMember(idx, 'full_name', e.target.value)}
                        className="form-input"
                        style={{
                          fontSize: '0.775rem',
                          height: '34px',
                          border: '1px solid #d4d4d8',
                          borderRadius: '4px',
                          backgroundColor: isSubClient ? '#f4f4f5' : '#ffffff',
                          cursor: isSubClient ? 'not-allowed' : undefined,
                          color: '#09090b',
                        }}
                      />
                    </td>
                    <td>
                      <input
                        type="email"
                        disabled={isSubClient}
                        readOnly={isSubClient}
                        placeholder="Enter email address"
                        value={member.email}
                        onChange={(e) => handleUpdateTeamMember(idx, 'email', e.target.value)}
                        className="form-input"
                        style={{
                          fontSize: '0.775rem',
                          height: '34px',
                          border: '1px solid #d4d4d8',
                          borderRadius: '4px',
                          backgroundColor: isSubClient ? '#f4f4f5' : '#ffffff',
                          cursor: isSubClient ? 'not-allowed' : undefined,
                          color: '#09090b',
                        }}
                      />
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.25rem' }}>
                        <select
                          disabled={isSubClient}
                          className="form-select"
                          style={{
                            width: '60px',
                            fontSize: '0.725rem',
                            height: '34px',
                            padding: '0 0.2rem',
                            border: '1px solid #d4d4d8',
                            borderRadius: '4px',
                            backgroundColor: isSubClient ? '#f4f4f5' : '#ffffff',
                            cursor: isSubClient ? 'not-allowed' : undefined,
                            color: '#09090b',
                          }}
                          defaultValue="+91"
                        >
                          <option value="+91">+91</option>
                          <option value="+1">+1</option>
                          <option value="+44">+44</option>
                          <option value="+971">+971</option>
                        </select>
                        <input
                          type="text"
                          disabled={isSubClient}
                          readOnly={isSubClient}
                          placeholder="Enter phone number"
                          value={member.phone_number || ''}
                          onChange={(e) => handleUpdateTeamMember(idx, 'phone_number', e.target.value)}
                          className="form-input"
                          style={{
                            flex: 1,
                            fontSize: '0.775rem',
                            height: '34px',
                            border: '1px solid #d4d4d8',
                            borderRadius: '4px',
                            backgroundColor: isSubClient ? '#f4f4f5' : '#ffffff',
                            cursor: isSubClient ? 'not-allowed' : undefined,
                            color: '#09090b',
                          }}
                        />
                      </div>
                    </td>
                    <td>
                      <input
                        type="text"
                        disabled={isSubClient}
                        readOnly={isSubClient}
                        placeholder="Enter department"
                        value={member.department || ''}
                        onChange={(e) => handleUpdateTeamMember(idx, 'department', e.target.value)}
                        className="form-input"
                        style={{
                          fontSize: '0.775rem',
                          height: '34px',
                          border: '1px solid #d4d4d8',
                          borderRadius: '4px',
                          backgroundColor: isSubClient ? '#f4f4f5' : '#ffffff',
                          cursor: isSubClient ? 'not-allowed' : undefined,
                          color: '#09090b',
                        }}
                      />
                    </td>
                    <td style={{ verticalAlign: 'middle' }}>
                      {!cleanEmail ? (
                        <span style={{ fontSize: '0.72rem', color: '#a1a1aa', fontStyle: 'italic' }}>
                          Enter email first
                        </span>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                          {isInviteAccepted ? (
                            <span
                              style={{
                                fontSize: '0.675rem',
                                fontWeight: 700,
                                padding: '2px 7px',
                                borderRadius: '4px',
                                backgroundColor: '#09090b',
                                color: '#ffffff',
                                border: '1px solid #09090b',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                              }}
                            >
                              <Check size={10} /> Registered
                            </span>
                          ) : isInvitePending ? (
                            <span
                              style={{
                                fontSize: '0.675rem',
                                fontWeight: 600,
                                padding: '2px 7px',
                                borderRadius: '4px',
                                backgroundColor: '#f4f4f5',
                                color: '#09090b',
                                border: '1px solid #d4d4d8',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                            >
                              Active (24h)
                            </span>
                          ) : isInviteExpired ? (
                            <span
                              style={{
                                fontSize: '0.675rem',
                                fontWeight: 600,
                                padding: '2px 7px',
                                borderRadius: '4px',
                                backgroundColor: '#ffffff',
                                color: '#71717a',
                                border: '1px dashed #71717a',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                            >
                              Expired
                            </span>
                          ) : (
                            <span
                              style={{
                                fontSize: '0.675rem',
                                color: '#71717a',
                                fontStyle: 'italic',
                              }}
                            >
                              Not Generated
                            </span>
                          )}

                          <button
                            type="button"
                            onClick={() => setSelectedMemberForInvite({ member, invite: matchedInvite, index: idx })}
                            style={{
                              height: '28px',
                              padding: '0 0.75rem',
                              fontSize: '0.74rem',
                              fontWeight: 600,
                              backgroundColor: '#ffffff',
                              color: '#09090b',
                              border: '1px solid #09090b',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              transition: 'all 0.15s ease',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f4f4f5')}
                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ffffff')}
                          >
                            <Mail size={12} />
                            <span>Invitation</span>
                          </button>
                        </div>
                      )}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {isSubClient ? (
                        <span style={{ color: '#a1a1aa', fontSize: '0.85rem' }}>—</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleClearTeamMember(idx)}
                          title="Clear / Remove Row"
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: '#71717a',
                            padding: '0.3rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', fontSize: '0.725rem', color: 'var(--text-muted)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Info size={14} style={{ flexShrink: 0 }} />
            <span>Click &quot;Invitation&quot; to copy the invite link, preview &amp; send formatted email (with Outlook-coloured button), or regenerate the link.</span>
          </div>
          <span style={{ color: '#71717a' }}>Up to 4 team members permitted</span>
        </div>
      </div>

      {/* ── All-in-One Team Member Invitation Options Popup Modal ── */}
      {selectedMemberForInvite && (
        <Portal>
          <div
            className="viewport-modal-backdrop"
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              backgroundColor: 'rgba(0, 0, 0, 0.65)',
              zIndex: 99999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1rem',
            }}
            onClick={() => setSelectedMemberForInvite(null)}
          >
            <div
              style={{
                backgroundColor: '#ffffff',
                border: '2px solid #09090b',
                borderRadius: '8px',
                width: '100%',
                maxWidth: '740px',
                maxHeight: '90vh',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 20px 30px -5px rgba(0, 0, 0, 0.3)',
                overflow: 'hidden',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div
                style={{
                  padding: '1.15rem 1.5rem',
                  borderBottom: '1px solid #e4e4e7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: '#fafafa',
                }}
              >
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: '#09090b' }}>
                    Team Member Invitation
                  </h3>
                  <p style={{ fontSize: '0.75rem', color: '#71717a', margin: '3px 0 0 0' }}>
                    Access &amp; credentials for <strong>{selectedMemberForInvite.member.full_name || 'Team Member'}</strong> ({selectedMemberForInvite.member.email})
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedMemberForInvite(null)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '4px',
                    color: '#71717a',
                  }}
                >
                  <X size={20} />
                </button>
              </div>

              {/* Modal Body - Scrollable */}
              <div
                style={{
                  padding: '1.25rem 1.5rem',
                  overflowY: 'auto',
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1.25rem',
                }}
              >
                {/* Current Status Indicator & Rule */}
                <div
                  style={{
                    padding: '0.75rem 1rem',
                    backgroundColor: '#fafafa',
                    border: '1px solid #e4e4e7',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '0.5rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#09090b' }}>Current Status:</span>
                    {selectedMemberForInvite.invite?.status === 'accepted' ? (
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#ffffff', backgroundColor: '#09090b', padding: '2px 8px', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <Check size={12} /> Registered &amp; Active
                      </span>
                    ) : selectedMemberForInvite.invite?.status === 'pending' ? (
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#09090b', backgroundColor: '#f4f4f5', border: '1px solid #d4d4d8', padding: '2px 8px', borderRadius: '4px' }}>
                        ● Active Link (Valid for 24 Hours)
                      </span>
                    ) : selectedMemberForInvite.invite?.status === 'expired' ? (
                      <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#71717a', backgroundColor: '#ffffff', border: '1px dashed #71717a', padding: '2px 8px', borderRadius: '4px' }}>
                        ● Expired (Generate New Link)
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.72rem', color: '#71717a', fontStyle: 'italic' }}>
                        Not Generated Yet
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: '0.72rem', color: '#71717a' }}>
                    Active for 24h &amp; until user completes registration
                  </span>
                </div>

                {/* ── Option A: Just Copy the Link ── */}
                <div style={{ border: '1px solid #e4e4e7', borderRadius: '6px', padding: '1rem', backgroundColor: '#ffffff' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <h4 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#09090b', margin: 0 }}>
                      a. Just Copy the Link
                    </h4>
                    {copiedActionId === 'modal-link' && (
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#09090b', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <Check size={13} /> Link copied to clipboard!
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <input
                      type="text"
                      readOnly
                      value={selectedMemberForInvite.invite?.token ? getInviteUrl(selectedMemberForInvite.invite) : 'Invitation link not generated yet'}
                      style={{
                        flex: 1,
                        padding: '0.5rem 0.75rem',
                        fontSize: '0.775rem',
                        fontFamily: 'monospace',
                        backgroundColor: '#f4f4f5',
                        border: '1px solid #d4d4d8',
                        borderRadius: '4px',
                        color: selectedMemberForInvite.invite?.token ? '#09090b' : '#71717a',
                        outline: 'none',
                      }}
                    />
                    <button
                      type="button"
                      disabled={!selectedMemberForInvite.invite?.token}
                      onClick={async () => {
                        if (selectedMemberForInvite.invite) {
                          const url = getInviteUrl(selectedMemberForInvite.invite);
                          await navigator.clipboard.writeText(url);
                          setCopiedActionId('modal-link');
                          setTimeout(() => setCopiedActionId(null), 2500);
                        }
                      }}
                      style={{
                        height: '34px',
                        padding: '0 0.9rem',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        backgroundColor: copiedActionId === 'modal-link' ? '#09090b' : '#ffffff',
                        color: copiedActionId === 'modal-link' ? '#ffffff' : '#09090b',
                        border: '1px solid #09090b',
                        borderRadius: '4px',
                        cursor: selectedMemberForInvite.invite?.token ? 'pointer' : 'not-allowed',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {copiedActionId === 'modal-link' ? (
                        <>
                          <Check size={13} /> Copied!
                        </>
                      ) : (
                        <>
                          <Copy size={13} /> Copy Link
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* ── Option B: Send Email ── */}
                <div style={{ border: '1px solid #e4e4e7', borderRadius: '6px', padding: '1rem', backgroundColor: '#ffffff' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div>
                      <h4 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#09090b', margin: 0 }}>
                        b. Send Email
                      </h4>
                      <p style={{ fontSize: '0.72rem', color: '#71717a', margin: '2px 0 0 0' }}>
                        Preview email with coloured button below. Copy formatted layout or navigate to your email platform:
                      </p>
                    </div>
                    {copiedActionId === 'modal-email' && (
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#09090b', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <Check size={13} /> Formatted email copied!
                      </span>
                    )}
                  </div>

                  {/* Scrollable Email Preview Box with Outlook-compatible button */}
                  <div
                    style={{
                      maxHeight: '270px',
                      overflowY: 'auto',
                      border: '1px solid #e4e4e7',
                      borderRadius: '6px',
                      padding: '1rem',
                      backgroundColor: '#fafafa',
                      marginBottom: '0.85rem',
                    }}
                  >
                    <div
                      dangerouslySetInnerHTML={{
                        __html: generateEmailHtml(selectedMemberForInvite.member, selectedMemberForInvite.invite),
                      }}
                    />
                  </div>

                  {/* Email Actions: Copy Layout OR Navigate to Platform */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <button
                        type="button"
                        onClick={async () => {
                          const html = generateEmailHtml(selectedMemberForInvite.member, selectedMemberForInvite.invite);
                          const plain = generateEmailPlainText(selectedMemberForInvite.member, selectedMemberForInvite.invite);
                          try {
                            if (typeof window !== 'undefined' && navigator.clipboard && window.ClipboardItem) {
                              const htmlBlob = new Blob([html], { type: 'text/html' });
                              const textBlob = new Blob([plain], { type: 'text/plain' });
                              await navigator.clipboard.write([
                                new ClipboardItem({ 'text/html': htmlBlob, 'text/plain': textBlob }),
                              ]);
                            } else {
                              await navigator.clipboard.writeText(plain);
                            }
                            setCopiedActionId('modal-email');
                            setTimeout(() => setCopiedActionId(null), 2500);
                          } catch {
                            await navigator.clipboard.writeText(plain);
                            setCopiedActionId('modal-email');
                            setTimeout(() => setCopiedActionId(null), 2500);
                          }
                        }}
                        style={{
                          height: '34px',
                          padding: '0 1rem',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          backgroundColor: '#09090b',
                          color: '#ffffff',
                          border: '1px solid #09090b',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <Copy size={13} /> Copy Formatted Email
                      </button>

                      <span style={{ fontSize: '0.72rem', color: '#71717a' }}>
                        Paste directly into Gmail, Outlook, or Yahoo Mail composer
                      </span>
                    </div>

                    {/* Direct Platform Navigation Buttons */}
                    <div style={{ borderTop: '1px dashed #e4e4e7', paddingTop: '0.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.45rem' }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#52525b' }}>
                          Or Launch Email Platform Directly:
                        </span>
                        <span style={{ fontSize: '0.7rem', color: '#71717a' }}>
                          {selectedMemberForInvite.member.email}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '0.45rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        {/* Gmail */}
                        <button
                          type="button"
                          onClick={() => openEmailPlatform('gmail', selectedMemberForInvite.member, selectedMemberForInvite.invite)}
                          title={`Launch Gmail (To: ${selectedMemberForInvite.member.email})`}
                          style={{
                            width: '34px',
                            height: '34px',
                            padding: 0,
                            backgroundColor: '#ffffff',
                            border: '1px solid #d4d4d8',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.15s ease',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#f4f4f5';
                            e.currentTarget.style.borderColor = '#a1a1aa';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = '#ffffff';
                            e.currentTarget.style.borderColor = '#d4d4d8';
                          }}
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24">
                            <path fill="#09090b" d="M22 6.5V17a3 3 0 0 1-3 3h-2V9.5l-5 3.5-5-3.5V20H5a3 3 0 0 1-3-3V6.5a2.5 2.5 0 0 1 4-2L12 9l6-4.5a2.5 2.5 0 0 1 4 2z"/>
                            <path fill="#18181b" d="M2 17a3 3 0 0 0 3 3h2v-9.5L2 6.5V17z"/>
                            <path fill="#09090b" d="M12 9L6 4.5A2.5 2.5 0 0 0 2 6.5V7l10 7 10-7v-.5a2.5 2.5 0 0 0-4-2L12 9z"/>
                            <path fill="#27272a" d="M22 6.5l-5 4V20h2a3 3 0 0 0 3-3V6.5z"/>
                          </svg>
                        </button>

                        {/* Outlook Live */}
                        <button
                          type="button"
                          onClick={() => openEmailPlatform('outlook-live', selectedMemberForInvite.member, selectedMemberForInvite.invite)}
                          title={`Launch Outlook Live (To: ${selectedMemberForInvite.member.email})`}
                          style={{
                            width: '34px',
                            height: '34px',
                            padding: 0,
                            backgroundColor: '#ffffff',
                            border: '1px solid #d4d4d8',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.15s ease',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#f4f4f5';
                            e.currentTarget.style.borderColor = '#a1a1aa';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = '#ffffff';
                            e.currentTarget.style.borderColor = '#d4d4d8';
                          }}
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                            <rect x="2" y="4" width="20" height="16" rx="3.5" fill="#09090b" fillOpacity="0.12" stroke="#09090b" strokeWidth="1.5"/>
                            <path d="M2 7.5L12 13.5L22 7.5" stroke="#09090b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            <circle cx="8" cy="14" r="3.2" fill="#09090b"/>
                            <text x="8" y="16.4" textAnchor="middle" fill="#FFFFFF" fontSize="6.8" fontWeight="bold" fontFamily="system-ui, sans-serif">O</text>
                          </svg>
                        </button>

                        {/* Outlook 365 */}
                        <button
                          type="button"
                          onClick={() => openEmailPlatform('outlook-office', selectedMemberForInvite.member, selectedMemberForInvite.invite)}
                          title={`Launch Microsoft 365 Outlook (To: ${selectedMemberForInvite.member.email})`}
                          style={{
                            width: '34px',
                            height: '34px',
                            padding: 0,
                            backgroundColor: '#ffffff',
                            border: '1px solid #d4d4d8',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.15s ease',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#f4f4f5';
                            e.currentTarget.style.borderColor = '#a1a1aa';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = '#ffffff';
                            e.currentTarget.style.borderColor = '#d4d4d8';
                          }}
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                            <rect x="2" y="4" width="20" height="16" rx="3.5" fill="#09090b" fillOpacity="0.16" stroke="#09090b" strokeWidth="1.5"/>
                            <path d="M2 7.5L12 13.5L22 7.5" stroke="#09090b" strokeWidth="1.5" strokeLinecap="round"/>
                            <rect x="4" y="11" width="8" height="6.5" rx="1.5" fill="#18181b"/>
                            <text x="8" y="16" textAnchor="middle" fill="#FFFFFF" fontSize="5.2" fontWeight="900" fontFamily="system-ui, sans-serif">365</text>
                          </svg>
                        </button>

                        {/* Yahoo Mail */}
                        <button
                          type="button"
                          onClick={() => openEmailPlatform('yahoo', selectedMemberForInvite.member, selectedMemberForInvite.invite)}
                          title={`Launch Yahoo Mail (To: ${selectedMemberForInvite.member.email})`}
                          style={{
                            width: '34px',
                            height: '34px',
                            padding: 0,
                            backgroundColor: '#ffffff',
                            border: '1px solid #d4d4d8',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.15s ease',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#f4f4f5';
                            e.currentTarget.style.borderColor = '#a1a1aa';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = '#ffffff';
                            e.currentTarget.style.borderColor = '#d4d4d8';
                          }}
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                            <rect x="2" y="4" width="20" height="16" rx="3.5" fill="#09090b" fillOpacity="0.12" stroke="#09090b" strokeWidth="1.5"/>
                            <path d="M6 7.5L9.5 12.5V17.5H11.5V12.5L15 7.5H12.8L10.5 11.2L8.2 7.5H6Z" fill="#09090b"/>
                            <rect x="16.5" y="13" width="1.6" height="4" rx="0.8" fill="#09090b"/>
                            <circle cx="17.3" cy="10" r="1" fill="#09090b"/>
                          </svg>
                        </button>

                        {/* Default Mail Client */}
                        <button
                          type="button"
                          onClick={() => openEmailPlatform('mailto', selectedMemberForInvite.member, selectedMemberForInvite.invite)}
                          title={`Launch Default Mail Client (To: ${selectedMemberForInvite.member.email})`}
                          style={{
                            width: '34px',
                            height: '34px',
                            padding: 0,
                            backgroundColor: '#ffffff',
                            border: '1px solid #d4d4d8',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.15s ease',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#f4f4f5';
                            e.currentTarget.style.borderColor = '#a1a1aa';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = '#ffffff';
                            e.currentTarget.style.borderColor = '#d4d4d8';
                          }}
                        >
                          <Mail size={16} color="#09090b" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── Option C: Regenerate Link ── */}
                <div style={{ border: '1px solid #e4e4e7', borderRadius: '6px', padding: '1rem', backgroundColor: '#ffffff' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
                    <div>
                      <h4 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#09090b', margin: 0 }}>
                        c. Regenerate Invitation Link
                      </h4>
                      <p style={{ fontSize: '0.72rem', color: '#71717a', margin: '3px 0 0 0' }}>
                        A link is active for 24 hours and until the targeted user successfully registers. Regenerating generates a fresh link and immediately invalidates any prior token.
                      </p>
                    </div>

                    {isSubClient ? (
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#71717a', backgroundColor: '#f4f4f5', padding: '6px 12px', borderRadius: '4px', border: '1px solid #d4d4d8', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                        <Lock size={12} /> Managed by Primary Client
                      </span>
                    ) : (
                      <button
                        type="button"
                        disabled={isGeneratingInviteFor === selectedMemberForInvite.member.email}
                        onClick={() => handleGenerateOrRefreshInvite(selectedMemberForInvite.member.email)}
                        style={{
                          height: '34px',
                          padding: '0 1rem',
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          backgroundColor: '#ffffff',
                          color: '#09090b',
                          border: '1px solid #09090b',
                          borderRadius: '4px',
                          cursor: isGeneratingInviteFor === selectedMemberForInvite.member.email ? 'not-allowed' : 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          whiteSpace: 'nowrap',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f4f4f5')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ffffff')}
                      >
                        {isGeneratingInviteFor === selectedMemberForInvite.member.email ? (
                          <>
                            <Loader2 size={13} className="animate-spin" />
                            <span>Generating...</span>
                          </>
                        ) : (
                          <>
                            <RefreshCw size={13} />
                            <span>Regenerate Link</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div
                style={{
                  padding: '0.85rem 1.5rem',
                  borderTop: '1px solid #e4e4e7',
                  display: 'flex',
                  justifyContent: 'flex-end',
                  backgroundColor: '#fafafa',
                }}
              >
                <button
                  type="button"
                  onClick={() => setSelectedMemberForInvite(null)}
                  style={{
                    height: '32px',
                    padding: '0 1.25rem',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    backgroundColor: '#ffffff',
                    color: '#09090b',
                    border: '1px solid #d4d4d8',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}

      {/* ── Bottom Feedback Notifications ── */}
      {errorMessage && (
        <div
          style={{
            padding: '0.85rem 1.25rem',
            backgroundColor: '#f4f4f5',
            border: '1.5px solid #09090b',
            borderRadius: '6px',
            color: '#09090b',
            fontWeight: 600,
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <AlertCircle size={18} color="#09090b" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div
          style={{
            padding: '0.85rem 1.25rem',
            backgroundColor: '#f4f4f5',
            border: '1.5px solid #09090b',
            borderRadius: '6px',
            color: '#09090b',
            fontWeight: 700,
            fontSize: '0.875rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <Check size={18} color="#09090b" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* ── Bottom Save Changes / View-Only Action ── */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
        {isSubClient ? (
          <div
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '1rem 1.25rem',
              backgroundColor: '#fafafa',
              border: '1.5px solid #09090b',
              borderRadius: '6px',
              flexWrap: 'wrap',
              gap: '0.75rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <ShieldCheck size={18} color="#09090b" style={{ flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#09090b' }}>
                  Company Profile is View-Only
                </div>
                <div style={{ fontSize: '0.75rem', color: '#52525b' }}>
                  As a Sub-client, you are managing your organization&apos;s workspace under the Primary Client&apos;s profile. To update your personal details, phone number, designation, or password, visit Settings.
                </div>
              </div>
            </div>
            <Link
              href="/settings"
              style={{
                height: '36px',
                padding: '0 1.25rem',
                fontSize: '0.8rem',
                fontWeight: 700,
                backgroundColor: '#09090b',
                color: '#ffffff',
                borderRadius: '4px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                textDecoration: 'none',
                whiteSpace: 'nowrap',
              }}
            >
              <span>Go to Personal Settings</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        ) : (
          <button
            type="submit"
            disabled={isSaving}
            className="btn btn-primary"
            style={{
              height: '40px',
              padding: '0 1.75rem',
              fontSize: '0.85rem',
              fontWeight: 700,
              backgroundColor: '#09090b',
              color: '#ffffff',
              borderRadius: '4px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            {isSaving ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </button>
        )}
      </div>
    </form>
  );
}

export default function CompanyProfilePage() {
  return (
    <Suspense
      fallback={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
          <Loader2 size={32} className="animate-spin" color="#09090b" />
        </div>
      }
    >
      <CompanyProfileFormContent />
    </Suspense>
  );
}
