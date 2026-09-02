'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft,
  Search,
  Bell,
  User,
  UploadCloud,
  Calendar,
  Plus,
  Trash2,
  Info,
  Check,
  FileText,
} from 'lucide-react';

export default function NewProjectRequestPage() {
  const router = useRouter();

  // Form State
  const [projectName, setProjectName] = useState('');
  const [primaryContact, setPrimaryContact] = useState({
    name: 'Amit Raj',
    email: 'amit.raj@acmeinfra.com',
    phone: '+91 98765 43210',
    company: 'Acme Infra Pvt. Ltd.',
  });
  const [alternateContact, setAlternateContact] = useState({
    email: '',
    phoneCode: '+91',
    phone: '',
  });

  const [deliverables, setDeliverables] = useState<Record<string, boolean>>({
    orthomosaic: false,
    dem: false,
    dsm: false,
    pointCloud: false,
    topoMap: false,
    contourMap: false,
    mesh3D: false,
    cadOutput: false,
    assetInventory: false,
    inspectionReport: false,
    other: false,
  });
  const [otherDeliverableText, setOtherDeliverableText] = useState('');

  const [kmlFileName, setKmlFileName] = useState<string | null>(null);
  const [scopeFileName, setScopeFileName] = useState<string | null>(null);

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [tenureDays, setTenureDays] = useState(0);

  const [selectedPayload, setSelectedPayload] = useState('');
  const [remarks, setRemarks] = useState('');

  const [assignedContacts, setAssignedContacts] = useState([
    { id: 1, name: '', role: '', email: '', phoneCode: '+91', phone: '' },
    { id: 2, name: '', role: '', email: '', phoneCode: '+91', phone: '' },
    { id: 3, name: '', role: '', email: '', phoneCode: '+91', phone: '' },
    { id: 4, name: '', role: '', email: '', phoneCode: '+91', phone: '' },
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState(false);

  // Date difference calculation for tenure
  const handleStartDateChange = (val: string) => {
    setStartDate(val);
    calculateTenure(val, endDate);
  };

  const handleEndDateChange = (val: string) => {
    setEndDate(val);
    calculateTenure(startDate, val);
  };

  const calculateTenure = (start: string, end: string) => {
    if (start && end) {
      const d1 = new Date(start);
      const d2 = new Date(end);
      const diffTime = d2.getTime() - d1.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      setTenureDays(diffDays > 0 ? diffDays : 0);
    } else {
      setTenureDays(0);
    }
  };

  const toggleDeliverable = (key: string) => {
    setDeliverables((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const updateContact = (index: number, field: string, value: string) => {
    setAssignedContacts((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const removeContact = (index: number) => {
    setAssignedContacts((prev) => prev.filter((_, i) => i !== index));
  };

  const addContact = () => {
    if (assignedContacts.length < 4) {
      setAssignedContacts((prev) => [
        ...prev,
        { id: prev.length + 1, name: '', role: '', email: '', phoneCode: '+91', phone: '' },
      ]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setSuccessMessage(true);
      setTimeout(() => {
        router.push('/requests');
      }, 1500);
    }, 800);
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* ── Top Breadcrumb & User Info Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.825rem' }}>
          <Link
            href="/requests"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', color: '#09090b', fontWeight: 600 }}
          >
            <ChevronLeft size={14} /> Requests
          </Link>
          <span style={{ color: 'var(--text-muted)' }}>&gt;</span>
          <span style={{ color: 'var(--text-secondary)' }}>New Request</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ position: 'relative', width: '280px' }}>
            <input
              type="text"
              placeholder="Search projects, clients, requests..."
              className="form-input"
              style={{ fontSize: '0.775rem', height: '34px', paddingRight: '2rem' }}
            />
            <Search size={14} color="#71717a" style={{ position: 'absolute', right: '10px', top: '10px' }} />
          </div>

          <button
            type="button"
            style={{
              width: '34px',
              height: '34px',
              border: '1px solid var(--border-color)',
              borderRadius: '6px',
              backgroundColor: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <Bell size={15} color="#09090b" />
          </button>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontSize: '0.8rem',
              fontWeight: 600,
              color: '#09090b',
            }}
          >
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                border: '1px solid var(--border-color)',
                backgroundColor: '#fafafa',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <User size={16} color="#09090b" />
            </div>
            <span>Ops User</span>
          </div>
        </div>
      </div>

      {/* ── Page Hero Header & Action Buttons ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#09090b' }}>
            New Project Request
          </h1>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
            Submit a new survey / mapping request. All fields marked with <span style={{ color: '#ef4444' }}>*</span> are required.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <button
            type="button"
            onClick={() => router.push('/requests')}
            className="btn btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', height: '36px', fontSize: '0.8rem' }}
          >
            <FileText size={14} /> Save Draft
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', height: '36px', fontSize: '0.8rem' }}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Request'}
          </button>
        </div>
      </div>

      {successMessage && (
        <div
          style={{
            padding: '0.85rem 1.25rem',
            backgroundColor: '#f4f4f5',
            border: '1px solid #09090b',
            borderRadius: '6px',
            color: '#09090b',
            fontWeight: 700,
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <Check size={16} /> Request submitted successfully! Redirecting to requests ledger...
        </div>
      )}

      {/* ── 1. Project Details ── */}
      <div className="wf-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <h2 className="wf-title" style={{ fontSize: '0.95rem' }}>1. Project Details</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          <label style={{ fontSize: '0.775rem', fontWeight: 600, color: '#09090b' }}>
            Project Name <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <input
            type="text"
            required
            placeholder="Enter project name"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            className="form-input"
            style={{ fontSize: '0.8rem', height: '36px' }}
          />
        </div>
      </div>

      {/* ── 2. Contact Information ── */}
      <div className="wf-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <h2 className="wf-title" style={{ fontSize: '0.95rem' }}>2. Contact Information</h2>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          {/* Left: Primary Contact (Auto-filled) */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
              padding: '1rem',
              border: '1px solid var(--border-color)',
              borderRadius: '6px',
              backgroundColor: '#fafafa',
            }}
          >
            <span style={{ fontSize: '0.775rem', fontWeight: 700, color: '#09090b' }}>
              Primary Contact (Auto-filled)
            </span>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <label style={{ fontSize: '0.725rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Owner / Contact Person <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                value={primaryContact.name}
                onChange={(e) => setPrimaryContact({ ...primaryContact, name: e.target.value })}
                className="form-input"
                style={{ fontSize: '0.8rem', height: '34px', backgroundColor: '#ffffff' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <label style={{ fontSize: '0.725rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Email <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="email"
                  value={primaryContact.email}
                  onChange={(e) => setPrimaryContact({ ...primaryContact, email: e.target.value })}
                  className="form-input"
                  style={{ fontSize: '0.8rem', height: '34px', backgroundColor: '#ffffff' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <label style={{ fontSize: '0.725rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Phone Number <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  value={primaryContact.phone}
                  onChange={(e) => setPrimaryContact({ ...primaryContact, phone: e.target.value })}
                  className="form-input"
                  style={{ fontSize: '0.8rem', height: '34px', backgroundColor: '#ffffff' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <label style={{ fontSize: '0.725rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Company <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                value={primaryContact.company}
                onChange={(e) => setPrimaryContact({ ...primaryContact, company: e.target.value })}
                className="form-input"
                style={{ fontSize: '0.8rem', height: '34px', backgroundColor: '#ffffff' }}
              />
            </div>
          </div>

          {/* Right: Alternate Contact (Optional) */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
              padding: '1rem',
              border: '1px solid var(--border-color)',
              borderRadius: '6px',
              backgroundColor: '#fafafa',
            }}
          >
            <span style={{ fontSize: '0.775rem', fontWeight: 700, color: '#09090b' }}>
              Alternate Contact (Optional)
            </span>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <label style={{ fontSize: '0.725rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Alternate Email
              </label>
              <input
                type="email"
                placeholder="Enter alternate email"
                value={alternateContact.email}
                onChange={(e) => setAlternateContact({ ...alternateContact, email: e.target.value })}
                className="form-input"
                style={{ fontSize: '0.8rem', height: '34px', backgroundColor: '#ffffff' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <label style={{ fontSize: '0.725rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Alternate Phone Number
              </label>
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <select
                  value={alternateContact.phoneCode}
                  onChange={(e) => setAlternateContact({ ...alternateContact, phoneCode: e.target.value })}
                  className="form-select"
                  style={{ width: '80px', fontSize: '0.8rem', height: '34px', backgroundColor: '#ffffff' }}
                >
                  <option value="+91">+91</option>
                  <option value="+1">+1</option>
                  <option value="+44">+44</option>
                  <option value="+971">+971</option>
                </select>
                <input
                  type="text"
                  placeholder="Enter phone number"
                  value={alternateContact.phone}
                  onChange={(e) => setAlternateContact({ ...alternateContact, phone: e.target.value })}
                  className="form-input"
                  style={{ flex: 1, fontSize: '0.8rem', height: '34px', backgroundColor: '#ffffff' }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 3. Deliverables ── */}
      <div className="wf-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
        <div>
          <h2 className="wf-title" style={{ fontSize: '0.95rem' }}>
            3. Deliverables <span style={{ color: '#ef4444' }}>*</span>
          </h2>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
            Select the desired output types.
          </p>
        </div>

        {/* 4-Column Grid of Checkboxes */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.85rem 1.5rem' }}>
          {[
            { id: 'orthomosaic', label: 'Orthomosaic' },
            { id: 'dem', label: 'Digital Elevation Model (DEM)' },
            { id: 'dsm', label: 'Digital Surface Model (DSM)' },
            { id: 'pointCloud', label: 'Point Cloud' },
            { id: 'topoMap', label: 'Topographic Map' },
            { id: 'contourMap', label: 'Contour Map' },
            { id: 'mesh3D', label: '3D Model / Mesh' },
            { id: 'cadOutput', label: 'CAD / Vector Output' },
            { id: 'assetInventory', label: 'Asset Inventory' },
            { id: 'inspectionReport', label: 'Inspection Report' },
          ].map((item) => (
            <label
              key={item.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.775rem',
                color: '#09090b',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={deliverables[item.id] || false}
                onChange={() => toggleDeliverable(item.id)}
                style={{ cursor: 'pointer' }}
              />
              <span>{item.label}</span>
            </label>
          ))}

          {/* Other Checkbox + Inline input */}
          <div style={{ gridColumn: 'span 2', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.775rem',
                color: '#09090b',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              <input
                type="checkbox"
                checked={deliverables.other || false}
                onChange={() => toggleDeliverable('other')}
                style={{ cursor: 'pointer' }}
              />
              <span>Other (Please specify)</span>
            </label>
            <input
              type="text"
              placeholder="Type here..."
              value={otherDeliverableText}
              onChange={(e) => setOtherDeliverableText(e.target.value)}
              disabled={!deliverables.other}
              className="form-input"
              style={{ flex: 1, fontSize: '0.75rem', height: '30px' }}
            />
          </div>
        </div>
      </div>

      {/* ── 4. KML / Boundary Upload ── */}
      <div className="wf-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
        <div>
          <h2 className="wf-title" style={{ fontSize: '0.95rem' }}>
            4. KML / Boundary Upload <span style={{ color: '#ef4444' }}>*</span>
          </h2>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
            Upload KML / KMZ file of the area of interest.
          </p>
        </div>

        <div
          style={{
            border: '1.5px dashed var(--border-color)',
            borderRadius: '6px',
            padding: '1.5rem',
            backgroundColor: '#fafafa',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <UploadCloud size={28} color="#71717a" />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#09090b' }}>
                {kmlFileName ? kmlFileName : 'Drag and drop your file here, or browse'}
              </span>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                Supports KML, KMZ files up to 50MB
              </span>
            </div>
          </div>

          <label
            className="btn btn-secondary"
            style={{ fontSize: '0.75rem', padding: '0.4rem 0.85rem', cursor: 'pointer' }}
          >
            Browse Files
            <input
              type="file"
              accept=".kml,.kmz"
              style={{ display: 'none' }}
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  setKmlFileName(e.target.files[0].name);
                }
              }}
            />
          </label>
        </div>
      </div>

      {/* ── Sections 5 & 6 (Two-Column Split) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
        {/* 5. Schedule */}
        <div className="wf-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          <h2 className="wf-title" style={{ fontSize: '0.95rem' }}>5. Schedule</h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <label style={{ fontSize: '0.725rem', fontWeight: 600, color: '#09090b' }}>
                Expected Start Date <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => handleStartDateChange(e.target.value)}
                className="form-input"
                style={{ fontSize: '0.8rem', height: '34px' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <label style={{ fontSize: '0.725rem', fontWeight: 600, color: '#09090b' }}>
                Expected End Date <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="date"
                required
                value={endDate}
                onChange={(e) => handleEndDateChange(e.target.value)}
                className="form-input"
                style={{ fontSize: '0.8rem', height: '34px' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            <label style={{ fontSize: '0.725rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Tenure
            </label>
            <input
              type="text"
              readOnly
              value={`${tenureDays} Days`}
              className="form-input"
              style={{ fontSize: '0.8rem', height: '34px', backgroundColor: '#f4f4f5', color: '#71717a' }}
            />
          </div>
        </div>

        {/* 6. Payloads / Sensors */}
        <div className="wf-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          <div>
            <h2 className="wf-title" style={{ fontSize: '0.95rem' }}>
              6. Payloads / Sensors <span style={{ color: '#ef4444' }}>*</span>
            </h2>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
              Select the required payloads / sensors for this project.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', marginTop: '0.2rem' }}>
            <select
              required
              value={selectedPayload}
              onChange={(e) => setSelectedPayload(e.target.value)}
              className="form-select"
              style={{ fontSize: '0.8rem', height: '36px' }}
            >
              <option value="">Select payloads / sensors</option>
              <option value="zenmuse_p1">Zenmuse P1 (45 MP Full-Frame RGB)</option>
              <option value="zenmuse_l1">Zenmuse L1 (High-Accuracy LiDAR & RGB)</option>
              <option value="thermal_h20t">Zenmuse H20T (Thermal Infrared & Radiometric)</option>
              <option value="multispectral">Micasense RedEdge (Multispectral 5-Band)</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── Sections 7 & 8 (Two-Column Split) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
        {/* 7. Scope Document */}
        <div className="wf-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          <div>
            <h2 className="wf-title" style={{ fontSize: '0.95rem' }}>
              7. Scope Document <span style={{ color: '#ef4444' }}>*</span>
            </h2>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
              Upload the scope of work / survey requirements.
            </p>
          </div>

          <div
            style={{
              border: '1.5px dashed var(--border-color)',
              borderRadius: '6px',
              padding: '1.25rem',
              backgroundColor: '#fafafa',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <UploadCloud size={26} color="#71717a" />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.775rem', fontWeight: 600, color: '#09090b' }}>
                  {scopeFileName ? scopeFileName : 'Drag and drop file here, or browse'}
                </span>
                <span style={{ fontSize: '0.675rem', color: 'var(--text-muted)' }}>
                  Supports PDF, DOC, DOCX, XLS, XLSX up to 50MB
                </span>
              </div>
            </div>

            <label
              className="btn btn-secondary"
              style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem', cursor: 'pointer' }}
            >
              Browse Files
              <input
                type="file"
                accept=".pdf,.doc,.docx,.xls,.xlsx"
                style={{ display: 'none' }}
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setScopeFileName(e.target.files[0].name);
                  }
                }}
              />
            </label>
          </div>
        </div>

        {/* 8. Remarks / Instructions */}
        <div className="wf-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          <div>
            <h2 className="wf-title" style={{ fontSize: '0.95rem' }}>
              8. Remarks / Instructions <span style={{ color: '#ef4444' }}>*</span>
            </h2>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
              Provide any specific instructions or additional information.
            </p>
          </div>

          <div style={{ position: 'relative' }}>
            <textarea
              rows={4}
              maxLength={1000}
              placeholder="Enter your message..."
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="form-textarea"
              style={{ fontSize: '0.8rem', resize: 'vertical', width: '100%' }}
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
              {remarks.length}/1000
            </span>
          </div>
        </div>
      </div>

      {/* ── 9. Assigned Contacts (People who will be the point of contact) ── */}
      <div className="wf-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '0.85rem 1.25rem',
            borderBottom: '1px solid var(--border-color)',
          }}
        >
          <div>
            <h2 className="wf-title" style={{ fontSize: '0.95rem' }}>
              9. Assigned Contacts (People who will be the point of contact) <span style={{ color: '#ef4444' }}>*</span>
            </h2>
            <p style={{ fontSize: '0.725rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>
              You can add up to 4 contacts.
            </p>
          </div>

          <button
            type="button"
            onClick={addContact}
            disabled={assignedContacts.length >= 4}
            className="btn btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', height: '32px' }}
          >
            <Plus size={13} /> Add Contact
          </button>
        </div>

        <table className="wf-table" style={{ margin: 0 }}>
          <thead>
            <tr>
              <th style={{ width: '4%' }}>#</th>
              <th style={{ width: '24%' }}>Name *</th>
              <th style={{ width: '22%' }}>Designation / Role</th>
              <th style={{ width: '24%' }}>Email *</th>
              <th style={{ width: '22%' }}>Phone Number *</th>
              <th style={{ width: '4%', textAlign: 'center' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {assignedContacts.map((contact, idx) => (
              <tr key={contact.id}>
                <td style={{ fontWeight: 700 }}>{idx + 1}</td>
                <td>
                  <input
                    type="text"
                    required
                    placeholder="Enter full name"
                    value={contact.name}
                    onChange={(e) => updateContact(idx, 'name', e.target.value)}
                    className="form-input"
                    style={{ fontSize: '0.75rem', height: '30px' }}
                  />
                </td>
                <td>
                  <input
                    type="text"
                    placeholder="Enter role / designation"
                    value={contact.role}
                    onChange={(e) => updateContact(idx, 'role', e.target.value)}
                    className="form-input"
                    style={{ fontSize: '0.75rem', height: '30px' }}
                  />
                </td>
                <td>
                  <input
                    type="email"
                    required
                    placeholder="Enter email address"
                    value={contact.email}
                    onChange={(e) => updateContact(idx, 'email', e.target.value)}
                    className="form-input"
                    style={{ fontSize: '0.75rem', height: '30px' }}
                  />
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '0.3rem' }}>
                    <select
                      value={contact.phoneCode}
                      onChange={(e) => updateContact(idx, 'phoneCode', e.target.value)}
                      className="form-select"
                      style={{ width: '70px', fontSize: '0.75rem', height: '30px', padding: '0.1rem 0.3rem' }}
                    >
                      <option value="+91">+91</option>
                      <option value="+1">+1</option>
                      <option value="+44">+44</option>
                      <option value="+971">+971</option>
                    </select>
                    <input
                      type="text"
                      required
                      placeholder="Enter phone number"
                      value={contact.phone}
                      onChange={(e) => updateContact(idx, 'phone', e.target.value)}
                      className="form-input"
                      style={{ flex: 1, fontSize: '0.75rem', height: '30px' }}
                    />
                  </div>
                </td>
                <td style={{ textAlign: 'center' }}>
                  <button
                    type="button"
                    onClick={() => removeContact(idx)}
                    title="Remove Contact"
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#ef4444',
                      padding: '0.2rem',
                    }}
                  >
                    <Trash2 size={15} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Bottom Help Footnote ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.725rem', color: 'var(--text-muted)' }}>
        <Info size={13} />
        <span>Please review all details before submitting. You can save as draft and submit later.</span>
      </div>
    </form>
  );
}
