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
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { setCookie } from '@/lib/api-client';
import { usersApi } from '@/modules/users/api';
import { CompanyProfileData, TeamMemberContact } from '@/modules/users/types';

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

  // Load existing profile from API
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    usersApi
      .getMe()
      .then((profile) => {
        if (!isMounted) return;

        // Basic fields
        setCompanyName(profile.company_name || '');
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

        // Detailed company_profile object if exists
        const cp = profile.company_profile;
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

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
      {/* ── Breadcrumb Navigation ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.825rem' }}>
        <Link
          href="/dashboard"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.2rem',
            color: '#09090b',
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          <ChevronLeft size={15} /> Company Profile
        </Link>
      </div>

      {/* ── Page Header ── */}
      <div style={{ paddingBottom: '0.25rem' }}>
        <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#09090b', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
          Company Profile
        </h1>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
          Manage your company information and team members. Keep your details up to date for smooth project collaboration.
        </p>
      </div>

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

      {/* ── Feedback Notifications ── */}
      {errorMessage && (
        <div
          style={{
            padding: '0.85rem 1.25rem',
            backgroundColor: '#fef2f2',
            border: '1.5px solid #ef4444',
            borderRadius: '6px',
            color: '#991b1b',
            fontWeight: 600,
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <AlertCircle size={18} color="#ef4444" />
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
        <div>
          <h2 className="wf-title" style={{ fontSize: '0.95rem', fontWeight: 700, color: '#09090b' }}>
            1. Company Information
          </h2>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
            Provide your company&apos;s basic details.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
          {/* Company Name */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#09090b' }}>
              Company Name <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Enter company name"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="form-input"
              style={{ fontSize: '0.8rem', height: '36px', border: '1px solid #d4d4d8', borderRadius: '4px' }}
            />
          </div>

          {/* Industry / Sector */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#09090b' }}>
              Industry / Sector <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <select
              required
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              className="form-select"
              style={{ fontSize: '0.8rem', height: '36px', border: '1px solid #d4d4d8', borderRadius: '4px' }}
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
              Company Type <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <select
              required
              value={companyType}
              onChange={(e) => setCompanyType(e.target.value)}
              className="form-select"
              style={{ fontSize: '0.8rem', height: '36px', border: '1px solid #d4d4d8', borderRadius: '4px' }}
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
              placeholder="Enter GST number"
              value={gstNumber}
              onChange={(e) => setGstNumber(e.target.value.toUpperCase())}
              className="form-input"
              style={{ fontSize: '0.8rem', height: '36px', border: '1px solid #d4d4d8', borderRadius: '4px' }}
            />
          </div>

          {/* Registration Number */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#09090b' }}>
              Registration Number (Optional)
            </label>
            <input
              type="text"
              placeholder="Enter registration number"
              value={registrationNumber}
              onChange={(e) => setRegistrationNumber(e.target.value)}
              className="form-input"
              style={{ fontSize: '0.8rem', height: '36px', border: '1px solid #d4d4d8', borderRadius: '4px' }}
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
                placeholder="Select year"
                value={yearOfEstablishment}
                onChange={(e) => setYearOfEstablishment(e.target.value)}
                className="form-input"
                style={{ fontSize: '0.8rem', height: '36px', border: '1px solid #d4d4d8', borderRadius: '4px', paddingRight: '2rem' }}
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
              placeholder="https://www.yourcompany.com"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              className="form-input"
              style={{ fontSize: '0.8rem', height: '36px', border: '1px solid #d4d4d8', borderRadius: '4px' }}
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
        <div>
          <h2 className="wf-title" style={{ fontSize: '0.95rem', fontWeight: 700, color: '#09090b' }}>
            2. Company Address
          </h2>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
            Provide your official business address.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
          {/* Address Line 1 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#09090b' }}>
              Address Line 1 <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Enter address line 1"
              value={addressLine1}
              onChange={(e) => setAddressLine1(e.target.value)}
              className="form-input"
              style={{ fontSize: '0.8rem', height: '36px', border: '1px solid #d4d4d8', borderRadius: '4px' }}
            />
          </div>

          {/* Address Line 2 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#09090b' }}>
              Address Line 2 (Optional)
            </label>
            <input
              type="text"
              placeholder="Enter address line 2"
              value={addressLine2}
              onChange={(e) => setAddressLine2(e.target.value)}
              className="form-input"
              style={{ fontSize: '0.8rem', height: '36px', border: '1px solid #d4d4d8', borderRadius: '4px' }}
            />
          </div>

          {/* City */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#09090b' }}>
              City <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Enter city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="form-input"
              style={{ fontSize: '0.8rem', height: '36px', border: '1px solid #d4d4d8', borderRadius: '4px' }}
            />
          </div>

          {/* PIN / Postal Code */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#09090b' }}>
              PIN / Postal Code <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Enter PIN code"
              value={pinCode}
              onChange={(e) => setPinCode(e.target.value)}
              className="form-input"
              style={{ fontSize: '0.8rem', height: '36px', border: '1px solid #d4d4d8', borderRadius: '4px' }}
            />
          </div>

          {/* State */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#09090b' }}>
              State <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <select
              required
              value={state}
              onChange={(e) => setState(e.target.value)}
              className="form-select"
              style={{ fontSize: '0.8rem', height: '36px', border: '1px solid #d4d4d8', borderRadius: '4px' }}
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
              Country <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <select
              required
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="form-select"
              style={{ fontSize: '0.8rem', height: '36px', border: '1px solid #d4d4d8', borderRadius: '4px' }}
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
        <div>
          <h2 className="wf-title" style={{ fontSize: '0.95rem', fontWeight: 700, color: '#09090b' }}>
            3. Primary Contact (You)
          </h2>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
            These details will be used as the main point of contact for all communications.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
          {/* Full Name */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#09090b' }}>
              Full Name <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Enter full name"
              value={primaryFullName}
              onChange={(e) => setPrimaryFullName(e.target.value)}
              className="form-input"
              style={{ fontSize: '0.8rem', height: '36px', border: '1px solid #d4d4d8', borderRadius: '4px' }}
            />
          </div>

          {/* Phone Number */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#09090b' }}>
              Phone Number <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <div style={{ display: 'flex', gap: '0.35rem' }}>
              <select
                value={primaryPhoneCode}
                onChange={(e) => setPrimaryPhoneCode(e.target.value)}
                className="form-select"
                style={{ width: '68px', fontSize: '0.75rem', height: '36px', border: '1px solid #d4d4d8', borderRadius: '4px', padding: '0 0.3rem' }}
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
                placeholder="Enter phone number"
                value={primaryPhone}
                onChange={(e) => setPrimaryPhone(e.target.value)}
                className="form-input"
                style={{ flex: 1, fontSize: '0.8rem', height: '36px', border: '1px solid #d4d4d8', borderRadius: '4px' }}
              />
            </div>
          </div>

          {/* Email Address */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#09090b' }}>
              Email Address <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="email"
              required
              placeholder="Enter email address"
              value={primaryEmail}
              onChange={(e) => setPrimaryEmail(e.target.value)}
              className="form-input"
              style={{ fontSize: '0.8rem', height: '36px', border: '1px solid #d4d4d8', borderRadius: '4px' }}
            />
          </div>

          {/* Department / Designation */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#09090b' }}>
              Department / Designation <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Enter department or designation"
              value={primaryDepartment}
              onChange={(e) => setPrimaryDepartment(e.target.value)}
              className="form-input"
              style={{ fontSize: '0.8rem', height: '36px', border: '1px solid #d4d4d8', borderRadius: '4px' }}
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
        <div>
          <h2 className="wf-title" style={{ fontSize: '0.95rem', fontWeight: 700, color: '#09090b' }}>
            4. Team Members (Subordinate Contacts) <span style={{ fontWeight: 500, color: '#71717a', fontSize: '0.85rem' }}>(Optional)</span>
          </h2>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
            Optional: Add up to 4 team members who can be assigned to projects and will be contacted by the Latrics team.
          </p>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="wf-table" style={{ margin: 0, minWidth: '720px' }}>
            <thead>
              <tr>
                <th style={{ width: '4%' }}>#</th>
                <th style={{ width: '26%' }}>Full Name (Optional)</th>
                <th style={{ width: '26%' }}>Email Address (Optional)</th>
                <th style={{ width: '22%' }}>Phone Number (Optional)</th>
                <th style={{ width: '18%' }}>Department / Designation</th>
                <th style={{ width: '4%', textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {teamMembers.map((member, idx) => (
                <tr key={idx}>
                  <td style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>{idx + 1}</td>
                  <td>
                    <input
                      type="text"
                      placeholder="Enter full name"
                      value={member.full_name}
                      onChange={(e) => handleUpdateTeamMember(idx, 'full_name', e.target.value)}
                      className="form-input"
                      style={{ fontSize: '0.775rem', height: '34px', border: '1px solid #d4d4d8', borderRadius: '4px' }}
                    />
                  </td>
                  <td>
                    <input
                      type="email"
                      placeholder="Enter email address"
                      value={member.email}
                      onChange={(e) => handleUpdateTeamMember(idx, 'email', e.target.value)}
                      className="form-input"
                      style={{ fontSize: '0.775rem', height: '34px', border: '1px solid #d4d4d8', borderRadius: '4px' }}
                    />
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                      <select
                        className="form-select"
                        style={{ width: '60px', fontSize: '0.725rem', height: '34px', padding: '0 0.2rem', border: '1px solid #d4d4d8', borderRadius: '4px' }}
                        defaultValue="+91"
                      >
                        <option value="+91">+91</option>
                        <option value="+1">+1</option>
                        <option value="+44">+44</option>
                        <option value="+971">+971</option>
                      </select>
                      <input
                        type="text"
                        placeholder="Enter phone number"
                        value={member.phone_number || ''}
                        onChange={(e) => handleUpdateTeamMember(idx, 'phone_number', e.target.value)}
                        className="form-input"
                        style={{ flex: 1, fontSize: '0.775rem', height: '34px', border: '1px solid #d4d4d8', borderRadius: '4px' }}
                      />
                    </div>
                  </td>
                  <td>
                    <input
                      type="text"
                      placeholder="Enter department"
                      value={member.department || ''}
                      onChange={(e) => handleUpdateTeamMember(idx, 'department', e.target.value)}
                      className="form-input"
                      style={{ fontSize: '0.775rem', height: '34px', border: '1px solid #d4d4d8', borderRadius: '4px' }}
                    />
                  </td>
                  <td style={{ textAlign: 'center' }}>
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
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.725rem', color: 'var(--text-muted)' }}>
          <Info size={14} style={{ flexShrink: 0 }} />
          <span>You can add up to 4 team members (optional).</span>
        </div>
      </div>

      {/* ── Bottom Feedback Notifications ── */}
      {errorMessage && (
        <div
          style={{
            padding: '0.85rem 1.25rem',
            backgroundColor: '#fef2f2',
            border: '1.5px solid #ef4444',
            borderRadius: '6px',
            color: '#991b1b',
            fontWeight: 600,
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <AlertCircle size={18} color="#ef4444" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div
          style={{
            padding: '0.85rem 1.25rem',
            backgroundColor: '#f0fdf4',
            border: '1.5px solid #22c55e',
            borderRadius: '6px',
            color: '#15803d',
            fontWeight: 700,
            fontSize: '0.875rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <Check size={18} color="#15803d" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* ── Bottom Save Changes Action ── */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
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
