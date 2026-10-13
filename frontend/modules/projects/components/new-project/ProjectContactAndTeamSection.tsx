'use client';

import React, { useRef, useState, useEffect } from 'react';
import {
  ChevronDown,
  Check,
  X,
  Mail,
  Phone,
  UserCheck,
} from 'lucide-react';

interface ContactOption {
  id: string;
  name: string;
  email: string;
  phone: string;
  designation: string;
  isPrimary: boolean;
}

interface ProjectContactAndTeamSectionProps {
  ownerName: string;
  setOwnerName: (val: string) => void;
  primaryEmail: string;
  setPrimaryEmail: (val: string) => void;
  phoneCode: string;
  setPhoneCode: (val: string) => void;
  phoneNumber: string;
  setPhoneNumber: (val: string) => void;
  companyName: string;
  isSubClient: boolean;
  selectedContacts: string[];
  onAddContact: (name: string) => void;
  onRemoveContact: (name: string) => void;
  allContactOptions: ContactOption[];
  isLoadingMembers: boolean;
  getContactProfile: (contactKey: string) => {
    name: string;
    email: string;
    phone: string;
    designation: string;
    role: string;
    isPrimary: boolean;
  };
  isReadOnly?: boolean;
}

export function ProjectContactAndTeamSection({
  ownerName,
  setOwnerName,
  primaryEmail,
  setPrimaryEmail,
  phoneCode,
  setPhoneCode,
  phoneNumber,
  setPhoneNumber,
  companyName,
  isSubClient,
  selectedContacts,
  onAddContact,
  onRemoveContact,
  allContactOptions,
  isLoadingMembers,
  getContactProfile,
  isReadOnly,
}: ProjectContactAndTeamSectionProps) {
  const [isContactDropdownOpen, setIsContactDropdownOpen] = useState(false);
  const [contactSearchInput, setContactSearchInput] = useState('');
  const contactDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        contactDropdownRef.current &&
        !contactDropdownRef.current.contains(event.target as Node)
      ) {
        setIsContactDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
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
      <h2 className="wf-title" style={{ fontSize: '0.95rem', fontWeight: 700, color: '#09090b' }}>
        2. Contact Information
      </h2>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '1.25rem',
        }}
      >
        {/* Left Sub-Card: Profile Contact Info (Always Primary Client's details) */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.85rem',
            padding: '1.15rem',
            border: '1px solid #e4e4e7',
            borderRadius: '6px',
            backgroundColor: '#ffffff',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#09090b' }}>
              Primary Contact (Auto-filled)
            </span>
            <span
              style={{
                fontSize: '0.675rem',
                fontWeight: 600,
                color: '#09090b',
                backgroundColor: '#f4f4f5',
                padding: '2px 8px',
                borderRadius: '4px',
                border: '1px solid #d4d4d8',
              }}
            >
              Primary Client
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            <label style={{ fontSize: '0.725rem', fontWeight: 600, color: '#09090b' }}>
              Owner / Contact Person <span style={{ color: '#09090b' }}>*</span>
            </label>
            <input
              type="text"
              required
              readOnly={isSubClient || isReadOnly}
              disabled={isReadOnly}
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              className="form-input"
              style={{
                fontSize: '0.8rem',
                height: '36px',
                backgroundColor: isSubClient || isReadOnly ? '#f4f4f5' : '#ffffff',
                color: isSubClient || isReadOnly ? '#52525b' : '#09090b',
                border: '1px solid #d4d4d8',
                borderRadius: '4px',
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: '0.75rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <label style={{ fontSize: '0.725rem', fontWeight: 600, color: '#09090b' }}>
                Email <span style={{ color: '#09090b' }}>*</span>
              </label>
              <input
                type="email"
                required
                readOnly={isSubClient || isReadOnly}
                disabled={isReadOnly}
                value={primaryEmail}
                onChange={(e) => setPrimaryEmail(e.target.value)}
                className="form-input"
                style={{
                  fontSize: '0.8rem',
                  height: '36px',
                  backgroundColor: isSubClient || isReadOnly ? '#f4f4f5' : '#ffffff',
                  color: isSubClient || isReadOnly ? '#52525b' : '#09090b',
                  border: '1px solid #d4d4d8',
                  borderRadius: '4px',
                }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <label style={{ fontSize: '0.725rem', fontWeight: 600, color: '#09090b' }}>
                Phone Number <span style={{ color: '#09090b' }}>*</span>
              </label>
              <div style={{ display: 'flex', gap: '0.35rem' }}>
                <select
                  value={phoneCode}
                  disabled={isSubClient || isReadOnly}
                  onChange={(e) => setPhoneCode(e.target.value)}
                  className="form-select"
                  style={{
                    width: '68px',
                    fontSize: '0.75rem',
                    height: '36px',
                    backgroundColor: isSubClient || isReadOnly ? '#f4f4f5' : '#ffffff',
                    border: '1px solid #d4d4d8',
                    borderRadius: '4px',
                    padding: '0 0.3rem',
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
                  readOnly={isSubClient || isReadOnly}
                  disabled={isReadOnly}
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="form-input"
                  style={{
                    flex: 1,
                    fontSize: '0.8rem',
                    height: '36px',
                    backgroundColor: isSubClient || isReadOnly ? '#f4f4f5' : '#ffffff',
                    color: isSubClient || isReadOnly ? '#52525b' : '#09090b',
                    border: '1px solid #d4d4d8',
                    borderRadius: '4px',
                  }}
                />
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            <label style={{ fontSize: '0.725rem', fontWeight: 600, color: '#09090b' }}>
              Company <span style={{ color: '#09090b' }}>*</span>
            </label>
            <input
              type="text"
              readOnly
              value={companyName}
              className="form-input"
              style={{
                fontSize: '0.8rem',
                height: '36px',
                backgroundColor: '#f4f4f5',
                color: '#52525b',
                border: '1px solid #e4e4e7',
                borderRadius: '4px',
              }}
            />
          </div>
          {isSubClient && (
            <span style={{ fontSize: '0.7rem', color: '#71717a', lineHeight: 1.3 }}>
              Linked automatically to your company&apos;s primary client contact credentials.
            </span>
          )}
        </div>

        {/* Right Sub-Card: Project Communication Contacts */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
            padding: '1.15rem',
            border: '1px solid #e4e4e7',
            borderRadius: '6px',
            backgroundColor: '#ffffff',
          }}
        >
          <div>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#09090b' }}>
              Project Communication Contacts <span style={{ color: '#09090b' }}>*</span>
            </span>
            <p style={{ fontSize: '0.725rem', color: 'var(--text-secondary)', marginTop: '0.2rem', lineHeight: 1.35 }}>
              Select one or more team members from your organization who should be included in project communications with the Latrics team.
            </p>
          </div>

          {/* Custom Multi-Select Dropdown Container */}
          <div ref={contactDropdownRef} style={{ position: 'relative', marginTop: '0.25rem' }}>
            <div
              onClick={() => {
                if (!isReadOnly) setIsContactDropdownOpen(!isContactDropdownOpen);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                height: '36px',
                padding: '0 0.75rem',
                border: '1px solid #d4d4d8',
                borderRadius: '4px',
                backgroundColor: isReadOnly ? '#f4f4f5' : '#ffffff',
                cursor: isReadOnly ? 'default' : 'pointer',
                fontSize: '0.8rem',
                color: '#71717a',
              }}
            >
              <span>{selectedContacts.length > 0 ? `${selectedContacts.length} contact(s) selected` : 'Select contacts...'}</span>
              <ChevronDown size={15} color="#71717a" />
            </div>

            {/* Dropdown Menu */}
            {isContactDropdownOpen && !isReadOnly && (
              <div
                style={{
                  position: 'absolute',
                  top: '40px',
                  left: 0,
                  right: 0,
                  backgroundColor: '#ffffff',
                  border: '1px solid #d4d4d8',
                  borderRadius: '6px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  zIndex: 50,
                  padding: '0.5rem',
                  maxHeight: '230px',
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.25rem',
                }}
              >
                <div style={{ padding: '0.25rem', display: 'flex', gap: '0.35rem' }}>
                  <input
                    type="text"
                    placeholder="Search company member..."
                    value={contactSearchInput}
                    onChange={(e) => setContactSearchInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (contactSearchInput.trim()) {
                          onAddContact(contactSearchInput);
                          setContactSearchInput('');
                        }
                      }
                    }}
                    className="form-input"
                    style={{ fontSize: '0.75rem', height: '30px', flex: 1 }}
                  />
                  {contactSearchInput.trim() && (
                    <button
                      type="button"
                      onClick={() => {
                        onAddContact(contactSearchInput);
                        setContactSearchInput('');
                      }}
                      className="btn btn-primary"
                      style={{ fontSize: '0.725rem', padding: '0.2rem 0.5rem', height: '30px' }}
                    >
                      Add
                    </button>
                  )}
                </div>

                <div style={{ height: '1px', backgroundColor: '#e4e4e7', margin: '0.25rem 0' }} />

                {isLoadingMembers ? (
                  <div style={{ padding: '0.5rem', fontSize: '0.75rem', color: '#71717a', textAlign: 'center' }}>
                    Loading team members...
                  </div>
                ) : allContactOptions.length > 0 ? (
                  allContactOptions
                    .filter((contact) => {
                      const name = contact.name || contact.email;
                      return (
                        name.toLowerCase().includes(contactSearchInput.toLowerCase()) ||
                        contact.email.toLowerCase().includes(contactSearchInput.toLowerCase())
                      );
                    })
                    .map((contact) => {
                      const contactKey = contact.name || contact.email;
                      const isSelected = selectedContacts.includes(contactKey);

                      return (
                        <div
                          key={contact.id || contactKey}
                          onClick={() => {
                            if (isSelected) {
                              onRemoveContact(contactKey);
                            } else {
                              onAddContact(contactKey);
                            }
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '0.45rem 0.65rem',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            backgroundColor: isSelected ? '#f4f4f5' : 'transparent',
                          }}
                          onMouseEnter={(e) => {
                            if (!isSelected) e.currentTarget.style.backgroundColor = '#fafafa';
                          }}
                          onMouseLeave={(e) => {
                            if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                          }}
                        >
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <span style={{ fontSize: '0.78rem', fontWeight: isSelected ? 700 : 600, color: '#09090b' }}>
                                {contact.name}
                              </span>
                              <span
                                style={{
                                  fontSize: '0.65rem',
                                  color: contact.isPrimary ? '#09090b' : '#71717a',
                                  backgroundColor: '#f4f4f5',
                                  border: contact.isPrimary ? '1px solid #d4d4d8' : 'none',
                                  padding: '1px 5px',
                                  borderRadius: '3px',
                                  fontWeight: 500,
                                }}
                              >
                                {contact.designation}
                              </span>
                            </div>
                            <div style={{ fontSize: '0.7rem', color: '#71717a' }}>
                              {contact.email} {contact.phone ? `• ${contact.phone}` : ''}
                            </div>
                          </div>
                          {isSelected && <Check size={14} color="#09090b" />}
                        </div>
                      );
                    })
                ) : (
                  <div style={{ padding: '0.5rem', fontSize: '0.75rem', color: '#71717a', textAlign: 'center' }}>
                    No team members found in company profile.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Selected Contact Pill Badges */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem', marginTop: '0.35rem' }}>
            {selectedContacts.map((contact) => (
              <div
                key={contact}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.3rem 0.65rem',
                  backgroundColor: '#f4f4f5',
                  border: '1px solid #e4e4e7',
                  borderRadius: '16px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: '#09090b',
                }}
              >
                <span>{contact}</span>
                {!isReadOnly && (
                  <button
                    type="button"
                    onClick={() => onRemoveContact(contact)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      padding: 0,
                      color: '#71717a',
                    }}
                    title="Remove contact"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
            ))}
            {selectedContacts.length === 0 && (
              <span style={{ fontSize: '0.725rem', color: '#a1a1aa', fontStyle: 'italic' }}>
                No communication contacts selected yet. Choose contacts from the dropdown above.
              </span>
            )}
          </div>

          {/* Selected Contact Details List */}
          {selectedContacts.length > 0 && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.6rem',
                marginTop: '0.65rem',
                paddingTop: '0.75rem',
                borderTop: '1px solid #e4e4e7',
              }}
            >
              <div
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: '#09090b',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
              >
                <UserCheck size={14} color="#09090b" />
                <span>Selected Contact Details ({selectedContacts.length})</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {selectedContacts.map((contactKey) => {
                  const profile = getContactProfile(contactKey);
                  return (
                    <div
                      key={contactKey}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.65rem 0.85rem',
                        backgroundColor: '#fafafa',
                        border: '1px solid #e4e4e7',
                        borderRadius: '6px',
                        gap: '0.75rem',
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#09090b' }}>
                            {profile.name}
                          </span>
                          <span
                            style={{
                              fontSize: '0.675rem',
                              color: profile.isPrimary ? '#09090b' : '#52525b',
                              backgroundColor: '#f4f4f5',
                              border: profile.isPrimary ? '1px solid #d4d4d8' : '1px solid #e4e4e7',
                              padding: '1px 6px',
                              borderRadius: '4px',
                              fontWeight: 600,
                            }}
                          >
                            {profile.designation}
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap', fontSize: '0.735rem', color: '#52525b', marginTop: '0.15rem' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <Mail size={12} color="#71717a" /> {profile.email}
                          </span>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <Phone size={12} color="#71717a" /> {profile.phone}
                          </span>
                        </div>
                      </div>

                      {!isReadOnly && (
                        <button
                          type="button"
                          onClick={() => onRemoveContact(contactKey)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '4px',
                            color: '#71717a',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = '#09090b')}
                          onMouseLeave={(e) => (e.currentTarget.style.color = '#71717a')}
                          title="Remove contact"
                        >
                          <X size={15} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
