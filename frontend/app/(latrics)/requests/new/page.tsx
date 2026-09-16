'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
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
  Paperclip,
  X,
  Loader2,
} from 'lucide-react';

import { useAuth } from '@/lib/auth';
import { projectApi } from '@/modules/projects/api';
import { ProjectStatus } from '@/modules/projects/types';

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

function NewProjectRequestPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawDraftId = searchParams?.get('draftId') || '';
  const rawProjectId = searchParams?.get('projectId') || searchParams?.get('edit') || rawDraftId;
  const [currentDraftId, setCurrentDraftId] = useState<string>(rawDraftId || rawProjectId);
  const [isDraftMode, setIsDraftMode] = useState<boolean>(Boolean(rawDraftId));
  const isRevision = Boolean(rawProjectId) && !isDraftMode;
  const { user } = useAuth();

  // Form State
  const [projectName, setProjectName] = useState('');
  const [locationAddress, setLocationAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [primaryContact, setPrimaryContact] = useState({
    name: user?.full_name || '',
    email: user?.email || '',
    phone: user?.phone_number || '',
    company: user?.company_name || '',
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

  // 4. KML / Boundary Files State (Multiple Files Support)
  const [kmlFiles, setKmlFiles] = useState<Array<{ name: string; size: string }>>([]);
  const [isDraggingKml, setIsDraggingKml] = useState(false);

  // 7. Scope Document Files State (Multiple Files Support)
  const [scopeFiles, setScopeFiles] = useState<Array<{ name: string; size: string }>>([]);
  const [isDraggingScope, setIsDraggingScope] = useState(false);

  const formatFileSize = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleAddKmlFiles = (fileList: FileList | File[]) => {
    const incoming = Array.from(fileList).map((f) => ({
      name: f.name,
      size: formatFileSize(f.size),
    }));
    setKmlFiles((prev) => {
      const existingNames = new Set(prev.map((f) => f.name));
      const filtered = incoming.filter((f) => !existingNames.has(f.name));
      return [...prev, ...filtered];
    });
  };

  const handleRemoveKmlFile = (index: number) => {
    setKmlFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddScopeFiles = (fileList: FileList | File[]) => {
    const incoming = Array.from(fileList).map((f) => ({
      name: f.name,
      size: formatFileSize(f.size),
    }));
    setScopeFiles((prev) => {
      const existingNames = new Set(prev.map((f) => f.name));
      const filtered = incoming.filter((f) => !existingNames.has(f.name));
      return [...prev, ...filtered];
    });
  };

  const handleRemoveScopeFile = (index: number) => {
    setScopeFiles((prev) => prev.filter((_, i) => i !== index));
  };

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
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [draftToast, setDraftToast] = useState(false);
  const [draftSavedMessage, setDraftSavedMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Complete draft & revision hydration logic
  useEffect(() => {
    let isMounted = true;

    const hydrateFromPayload = (projTitle: string, reqPayload: Record<string, any>, draftProjId?: string) => {
      if (draftProjId) {
        setIsDraftMode(true);
        setCurrentDraftId(draftProjId);
      }
      if (projTitle) setProjectName(projTitle);

      if (reqPayload.address) setLocationAddress(reqPayload.address);
      else if (reqPayload.location_address) setLocationAddress(reqPayload.location_address);
      else if (reqPayload.survey_location) setLocationAddress(reqPayload.survey_location);

      if (reqPayload.city) setCity(reqPayload.city);
      if (reqPayload.state) setState(reqPayload.state);

      if (reqPayload.primary_contact) {
        setPrimaryContact({
          name: reqPayload.primary_contact.name || '',
          email: reqPayload.primary_contact.email || '',
          phone: reqPayload.primary_contact.phone || '',
          company: reqPayload.primary_contact.company || '',
        });
      }
      if (reqPayload.alternate_contact) {
        setAlternateContact({
          email: reqPayload.alternate_contact.email || '',
          phoneCode: reqPayload.alternate_contact.phoneCode || '+91',
          phone: reqPayload.alternate_contact.phone || '',
        });
      }
      if (Array.isArray(reqPayload.assigned_contacts) && reqPayload.assigned_contacts.length > 0) {
        setAssignedContacts(reqPayload.assigned_contacts);
      }
      if (reqPayload.payload_sensor) {
        setSelectedPayload(reqPayload.payload_sensor);
      } else if (reqPayload.survey_type) {
        setSelectedPayload(reqPayload.survey_type);
      }
      if (reqPayload.start_date) setStartDate(reqPayload.start_date);
      if (reqPayload.end_date) setEndDate(reqPayload.end_date);
      if (reqPayload.tenure_days) setTenureDays(reqPayload.tenure_days);
      if (reqPayload.remarks) setRemarks(reqPayload.remarks);

      if (Array.isArray(reqPayload.deliverables)) {
        const map: Record<string, boolean> = {
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
        };
        reqPayload.deliverables.forEach((item: string) => {
          if (typeof item === 'string') {
            if (item in map) map[item] = true;
            else if (item.startsWith('Other:')) {
              map.other = true;
              setOtherDeliverableText(item.replace(/^Other:\s*/, ''));
            }
          }
        });
        setDeliverables((prev) => ({ ...prev, ...map }));
      }

      // Hydrate all uploaded boundary & scope files
      const loadedKml: Array<{ name: string; size: string }> = [];
      const loadedScope: Array<{ name: string; size: string }> = [];
      const seenKml = new Set<string>();
      const seenScope = new Set<string>();

      if (Array.isArray(reqPayload.kml_files)) {
        reqPayload.kml_files.forEach((f: any) => {
          const name = typeof f === 'string' ? f : f?.name;
          if (name && !seenKml.has(name)) {
            seenKml.add(name);
            loadedKml.push({ name, size: typeof f === 'object' && f?.size ? f.size : 'Existing File' });
          }
        });
      }

      if (Array.isArray(reqPayload.scope_files)) {
        reqPayload.scope_files.forEach((f: any) => {
          const name = typeof f === 'string' ? f : f?.name;
          if (name && !seenScope.has(name)) {
            seenScope.add(name);
            loadedScope.push({ name, size: typeof f === 'object' && f?.size ? f.size : 'Existing Document' });
          }
        });
      }

      if (Array.isArray(reqPayload.attachments)) {
        reqPayload.attachments.forEach((att: any) => {
          const name = typeof att === 'string' ? att : att?.name;
          if (!name) return;
          const cat = (att?.category || '').toLowerCase();
          const type = (att?.type || '').toLowerCase();
          const isKml = cat.includes('boundary') || cat.includes('kml') || type.includes('kml') || type.includes('kmz') || name.endsWith('.kml') || name.endsWith('.kmz');
          const isScope = cat.includes('scope') || type.includes('scope') || cat.includes('document') || name.endsWith('.pdf') || name.endsWith('.docx') || name.endsWith('.xlsx');

          if (isKml && !seenKml.has(name)) {
            seenKml.add(name);
            loadedKml.push({ name, size: att?.size || 'Attached File' });
          } else if (isScope && !seenScope.has(name)) {
            seenScope.add(name);
            loadedScope.push({ name, size: att?.size || 'Attached Document' });
          }
        });
      }

      if (reqPayload.kml_filename && typeof reqPayload.kml_filename === 'string') {
        const names = reqPayload.kml_filename.split(',').map((s: string) => s.trim()).filter(Boolean);
        names.forEach((n: string) => {
          if (!seenKml.has(n)) {
            seenKml.add(n);
            loadedKml.push({ name: n, size: 'Attached File' });
          }
        });
      }

      if (reqPayload.scope_filename && typeof reqPayload.scope_filename === 'string') {
        const names = reqPayload.scope_filename.split(',').map((s: string) => s.trim()).filter(Boolean);
        names.forEach((n: string) => {
          if (!seenScope.has(n)) {
            seenScope.add(n);
            loadedScope.push({ name: n, size: 'Attached Document' });
          }
        });
      }

      if (loadedKml.length > 0) setKmlFiles(loadedKml);
      if (loadedScope.length > 0) setScopeFiles(loadedScope);
    };

    (async () => {
      let targetId = currentDraftId || rawProjectId;

      // 1. If targetId not in URL, check localStorage for saved draft
      if (!targetId && typeof window !== 'undefined') {
        try {
          const cachedStr = localStorage.getItem('latrics_ops_request_draft');
          if (cachedStr) {
            const cachedData = JSON.parse(cachedStr);
            if (cachedData) {
              if (cachedData.draftId) {
                targetId = cachedData.draftId;
              }
              // Immediately hydrate from localStorage
              hydrateFromPayload(cachedData.projectName || '', cachedData, cachedData.draftId);
            }
          }
        } catch (e) {
          console.error('Error reading localStorage ops draft', e);
        }
      }

      // 2. If still no targetId, query database for user's latest saved draft project
      if (!targetId) {
        try {
          const allProjects = await projectApi.listProjects().catch(() => []);
          const draftProject = allProjects.find((p: any) => p.status === 'draft');
          if (draftProject) {
            targetId = draftProject.id;
          }
        } catch (e) {
          console.error('Error searching database for draft project', e);
        }
      }

      // 3. If targetId resolved, load fresh project from database
      if (targetId) {
        try {
          const proj = await projectApi.getProject(targetId);
          if (!isMounted || !proj) return;
          const reqPayload = (proj.requirements_payload || {}) as Record<string, any>;
          hydrateFromPayload(proj.title || '', reqPayload, proj.status === 'draft' ? proj.id : undefined);
          if (proj.status === 'draft') {
            setIsDraftMode(true);
            setCurrentDraftId(proj.id);
            if (typeof window !== 'undefined' && !rawProjectId && !rawDraftId) {
              window.history.replaceState(null, '', `?draftId=${proj.id}`);
            }
          }
        } catch (err) {
          console.error('Failed to load project from database:', err);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [rawProjectId, rawDraftId, currentDraftId]);

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

  const handleDiscardDraft = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('latrics_ops_request_draft');
    }
    setCurrentDraftId('');
    setIsDraftMode(false);
    setProjectName('');
    setLocationAddress('');
    setCity('');
    setState('');
    setStartDate('');
    setEndDate('');
    setTenureDays(0);
    setSelectedPayload('');
    setRemarks('');
    setKmlFiles([]);
    setScopeFiles([]);
    setOtherDeliverableText('');
    setDeliverables({
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
    setPrimaryContact({
      name: user?.full_name || '',
      email: user?.email || '',
      phone: user?.phone_number || '',
      company: user?.company_name || '',
    });
    setAlternateContact({
      email: '',
      phoneCode: '+91',
      phone: '',
    });
    setAssignedContacts([
      { id: 1, name: '', role: '', email: '', phoneCode: '+91', phone: '' },
      { id: 2, name: '', role: '', email: '', phoneCode: '+91', phone: '' },
      { id: 3, name: '', role: '', email: '', phoneCode: '+91', phone: '' },
      { id: 4, name: '', role: '', email: '', phoneCode: '+91', phone: '' },
    ]);
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', window.location.pathname);
    }
    setDraftSavedMessage(null);
  };

  const handleSaveDraft = async () => {
    try {
      setIsSavingDraft(true);
      setErrorMessage(null);

      const trimmedAddress = locationAddress.trim();
      const trimmedCity = city.trim();
      const trimmedState = state.trim();
      const finalLocation = trimmedAddress || (trimmedCity && trimmedState ? `${trimmedCity}, ${trimmedState}` : 'Survey Location');
      const draftTitle = projectName.trim() || `Draft Request - ${new Date().toLocaleDateString('en-GB')}`;

      const deliverablesList = Object.keys(deliverables).filter((k) => deliverables[k]);
      if (deliverables.other && otherDeliverableText.trim()) {
        deliverablesList.push(`Other: ${otherDeliverableText.trim()}`);
      }

      const payloadPayload = {
        address: trimmedAddress,
        location_address: trimmedAddress,
        city: trimmedCity,
        state: trimmedState,
        survey_location: trimmedAddress,
        deliverables: deliverablesList,
        other_deliverable: otherDeliverableText,
        primary_contact: primaryContact,
        alternate_contact: alternateContact,
        start_date: startDate,
        end_date: endDate,
        tenure_days: tenureDays,
        payload_sensor: selectedPayload,
        assigned_contacts: assignedContacts.filter((c) => c.name.trim() !== ''),
        kml_filename: kmlFiles.map((f) => f.name).join(', ') || null,
        scope_filename: scopeFiles.map((f) => f.name).join(', ') || null,
        kml_files: kmlFiles,
        scope_files: scopeFiles,
        attachments: [
          ...kmlFiles.map((f) => ({
            name: f.name,
            size: f.size || '—',
            type: f.name.endsWith('.kmz') ? 'KMZ' : 'KML',
            category: 'Boundary',
            date: new Date().toISOString().split('T')[0],
          })),
          ...scopeFiles.map((f) => ({
            name: f.name,
            size: f.size || '—',
            type: f.name.endsWith('.pdf') ? 'PDF' : 'Document',
            category: 'Scope Document',
            date: new Date().toISOString().split('T')[0],
          })),
        ],
        remarks: remarks,
        is_draft: true,
      };

      let targetId = currentDraftId || rawProjectId;
      if (targetId) {
        await projectApi.updateProject(targetId, {
          title: draftTitle,
          description: remarks || `Draft request: ${draftTitle}`,
          status: ProjectStatus.DRAFT,
          requirements_payload: payloadPayload,
          survey_location: finalLocation,
          survey_type: selectedPayload || 'topography',
        });
      } else {
        const created = await projectApi.createProject({
          title: draftTitle,
          description: remarks || `Draft request: ${draftTitle}`,
          survey_location: finalLocation,
          survey_type: selectedPayload || 'topography',
          target_area_sqkm: 50.0,
          status: ProjectStatus.DRAFT,
          is_draft: true,
          requirements_payload: payloadPayload,
        });
        if (created?.id) {
          targetId = created.id;
          setCurrentDraftId(created.id);
          setIsDraftMode(true);
          if (typeof window !== 'undefined') {
            window.history.replaceState(null, '', `?draftId=${created.id}`);
          }
        }
      }

      // Persist to local storage for instant return hydration
      if (typeof window !== 'undefined') {
        localStorage.setItem(
          'latrics_ops_request_draft',
          JSON.stringify({
            ...payloadPayload,
            projectName: draftTitle,
            draftId: targetId,
            savedAt: new Date().toISOString(),
          })
        );
      }

      setDraftSavedMessage('Draft saved successfully to workspace!');
      setDraftToast(true);
      setTimeout(() => {
        setDraftToast(false);
        setDraftSavedMessage(null);
      }, 4000);
    } catch (err: any) {
      console.error('Failed to save draft:', err);
      setErrorMessage(err.message || 'Failed to save draft.');
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!projectName.trim()) {
      setErrorMessage('Project Name is required.');
      return;
    }

    if (!locationAddress.trim()) {
      setErrorMessage('Project Location / Site Address is required.');
      return;
    }

    if (!city.trim()) {
      setErrorMessage('City is required.');
      return;
    }

    if (!state.trim()) {
      setErrorMessage('State is required.');
      return;
    }

    const hasDeliverable = Object.values(deliverables).some(Boolean);
    if (!hasDeliverable) {
      setErrorMessage('Please select at least one deliverable.');
      return;
    }

    try {
      setIsSubmitting(true);
      const trimmedAddress = locationAddress.trim();
      const trimmedCity = city.trim();
      const trimmedState = state.trim();
      const finalLocation = trimmedAddress || (trimmedCity && trimmedState ? `${trimmedCity}, ${trimmedState}` : 'Survey Location');

      const deliverablesList = Object.keys(deliverables).filter((k) => deliverables[k]);
      if (deliverables.other && otherDeliverableText.trim()) {
        deliverablesList.push(`Other: ${otherDeliverableText.trim()}`);
      }

      const payloadPayload = {
        address: trimmedAddress,
        location_address: trimmedAddress,
        city: trimmedCity,
        state: trimmedState,
        survey_location: trimmedAddress,
        deliverables: deliverablesList,
        other_deliverable: otherDeliverableText,
        primary_contact: primaryContact,
        alternate_contact: alternateContact,
        start_date: startDate,
        end_date: endDate,
        tenure_days: tenureDays,
        payload_sensor: selectedPayload,
        assigned_contacts: assignedContacts.filter((c) => c.name.trim() !== ''),
        kml_filename: kmlFiles.map((f) => f.name).join(', ') || null,
        scope_filename: scopeFiles.map((f) => f.name).join(', ') || null,
        kml_files: kmlFiles,
        scope_files: scopeFiles,
        attachments: [
          ...kmlFiles.map((f) => ({
            name: f.name,
            size: f.size || '—',
            type: f.name.endsWith('.kmz') ? 'KMZ' : 'KML',
            category: 'Boundary',
            date: new Date().toISOString().split('T')[0],
          })),
          ...scopeFiles.map((f) => ({
            name: f.name,
            size: f.size || '—',
            type: f.name.endsWith('.pdf') ? 'PDF' : 'Document',
            category: 'Scope Document',
            date: new Date().toISOString().split('T')[0],
          })),
        ],
        remarks: remarks,
      };

      let targetId = currentDraftId || rawProjectId;
      if (isDraftMode && targetId) {
        await projectApi.updateProject(targetId, {
          title: projectName.trim(),
          description: remarks || `Survey request for ${projectName.trim()}`,
          status: ProjectStatus.SUBMITTED,
          survey_location: finalLocation,
          survey_type: selectedPayload || 'topography',
          requirements_payload: payloadPayload,
        });
      } else {
        await projectApi.createProject({
          title: projectName.trim(),
          description: remarks || `Survey request for ${projectName.trim()}`,
          survey_location: finalLocation,
          survey_type: selectedPayload || 'topography',
          target_area_sqkm: 50.0,
          requirements_payload: payloadPayload,
        });
      }

      if (typeof window !== 'undefined') {
        localStorage.removeItem('latrics_ops_request_draft');
      }

      setSuccessMessage(true);
      setTimeout(() => {
        router.push('/requests');
      }, 1500);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to submit request to database.');
    } finally {
      setIsSubmitting(false);
    }
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
          <span style={{ color: 'var(--text-secondary)' }}>
            {isRevision ? 'Revise Request' : isDraftMode ? 'Edit Draft' : 'New Request'}
          </span>
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
            {isRevision ? 'Revise Project Request' : isDraftMode ? 'Edit Draft Request' : 'New Project Request'}
          </h1>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
            {isRevision
              ? 'Update survey specifications or requirements. Submitting will create an updated revision.'
              : isDraftMode
              ? 'Resume and update your saved draft request. You can save updates as draft or submit when ready.'
              : 'Submit a new survey / mapping request. All fields marked with * are required.'}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={isSavingDraft || isSubmitting}
            className="btn btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', height: '36px', fontSize: '0.8rem' }}
          >
            {isSavingDraft ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
            <span>{isSavingDraft ? 'Saving Draft...' : 'Save Draft'}</span>
          </button>
          <button
            type="submit"
            disabled={isSubmitting || isSavingDraft}
            className="btn btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', height: '36px', fontSize: '0.8rem' }}
          >
            {isSubmitting ? 'Submitting...' : isRevision ? 'Submit Revision' : 'Submit Request'}
          </button>
        </div>
      </div>

      {/* ── Active Draft Restored Banner ── */}
      {isDraftMode && !isRevision && (
        <div
          style={{
            padding: '0.75rem 1rem',
            backgroundColor: '#f8fafc',
            border: '1px solid #cbd5e1',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.8rem',
            color: '#334155',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileText size={15} color="#0284c7" />
            <span>
              <strong>Draft Restored:</strong> Showing your previously saved draft details. All fields and documents have been restored.
            </span>
          </div>
          <button
            type="button"
            onClick={handleDiscardDraft}
            style={{
              background: 'none',
              border: 'none',
              color: '#dc2626',
              fontWeight: 600,
              fontSize: '0.75rem',
              cursor: 'pointer',
              textDecoration: 'underline',
            }}
          >
            Discard Draft & Start Fresh
          </button>
        </div>
      )}

      {draftToast && draftSavedMessage && (
        <div
          style={{
            padding: '0.85rem 1.25rem',
            backgroundColor: '#f0fdf4',
            border: '1px solid #16a34a',
            borderRadius: '6px',
            color: '#15803d',
            fontWeight: 700,
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <Check size={16} /> {draftSavedMessage}
        </div>
      )}

      {errorMessage && (
        <div
          style={{
            padding: '0.85rem 1.25rem',
            backgroundColor: '#fef2f2',
            border: '1px solid #dc2626',
            borderRadius: '6px',
            color: '#dc2626',
            fontWeight: 600,
            fontSize: '0.85rem',
          }}
        >
          {errorMessage}
        </div>
      )}

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
      <div className="wf-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
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

        {/* Project Location (Address) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          <label style={{ fontSize: '0.775rem', fontWeight: 600, color: '#09090b' }}>
            Project Location <span style={{ color: '#ef4444' }}>*</span>
            <span style={{ fontSize: '0.725rem', fontWeight: 400, color: '#71717a', marginLeft: '0.45rem' }}>
              (Enter the physical site address — do not use company or project name)
            </span>
          </label>
          <input
            type="text"
            required
            placeholder="Enter physical site address (e.g. Plot 42, Sector 18, Phase 1 Industrial Area)"
            value={locationAddress}
            onChange={(e) => setLocationAddress(e.target.value)}
            className="form-input"
            style={{ fontSize: '0.8rem', height: '36px' }}
          />
        </div>

        {/* City & State Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <label style={{ fontSize: '0.775rem', fontWeight: 600, color: '#09090b' }}>
              City <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Enter city (e.g. Bengaluru, Mumbai, Ahmedabad)"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="form-input"
              style={{ fontSize: '0.8rem', height: '36px' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <label style={{ fontSize: '0.775rem', fontWeight: 600, color: '#09090b' }}>
              State <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <select
              required
              value={state}
              onChange={(e) => setState(e.target.value)}
              className="form-select"
              style={{ fontSize: '0.8rem', height: '36px', backgroundColor: '#ffffff' }}
            >
              <option value="">Select state</option>
              {INDIAN_STATES.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>
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

      {/* ── 4. KML / Boundary Upload (Multiple Files) ── */}
      <div className="wf-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <h2 className="wf-title" style={{ fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>4. KML / Boundary Upload</span>
              <span style={{ color: '#ef4444' }}>*</span>
              {kmlFiles.length > 0 && (
                <span
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    backgroundColor: '#f4f4f5',
                    color: '#09090b',
                    padding: '0.1rem 0.45rem',
                    borderRadius: '12px',
                    border: '1px solid #d4d4d8',
                  }}
                >
                  {kmlFiles.length} {kmlFiles.length === 1 ? 'file' : 'files'}
                </span>
              )}
            </h2>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
              Upload multiple KML, KMZ, or GeoJSON boundary files of the area of interest.
            </p>
          </div>

          {kmlFiles.length > 0 && (
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              <button
                type="button"
                onClick={() => setKmlFiles([])}
                className="btn btn-secondary"
                style={{ fontSize: '0.7rem', padding: '0.25rem 0.55rem', height: '28px', color: '#dc2626' }}
              >
                Clear All
              </button>
              <label
                className="btn btn-secondary"
                style={{ fontSize: '0.7rem', padding: '0.25rem 0.65rem', height: '28px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer' }}
              >
                <Plus size={13} />
                <span>Add More</span>
                <input
                  type="file"
                  multiple
                  accept=".kml,.kmz"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      handleAddKmlFiles(e.target.files);
                      e.target.value = '';
                    }
                  }}
                />
              </label>
            </div>
          )}
        </div>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDraggingKml(true);
          }}
          onDragLeave={() => setIsDraggingKml(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDraggingKml(false);
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
              handleAddKmlFiles(e.dataTransfer.files);
            }
          }}
          style={{
            border: isDraggingKml ? '2px dashed #09090b' : '1.5px dashed var(--border-color)',
            borderRadius: '6px',
            padding: kmlFiles.length > 0 ? '1rem 1.25rem' : '1.5rem',
            backgroundColor: isDraggingKml ? '#f4f4f5' : '#fafafa',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            transition: 'all 0.15s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <UploadCloud size={28} color="#71717a" />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#09090b' }}>
                {kmlFiles.length > 0
                  ? `${kmlFiles.length} boundary file(s) selected`
                  : 'Drag and drop your file(s) here, or browse'}
              </span>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                Supports multiple KML, KMZ files up to 50MB each
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
              multiple
              accept=".kml,.kmz"
              style={{ display: 'none' }}
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  handleAddKmlFiles(e.target.files);
                  e.target.value = '';
                }
              }}
            />
          </label>
        </div>

        {/* Selected KML Files List */}
        {kmlFiles.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', marginTop: '0.2rem' }}>
            {kmlFiles.map((file, idx) => (
              <div
                key={`kml-${idx}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.5rem 0.75rem',
                  backgroundColor: '#f4f4f5',
                  border: '1px solid #e4e4e7',
                  borderRadius: '5px',
                  fontSize: '0.775rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', minWidth: 0 }}>
                  <Paperclip size={14} color="#52525b" style={{ flexShrink: 0 }} />
                  <span style={{ fontWeight: 600, color: '#09090b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {file.name}
                  </span>
                  <span style={{ fontSize: '0.7rem', color: '#71717a' }}>
                    {file.size} • Ready to upload
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveKmlFile(idx)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: '#71717a' }}
                  title="Remove file"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
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
        {/* 7. Scope Document (Multiple Files) */}
        <div className="wf-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <h2 className="wf-title" style={{ fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>7. Scope Document</span>
                <span style={{ color: '#ef4444' }}>*</span>
                {scopeFiles.length > 0 && (
                  <span
                    style={{
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      backgroundColor: '#f4f4f5',
                      color: '#09090b',
                      padding: '0.1rem 0.45rem',
                      borderRadius: '12px',
                      border: '1px solid #d4d4d8',
                    }}
                  >
                    {scopeFiles.length} {scopeFiles.length === 1 ? 'doc' : 'docs'}
                  </span>
                )}
              </h2>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                Upload scope of work, survey specifications, or reference documents.
              </p>
            </div>

            {scopeFiles.length > 0 && (
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <button
                  type="button"
                  onClick={() => setScopeFiles([])}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.7rem', padding: '0.25rem 0.55rem', height: '28px', color: '#dc2626' }}
                >
                  Clear All
                </button>
                <label
                  className="btn btn-secondary"
                  style={{ fontSize: '0.7rem', padding: '0.25rem 0.65rem', height: '28px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer' }}
                >
                  <Plus size={13} />
                  <span>Add More</span>
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx,.xls,.xlsx"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        handleAddScopeFiles(e.target.files);
                        e.target.value = '';
                      }
                    }}
                  />
                </label>
              </div>
            )}
          </div>

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDraggingScope(true);
            }}
            onDragLeave={() => setIsDraggingScope(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDraggingScope(false);
              if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                handleAddScopeFiles(e.dataTransfer.files);
              }
            }}
            style={{
              border: isDraggingScope ? '2px dashed #09090b' : '1.5px dashed var(--border-color)',
              borderRadius: '6px',
              padding: scopeFiles.length > 0 ? '1rem 1.25rem' : '1.25rem',
              backgroundColor: isDraggingScope ? '#f4f4f5' : '#fafafa',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
              transition: 'all 0.15s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <UploadCloud size={26} color="#71717a" />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.775rem', fontWeight: 600, color: '#09090b' }}>
                  {scopeFiles.length > 0
                    ? `${scopeFiles.length} document(s) selected`
                    : 'Drag and drop file(s) here, or browse'}
                </span>
                <span style={{ fontSize: '0.675rem', color: 'var(--text-muted)' }}>
                  Supports multiple PDF, DOC, DOCX, XLS, XLSX up to 50MB each
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
                multiple
                accept=".pdf,.doc,.docx,.xls,.xlsx"
                style={{ display: 'none' }}
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    handleAddScopeFiles(e.target.files);
                    e.target.value = '';
                  }
                }}
              />
            </label>
          </div>

          {/* Selected Scope Documents List */}
          {scopeFiles.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', marginTop: '0.2rem' }}>
              {scopeFiles.map((file, idx) => (
                <div
                  key={`scope-${idx}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.5rem 0.75rem',
                    backgroundColor: '#f4f4f5',
                    border: '1px solid #e4e4e7',
                    borderRadius: '5px',
                    fontSize: '0.775rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', minWidth: 0 }}>
                    <FileText size={14} color="#52525b" style={{ flexShrink: 0 }} />
                    <span style={{ fontWeight: 600, color: '#09090b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {file.name}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: '#71717a' }}>
                      {file.size} • Ready to upload
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveScopeFile(idx)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: '#71717a' }}
                    title="Remove document"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
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

export default function NewProjectRequestPage() {
  return (
    <Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center', color: '#71717a' }}>Loading request form...</div>}>
      <NewProjectRequestPageContent />
    </Suspense>
  );
}
