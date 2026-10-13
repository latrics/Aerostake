'use client';

import React, { useState, useEffect, Suspense, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ChevronLeft,
  Check,
  AlertCircle,
  Loader2,
  Building,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { setCookie } from '@/lib/api-client';
import { usersApi } from '@/modules/users/api';
import { invitationsApi } from '@/modules/invitations/api';
import { InvitationOut } from '@/modules/invitations/types';
import { CompanyProfileData, TeamMemberContact } from '@/modules/users/types';
import { projectApi } from '@/modules/projects/api';
import { PageHeader } from '@/components/PageHeader';

import { calculateAerostakeValidity } from '@/modules/users/utils/validity';
import { AerostakeValidityBanner } from '@/modules/users/components/AerostakeValidityBanner';
import { CompanyProfileInformationSection } from '@/modules/users/components/CompanyProfileInformationSection';
import { CompanyProfileAddressSection } from '@/modules/users/components/CompanyProfileAddressSection';
import { CompanyProfilePrimaryContactSection } from '@/modules/users/components/CompanyProfilePrimaryContactSection';
import { CompanyProfileTeamSection } from '@/modules/users/components/CompanyProfileTeamSection';
import { TeamInvitationActionModal } from '@/modules/invitations/components/TeamInvitationActionModal';

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

  // 3. Primary Contact State
  const [primaryFullName, setPrimaryFullName] = useState('');
  const [primaryPhoneCode, setPrimaryPhoneCode] = useState('+91');
  const [primaryPhone, setPrimaryPhone] = useState('');
  const [primaryEmail, setPrimaryEmail] = useState('');
  const [primaryDepartment, setPrimaryDepartment] = useState('');

  // 4. Team Members State (up to 4 members)
  const [teamMembers, setTeamMembers] = useState<TeamMemberContact[]>([
    { id: 1, full_name: '', email: '', phone_number: '', department: '' },
    { id: 2, full_name: '', email: '', phone_number: '', department: '' },
    { id: 3, full_name: '', email: '', phone_number: '', department: '' },
    { id: 4, full_name: '', email: '', phone_number: '', department: '' },
  ]);

  // Invitations State
  const [invitations, setInvitations] = useState<InvitationOut[]>([]);
  const [selectedMemberForInvite, setSelectedMemberForInvite] = useState<{
    member: TeamMemberContact;
    invite: InvitationOut | null;
    index: number;
  } | null>(null);
  const [isGeneratingInviteFor, setIsGeneratingInviteFor] = useState<string | null>(null);

  // Aerostake Validity & 3-Year Agreement Tenure State
  const [totalLandings, setTotalLandings] = useState<number>(0);
  const [agreementStartDateStr, setAgreementStartDateStr] = useState<string>('');

  const loadInvitations = async () => {
    try {
      const data = await invitationsApi.getOrganizationInvitations();
      setInvitations(data || []);
    } catch (err) {
      console.error('Failed to load organization invitations:', err);
    }
  };

  // Fetch cumulative landings across client projects
  useEffect(() => {
    let isMounted = true;
    async function loadLandingsData() {
      try {
        const projects = await projectApi.listProjects().catch(() => []);
        const count = (projects || []).reduce(
          (acc: number, p: any) => acc + (p.completed_sectors_count ?? p.completed_sectors ?? 0),
          0
        );
        if (isMounted) {
          setTotalLandings(count);
        }
      } catch (err) {
        console.error('Failed to calculate client landings for profile:', err);
      }
    }
    loadLandingsData();
    return () => {
      isMounted = false;
    };
  }, []);

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
        setCompanyName(profile.company_name || '');

        const cp = profile.company_profile;

        if (isUserSub && cp?.primary_contact) {
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

          const agrDate = (cp as any).agreement_start_date || (cp as any).agreement_start || (cp as any).contract_start_date;
          if (agrDate) {
            setAgreementStartDateStr(String(agrDate).split('T')[0]);
          }

          if (cp.address) {
            setAddressLine1(cp.address.address_line1 || '');
            setAddressLine2(cp.address.address_line2 || '');
            setCity(cp.address.city || '');
            setPinCode(cp.address.pin_code || '');
            setState(cp.address.state || '');
            setCountry(cp.address.country || 'India');
          }

          if (cp.primary_contact?.department) {
            setPrimaryDepartment(cp.primary_contact.department);
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

  // Aerostake Validity calculation
  const { isLandingsOver, isValidityOver, tenureCalc } = useMemo(
    () => calculateAerostakeValidity(totalLandings, agreementStartDateStr),
    [totalLandings, agreementStartDateStr]
  );

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

  const primaryContactDisplayName = primaryFullName.trim() || user?.full_name || user?.email || 'Team Administrator';
  const companyDisplayName = companyName.trim() || user?.company_name || 'Our Company';

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
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

      {/* ── Aerostake Validity Completed Banner ── */}
      {isValidityOver && (
        <AerostakeValidityBanner
          isLandingsOver={isLandingsOver}
          tenureCalc={tenureCalc}
          totalLandings={totalLandings}
        />
      )}

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
      <CompanyProfileInformationSection
        isSubClient={isSubClient}
        companyName={companyName}
        setCompanyName={setCompanyName}
        industry={industry}
        setIndustry={setIndustry}
        companyType={companyType}
        setCompanyType={setCompanyType}
        gstNumber={gstNumber}
        setGstNumber={setGstNumber}
        registrationNumber={registrationNumber}
        setRegistrationNumber={setRegistrationNumber}
        yearOfEstablishment={yearOfEstablishment}
        setYearOfEstablishment={setYearOfEstablishment}
        website={website}
        setWebsite={setWebsite}
        companyDescription={companyDescription}
        setCompanyDescription={setCompanyDescription}
      />

      {/* ── 2. Company Address ── */}
      <CompanyProfileAddressSection
        isSubClient={isSubClient}
        addressLine1={addressLine1}
        setAddressLine1={setAddressLine1}
        addressLine2={addressLine2}
        setAddressLine2={setAddressLine2}
        city={city}
        setCity={setCity}
        pinCode={pinCode}
        setPinCode={setPinCode}
        state={state}
        setState={setState}
        country={country}
        setCountry={setCountry}
      />

      {/* ── 3. Primary Contact ── */}
      <CompanyProfilePrimaryContactSection
        isSubClient={isSubClient}
        primaryFullName={primaryFullName}
        setPrimaryFullName={setPrimaryFullName}
        primaryPhoneCode={primaryPhoneCode}
        setPrimaryPhoneCode={setPrimaryPhoneCode}
        primaryPhone={primaryPhone}
        setPrimaryPhone={setPrimaryPhone}
        primaryEmail={primaryEmail}
        setPrimaryEmail={setPrimaryEmail}
        primaryDepartment={primaryDepartment}
        setPrimaryDepartment={setPrimaryDepartment}
      />

      {/* ── 4. Team Members ── */}
      <CompanyProfileTeamSection
        isSubClient={isSubClient}
        teamMembers={teamMembers}
        invitations={invitations}
        onUpdateMember={handleUpdateTeamMember}
        onClearMember={handleClearTeamMember}
        onSelectMemberForInvite={setSelectedMemberForInvite}
      />

      {/* ── Team Member Invitation Modal ── */}
      <TeamInvitationActionModal
        selectedMember={selectedMemberForInvite}
        onClose={() => setSelectedMemberForInvite(null)}
        inviterName={primaryContactDisplayName}
        companyName={companyDisplayName}
        isSubClient={isSubClient}
        isGeneratingInvite={isGeneratingInviteFor === selectedMemberForInvite?.member.email}
        onRegenerateInvite={handleGenerateOrRefreshInvite}
      />

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
