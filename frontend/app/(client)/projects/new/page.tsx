'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ChevronLeft,
  UploadCloud,
  Info,
  Check,
  FileText,
  Send,
  X,
  FileCheck,
  Camera,
  Layers,
  Aperture,
  ChevronDown,
  AlertCircle,
  Users,
  Trash2,
  Plus,
  Paperclip,
  Loader2,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { projectApi } from '@/modules/projects/api';
import { ProjectStatus } from '@/modules/projects/types';
import { requestApi } from '@/modules/requests/api';
import { usersApi } from '@/modules/users/api';
import { UserProfile } from '@/modules/users/types';

// Payload options
export type PayloadType = '61mp_camera' | 'lidar' | 'oblique_camera';

// Processing mode
export type ProcessingMode = 'pre_processing' | 'post_processing';

// Deliverable option definition
interface DeliverableOption {
  id: string;
  label: string;
  description?: string;
}

const PRE_PROCESSING_DELIVERABLES: DeliverableOption[] = [
  { id: 'geo_tagged_image', label: 'Geo Tagged Image' },
  { id: 'event_files', label: 'Event Files' },
  { id: 'point_cloud', label: 'Point Cloud' },
  { id: 'trajectory_files', label: 'Trajectory Files' },
];

const POST_PROCESSING_DELIVERABLES: DeliverableOption[] = [
  { id: 'orthomosaic', label: 'Orthomosaic' },
  { id: 'topographic_map', label: 'Topographic Map' },
  { id: 'dem', label: 'DEM' },
  { id: 'dsm', label: 'DSM' },
  { id: 'point_cloud', label: 'Point Cloud' },
  { id: '3d_model', label: '3D Model' },
  { id: 'cad', label: 'CAD' },
  { id: 'volumetric_analysis', label: 'Volumetric Analysis' },
  { id: 'contour', label: 'Contour' },
];

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

export default function ClientNewProjectRequestPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawDraftId = searchParams?.get('draftId') || '';
  const rawProjectId = searchParams?.get('projectId') || searchParams?.get('edit') || rawDraftId;
  const [currentDraftId, setCurrentDraftId] = useState<string>(rawDraftId || rawProjectId);
  const [isDraftMode, setIsDraftMode] = useState<boolean>(Boolean(rawDraftId));
  const isRevision = Boolean(rawProjectId) && !isDraftMode;
  const projectId = rawProjectId;
  const { user } = useAuth();

  // 1. Project Details State
  const [projectName, setProjectName] = useState('');
  const [locationAddress, setLocationAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');

  // 2. Contact Information State - Default filled from user profile
  const [companyName, setCompanyName] = useState(user?.company_name || '');
  const [ownerName, setOwnerName] = useState(user?.full_name || '');
  const [primaryEmail, setPrimaryEmail] = useState(user?.email || '');
  const [phoneCode, setPhoneCode] = useState('+91');
  const [phoneNumber, setPhoneNumber] = useState(user?.phone_number || '');

  useEffect(() => {
    if (user && !isRevision && !isDraftMode) {
      setCompanyName(user.company_name || '');
      setOwnerName(user.full_name || '');
      setPrimaryEmail(user.email || '');
      setPhoneNumber(user.phone_number || '');
    }
  }, [user, isRevision, isDraftMode]);

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

      if (reqPayload.company_name) setCompanyName(reqPayload.company_name);
      if (reqPayload.primary_contact?.name) setOwnerName(reqPayload.primary_contact.name);
      if (reqPayload.primary_contact?.email) setPrimaryEmail(reqPayload.primary_contact.email);
      if (reqPayload.primary_contact?.phone) {
        const parts = reqPayload.primary_contact.phone.split(' ');
        if (parts.length > 1) {
          setPhoneCode(parts[0]);
          setPhoneNumber(parts.slice(1).join(' '));
        } else {
          setPhoneNumber(reqPayload.primary_contact.phone);
        }
      }

      if (Array.isArray(reqPayload.communication_contacts)) {
        setSelectedContacts(
          reqPayload.communication_contacts.map((c: any) =>
            typeof c === 'string' ? c : c.name || String(c)
          )
        );
      }

      if (reqPayload.payload_sensor) {
        setSelectedPayload(reqPayload.payload_sensor);
      }

      // Hydrate processing modes
      if (Array.isArray(reqPayload.processing_modes)) {
        setOptPreProcessing(reqPayload.processing_modes.includes('pre_processing'));
        setOptPostProcessing(reqPayload.processing_modes.includes('post_processing'));
      } else if (reqPayload.processing_mode === 'pre_processing') {
        setOptPreProcessing(true);
        setOptPostProcessing(false);
      } else if (reqPayload.processing_mode === 'post_processing') {
        setOptPreProcessing(false);
        setOptPostProcessing(true);
      } else if (reqPayload.processing_mode === 'both') {
        setOptPreProcessing(true);
        setOptPostProcessing(true);
      }

      if (reqPayload.start_date) setStartDate(reqPayload.start_date);
      if (reqPayload.end_date) setEndDate(reqPayload.end_date);
      if (reqPayload.tenure_days) setTenureDays(reqPayload.tenure_days);
      if (reqPayload.remarks) setRemarks(reqPayload.remarks);

      // Hydrate deliverables
      if (reqPayload.pre_deliverables && typeof reqPayload.pre_deliverables === 'object' && Object.keys(reqPayload.pre_deliverables).length > 0) {
        setPreDeliverables((prev) => ({ ...prev, ...reqPayload.pre_deliverables }));
      }
      if (reqPayload.post_deliverables && typeof reqPayload.post_deliverables === 'object' && Object.keys(reqPayload.post_deliverables).length > 0) {
        setPostDeliverables((prev) => ({ ...prev, ...reqPayload.post_deliverables }));
      }
      if (reqPayload.pre_other_text) setPreOtherText(reqPayload.pre_other_text);
      if (reqPayload.post_other_text) setPostOtherText(reqPayload.post_other_text);

      if (Array.isArray(reqPayload.deliverables)) {
        const preMap: Record<string, boolean> = {};
        const postMap: Record<string, boolean> = {};

        reqPayload.deliverables.forEach((item: string) => {
          if (typeof item !== 'string') return;
          if (item.startsWith('Pre Other:')) {
            preMap.other = true;
            setPreOtherText(item.replace(/^Pre Other:\s*/, ''));
          } else if (item.startsWith('Other:')) {
            postMap.other = true;
            setPostOtherText(item.replace(/^Other:\s*/, ''));
          } else {
            preMap[item] = true;
            postMap[item] = true;
          }
        });
        setPreDeliverables((prev) => ({ ...prev, ...preMap }));
        setPostDeliverables((prev) => ({ ...prev, ...postMap }));
      }

      // Hydrate all uploaded boundary & scope files
      const kmlList: Array<{ name: string; size?: string }> = [];
      const scopeList: Array<{ name: string; size?: string }> = [];
      const seenKml = new Set<string>();
      const seenScope = new Set<string>();

      if (Array.isArray(reqPayload.kml_files)) {
        reqPayload.kml_files.forEach((f: any) => {
          const name = typeof f === 'string' ? f : f?.name;
          if (name && !seenKml.has(name)) {
            seenKml.add(name);
            kmlList.push({ name, size: typeof f === 'object' && f?.size ? f.size : 'Existing File' });
          }
        });
      }

      if (Array.isArray(reqPayload.scope_files)) {
        reqPayload.scope_files.forEach((f: any) => {
          const name = typeof f === 'string' ? f : f?.name;
          if (name && !seenScope.has(name)) {
            seenScope.add(name);
            scopeList.push({ name, size: typeof f === 'object' && f?.size ? f.size : 'Existing Document' });
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
            kmlList.push({ name, size: att?.size || 'Attached File' });
          } else if (isScope && !seenScope.has(name)) {
            seenScope.add(name);
            scopeList.push({ name, size: att?.size || 'Attached Document' });
          }
        });
      }

      if (reqPayload.kml_filename && typeof reqPayload.kml_filename === 'string') {
        const names = reqPayload.kml_filename.split(',').map((s: string) => s.trim()).filter(Boolean);
        names.forEach((n: string) => {
          if (!seenKml.has(n)) {
            seenKml.add(n);
            kmlList.push({ name: n, size: 'Attached File' });
          }
        });
      }

      if (reqPayload.scope_filename && typeof reqPayload.scope_filename === 'string') {
        const names = reqPayload.scope_filename.split(',').map((s: string) => s.trim()).filter(Boolean);
        names.forEach((n: string) => {
          if (!seenScope.has(n)) {
            seenScope.add(n);
            scopeList.push({ name: n, size: 'Attached Document' });
          }
        });
      }

      if (kmlList.length > 0) setExistingKmlFiles(kmlList);
      if (scopeList.length > 0) setExistingScopeFiles(scopeList);
    };

    (async () => {
      let targetId = currentDraftId || rawProjectId;

      // 1. If targetId was not in URL, check localStorage for saved draft
      if (!targetId && typeof window !== 'undefined') {
        try {
          const cachedStr = localStorage.getItem('latrics_project_draft');
          if (cachedStr) {
            const cachedData = JSON.parse(cachedStr);
            if (cachedData) {
              if (cachedData.draftId) {
                targetId = cachedData.draftId;
              }
              // Immediately hydrate full form from localStorage for instant display
              hydrateFromPayload(cachedData.projectName || '', cachedData, cachedData.draftId);
            }
          }
        } catch (e) {
          console.error('Error reading localStorage draft', e);
        }
      }

      // 2. If still no targetId, query database for the user's latest saved draft
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

      // 3. If targetId resolved, load latest fresh state from database
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

  // Project Communication Contacts - Dynamically fetched from company profile authenticated members
  const [orgMembers, setOrgMembers] = useState<UserProfile[]>([]);
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [isContactDropdownOpen, setIsContactDropdownOpen] = useState(false);
  const [contactSearchInput, setContactSearchInput] = useState('');
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const contactDropdownRef = useRef<HTMLDivElement>(null);

  // Fetch company members who have authenticated into the application
  useEffect(() => {
    let isMounted = true;
    setIsLoadingMembers(true);
    usersApi
      .getOrganizationMembers()
      .then((members) => {
        if (!isMounted) return;
        setOrgMembers(members || []);
      })
      .catch((err) => {
        console.error('Failed to load organization members:', err);
      })
      .finally(() => {
        if (isMounted) setIsLoadingMembers(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Close contact dropdown on click outside
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

  // 3. Payload / Sensor State
  const [selectedPayload, setSelectedPayload] = useState<PayloadType>('61mp_camera');

  // 4. Deliverables State (Multi-type selection: client can opt Pre Processing, Post Processing, or BOTH)
  const [optPreProcessing, setOptPreProcessing] = useState<boolean>(false);
  const [optPostProcessing, setOptPostProcessing] = useState<boolean>(true);

  // Pre-processing selected checkboxes
  const [preDeliverables, setPreDeliverables] = useState<Record<string, boolean>>({
    geo_tagged_image: true,
    event_files: true,
    point_cloud: false,
    trajectory_files: false,
    other: false,
  });
  const [preOtherText, setPreOtherText] = useState('');

  // Post-processing selected checkboxes
  const [postDeliverables, setPostDeliverables] = useState<Record<string, boolean>>({
    orthomosaic: true,
    topographic_map: false,
    dem: false,
    dsm: false,
    point_cloud: false,
    '3d_model': false,
    cad: false,
    volumetric_analysis: false,
    contour: false,
    other: false,
  });
  const [postOtherText, setPostOtherText] = useState('');

  // Automatically adjust pre-processing deliverable availability when payload changes
  useEffect(() => {
    if (selectedPayload === '61mp_camera' || selectedPayload === 'oblique_camera') {
      // 61MP and Oblique only support Geo Tagged Image and Event Files
      setPreDeliverables((prev) => ({
        ...prev,
        geo_tagged_image: prev.geo_tagged_image ?? true,
        event_files: prev.event_files ?? true,
        point_cloud: false,
        trajectory_files: false,
      }));
    } else if (selectedPayload === 'lidar') {
      // LiDAR supports all 4 pre-processing deliverables
      setPreDeliverables((prev) => ({
        ...prev,
        geo_tagged_image: prev.geo_tagged_image ?? true,
        event_files: prev.event_files ?? true,
        point_cloud: prev.point_cloud ?? true,
        trajectory_files: prev.trajectory_files ?? true,
      }));
    }
  }, [selectedPayload]);

  // Helper to determine if a pre-processing deliverable is enabled for the selected payload
  const isPreDeliverableEnabled = (id: string): boolean => {
    if (id === 'geo_tagged_image' || id === 'event_files' || id === 'other') {
      return true;
    }
    if (id === 'point_cloud' || id === 'trajectory_files') {
      return selectedPayload === 'lidar';
    }
    return false;
  };

  const togglePreDeliverable = (id: string) => {
    if (!isPreDeliverableEnabled(id)) return;
    setPreDeliverables((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const togglePostDeliverable = (id: string) => {
    setPostDeliverables((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // 5. Schedule State
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [tenureDays, setTenureDays] = useState(0);

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

  const handleStartDateChange = (val: string) => {
    setStartDate(val);
    calculateTenure(val, endDate);
  };

  const handleEndDateChange = (val: string) => {
    setEndDate(val);
    calculateTenure(startDate, val);
  };

  // Format file size utility
  const formatFileSize = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // 6. KML / Boundary Files State (Multiple Files Support)
  const [kmlFiles, setKmlFiles] = useState<File[]>([]);
  const [existingKmlFiles, setExistingKmlFiles] = useState<Array<{ name: string; size?: string }>>([]);
  const [isDraggingKml, setIsDraggingKml] = useState(false);
  const kmlInputRef = useRef<HTMLInputElement>(null);

  // 7. Scope Document Files State (Multiple Files Support)
  const [scopeFiles, setScopeFiles] = useState<File[]>([]);
  const [existingScopeFiles, setExistingScopeFiles] = useState<Array<{ name: string; size?: string }>>([]);
  const [isDraggingScope, setIsDraggingScope] = useState(false);
  const scopeInputRef = useRef<HTMLInputElement>(null);

  const handleAddKmlFiles = (newFiles: FileList | File[]) => {
    const incoming = Array.from(newFiles);
    setKmlFiles((prev) => {
      const existingNames = new Set([...prev.map((f) => f.name), ...existingKmlFiles.map((f) => f.name)]);
      const filtered = incoming.filter((f) => !existingNames.has(f.name));
      return [...prev, ...filtered];
    });
  };

  const handleRemoveKmlFile = (index: number) => {
    setKmlFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRemoveExistingKmlFile = (index: number) => {
    setExistingKmlFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddScopeFiles = (newFiles: FileList | File[]) => {
    const incoming = Array.from(newFiles);
    setScopeFiles((prev) => {
      const existingNames = new Set([...prev.map((f) => f.name), ...existingScopeFiles.map((f) => f.name)]);
      const filtered = incoming.filter((f) => !existingNames.has(f.name));
      return [...prev, ...filtered];
    });
  };

  const handleRemoveScopeFile = (index: number) => {
    setScopeFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRemoveExistingScopeFile = (index: number) => {
    setExistingScopeFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // 8. Remarks State (Optional)
  const [remarks, setRemarks] = useState('');

  // UI state for messages & loading
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [draftToast, setDraftToast] = useState(false);
  const [draftSavedMessage, setDraftSavedMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Add/remove communication contacts
  const handleAddContact = (name: string) => {
    const trimmed = name.trim();
    if (trimmed && !selectedContacts.includes(trimmed)) {
      setSelectedContacts([...selectedContacts, trimmed]);
    }
    setContactSearchInput('');
  };

  const handleRemoveContact = (name: string) => {
    setSelectedContacts(selectedContacts.filter((c) => c !== name));
  };

  // Discard draft and reset form
  const handleDiscardDraft = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('latrics_project_draft');
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
    setRemarks('');
    setSelectedContacts([]);
    setExistingKmlFiles([]);
    setExistingScopeFiles([]);
    setKmlFiles([]);
    setScopeFiles([]);
    setPreOtherText('');
    setPostOtherText('');
    setOptPreProcessing(false);
    setOptPostProcessing(true);
    if (user) {
      setCompanyName(user.company_name || '');
      setOwnerName(user.full_name || '');
      setPrimaryEmail(user.email || '');
      setPhoneNumber(user.phone_number || '');
    }
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', window.location.pathname);
    }
    setDraftSavedMessage(null);
  };

  // Save Draft Action (Database-backed & LocalStorage fallback)
  const handleSaveDraft = async () => {
    try {
      setIsSavingDraft(true);
      setErrorMessage(null);

      const allKmlNames = [...existingKmlFiles.map((f) => f.name), ...kmlFiles.map((f) => f.name)];
      const allScopeNames = [...existingScopeFiles.map((f) => f.name), ...scopeFiles.map((f) => f.name)];

      const selectedModes: string[] = [];
      if (optPreProcessing) selectedModes.push('pre_processing');
      if (optPostProcessing) selectedModes.push('post_processing');

      const activeDeliverables: string[] = [];
      if (optPreProcessing) {
        Object.entries(preDeliverables).forEach(([k, v]) => {
          if (v && isPreDeliverableEnabled(k)) {
            if (k === 'other') {
              if (preOtherText.trim()) activeDeliverables.push(`Pre Other: ${preOtherText.trim()}`);
            } else {
              activeDeliverables.push(k);
            }
          }
        });
      }
      if (optPostProcessing) {
        Object.entries(postDeliverables).forEach(([k, v]) => {
          if (v) {
            if (k === 'other') {
              if (postOtherText.trim()) activeDeliverables.push(`Other: ${postOtherText.trim()}`);
            } else {
              activeDeliverables.push(k);
            }
          }
        });
      }

      const trimmedAddress = locationAddress.trim();
      const trimmedCity = city.trim();
      const trimmedState = state.trim();

      const payloadPayload = {
        deliverables: activeDeliverables,
        processing_modes: selectedModes,
        processing_mode: selectedModes.length === 2 ? 'both' : selectedModes[0] || 'post_processing',
        pre_deliverables: optPreProcessing ? preDeliverables : {},
        post_deliverables: optPostProcessing ? postDeliverables : {},
        pre_other_text: preOtherText,
        post_other_text: postOtherText,
        payload_sensor: selectedPayload,
        company_name: companyName,
        address: trimmedAddress,
        location_address: trimmedAddress,
        city: trimmedCity,
        state: trimmedState,
        survey_location: trimmedAddress || (trimmedCity && trimmedState ? `${trimmedCity}, ${trimmedState}` : 'Specified in Scope'),
        primary_contact: {
          name: ownerName,
          email: primaryEmail,
          phone: `${phoneCode} ${phoneNumber}`,
          company: companyName,
          city: trimmedCity,
          state: trimmedState,
        },
        communication_contacts: selectedContacts,
        start_date: startDate,
        end_date: endDate,
        tenure_days: tenureDays,
        kml_filename: allKmlNames.join(', ') || null,
        scope_filename: allScopeNames.join(', ') || null,
        kml_files: [
          ...existingKmlFiles,
          ...kmlFiles.map((f) => ({
            name: f.name,
            size: formatFileSize(f.size),
            type: f.name.endsWith('.kmz') ? 'KMZ' : 'KML',
            category: 'Boundary',
            date: new Date().toISOString().split('T')[0],
          })),
        ],
        scope_files: [
          ...existingScopeFiles,
          ...scopeFiles.map((f) => ({
            name: f.name,
            size: formatFileSize(f.size),
            type: f.name.endsWith('.pdf')
              ? 'PDF'
              : f.name.endsWith('.xlsx') || f.name.endsWith('.xls') || f.name.endsWith('.csv')
              ? 'Spreadsheet'
              : 'Document',
            category: 'Scope Document',
            date: new Date().toISOString().split('T')[0],
          })),
        ],
        attachments: [
          ...existingKmlFiles.map((f) => ({
            name: f.name,
            size: f.size || '—',
            type: 'KML',
            category: 'Boundary',
            date: new Date().toISOString().split('T')[0],
          })),
          ...kmlFiles.map((f) => ({
            name: f.name,
            size: formatFileSize(f.size),
            type: f.name.endsWith('.kmz') ? 'KMZ' : 'KML',
            category: 'Boundary',
            date: new Date().toISOString().split('T')[0],
          })),
          ...existingScopeFiles.map((f) => ({
            name: f.name,
            size: f.size || '—',
            type: 'Document',
            category: 'Scope Document',
            date: new Date().toISOString().split('T')[0],
          })),
          ...scopeFiles.map((f) => ({
            name: f.name,
            size: formatFileSize(f.size),
            type: f.name.endsWith('.pdf')
              ? 'PDF'
              : f.name.endsWith('.xlsx') || f.name.endsWith('.xls') || f.name.endsWith('.csv')
              ? 'Spreadsheet'
              : 'Document',
            category: 'Scope Document',
            date: new Date().toISOString().split('T')[0],
          })),
        ],
        remarks: remarks || null,
        is_draft: true,
      };

      const finalSurveyLocation = trimmedAddress || (trimmedCity && trimmedState ? `${trimmedCity}, ${trimmedState}` : 'Specified in Scope');
      const draftTitle = projectName.trim() || `Draft Survey - ${new Date().toLocaleDateString('en-GB')}`;

      let targetId = currentDraftId || rawProjectId;
      if (targetId) {
        // Update existing draft project in backend database
        await projectApi.updateProject(targetId, {
          title: draftTitle,
          description: remarks || `Draft survey project: ${draftTitle}`,
          status: ProjectStatus.DRAFT,
          requirements_payload: payloadPayload,
          survey_location: finalSurveyLocation,
          survey_type: selectedPayload,
        });
      } else {
        // Create new draft project in database
        const created = await projectApi.createProject({
          title: draftTitle,
          description: remarks || `Draft survey project: ${draftTitle}`,
          survey_location: finalSurveyLocation,
          survey_type: selectedPayload,
          target_area_sqkm: 25.0,
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

      // Also persist to localStorage for fast local resume
      if (typeof window !== 'undefined') {
        localStorage.setItem(
          'latrics_project_draft',
          JSON.stringify({
            ...payloadPayload,
            projectName: draftTitle,
            draftId: targetId,
            savedAt: new Date().toISOString(),
          })
        );
      }

      setDraftSavedMessage('Draft saved successfully to your database workspace! You can resume it anytime from the Draft/Hold tab.');
      setDraftToast(true);
      setTimeout(() => {
        setDraftToast(false);
        setDraftSavedMessage(null);
      }, 5000);
    } catch (e: any) {
      console.error('Failed to save draft to database', e);
      setErrorMessage(e.message || 'Failed to save draft to server. Please check your connection.');
    } finally {
      setIsSavingDraft(false);
    }
  };

  // Submit Request Action
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

    if (selectedContacts.length === 0) {
      setErrorMessage('Please select at least one project communication contact.');
      return;
    }

    if (!optPreProcessing && !optPostProcessing) {
      setErrorMessage('Please select at least one processing type (Pre Processing, Post Processing, or Both).');
      return;
    }

    // Verify at least one active deliverable
    const activeDeliverables: string[] = [];
    if (optPreProcessing) {
      Object.entries(preDeliverables).forEach(([k, v]) => {
        if (v && isPreDeliverableEnabled(k)) {
          if (k === 'other') {
            if (preOtherText.trim()) activeDeliverables.push(`Pre Other: ${preOtherText.trim()}`);
          } else {
            activeDeliverables.push(k);
          }
        }
      });
    }

    if (optPostProcessing) {
      Object.entries(postDeliverables).forEach(([k, v]) => {
        if (v) {
          if (k === 'other') {
            if (postOtherText.trim()) activeDeliverables.push(`Other: ${postOtherText.trim()}`);
          } else {
            activeDeliverables.push(k);
          }
        }
      });
    }

    if (activeDeliverables.length === 0) {
      setErrorMessage('Please select at least one deliverable under your chosen processing type(s).');
      return;
    }

    try {
      setIsSubmitting(true);

      const selectedModes: string[] = [];
      if (optPreProcessing) selectedModes.push('pre_processing');
      if (optPostProcessing) selectedModes.push('post_processing');

      const trimmedAddress = locationAddress.trim();
      const trimmedCity = city.trim();
      const trimmedState = state.trim();

      const payloadPayload = {
        deliverables: activeDeliverables,
        processing_modes: selectedModes,
        processing_mode: selectedModes.length === 2 ? 'both' : selectedModes[0] || 'post_processing',
        pre_deliverables: optPreProcessing ? preDeliverables : {},
        post_deliverables: optPostProcessing ? postDeliverables : {},
        pre_other_text: preOtherText,
        post_other_text: postOtherText,
        payload_sensor: selectedPayload,
        company_name: companyName,
        address: trimmedAddress,
        location_address: trimmedAddress,
        city: trimmedCity,
        state: trimmedState,
        survey_location: trimmedAddress,
        primary_contact: {
          name: ownerName,
          email: primaryEmail,
          phone: `${phoneCode} ${phoneNumber}`,
          company: companyName,
          city: trimmedCity,
          state: trimmedState,
        },
        communication_contacts: selectedContacts,
        start_date: startDate,
        end_date: endDate,
        tenure_days: tenureDays,
        kml_filename: [...existingKmlFiles.map((f) => f.name), ...kmlFiles.map((f) => f.name)].join(', ') || null,
        scope_filename: [...existingScopeFiles.map((f) => f.name), ...scopeFiles.map((f) => f.name)].join(', ') || null,
        kml_files: [
          ...existingKmlFiles,
          ...kmlFiles.map((f) => ({
            name: f.name,
            size: formatFileSize(f.size),
            type: f.name.endsWith('.kmz') ? 'KMZ' : 'KML',
            category: 'Boundary',
            date: new Date().toISOString().split('T')[0],
          })),
        ],
        scope_files: [
          ...existingScopeFiles,
          ...scopeFiles.map((f) => ({
            name: f.name,
            size: formatFileSize(f.size),
            type: f.name.endsWith('.pdf')
              ? 'PDF'
              : f.name.endsWith('.xlsx') || f.name.endsWith('.xls') || f.name.endsWith('.csv')
              ? 'Spreadsheet'
              : 'Document',
            category: 'Scope Document',
            date: new Date().toISOString().split('T')[0],
          })),
        ],
        attachments: [
          ...existingKmlFiles.map((f) => ({
            name: f.name,
            size: f.size || '—',
            type: 'KML',
            category: 'Boundary',
            date: new Date().toISOString().split('T')[0],
          })),
          ...kmlFiles.map((f) => ({
            name: f.name,
            size: formatFileSize(f.size),
            type: f.name.endsWith('.kmz') ? 'KMZ' : 'KML',
            category: 'Boundary',
            date: new Date().toISOString().split('T')[0],
          })),
          ...existingScopeFiles.map((f) => ({
            name: f.name,
            size: f.size || '—',
            type: 'Document',
            category: 'Scope Document',
            date: new Date().toISOString().split('T')[0],
          })),
          ...scopeFiles.map((f) => ({
            name: f.name,
            size: formatFileSize(f.size),
            type: f.name.endsWith('.pdf')
              ? 'PDF'
              : f.name.endsWith('.xlsx') || f.name.endsWith('.xls') || f.name.endsWith('.csv')
              ? 'Spreadsheet'
              : 'Document',
            category: 'Scope Document',
            date: new Date().toISOString().split('T')[0],
          })),
        ],
        remarks: remarks || null,
      };

      const finalSurveyLocation = trimmedAddress || (trimmedCity && trimmedState ? `${trimmedCity}, ${trimmedState}` : 'Survey Location');

      if (currentDraftId && isDraftMode) {
        // Transition existing draft project to SUBMITTED status and update requirements_payload
        await projectApi.updateProject(currentDraftId, {
          title: projectName.trim(),
          description: remarks || `Survey mapping project: ${projectName.trim()}`,
          status: ProjectStatus.SUBMITTED,
          requirements_payload: payloadPayload,
          survey_location: finalSurveyLocation,
          survey_type: selectedPayload,
        });

        // Clear local draft storage
        if (typeof window !== 'undefined') {
          localStorage.removeItem('latrics_project_draft');
        }

        setSuccessMessage('Draft submitted as active Project Request successfully! Redirecting to your projects ledger...');
        setTimeout(() => {
          router.push('/projects');
        }, 1500);
      } else if (isRevision && projectId) {
        // Submit revision version to existing project
        await requestApi.submitRequest(projectId, {
          survey_location: finalSurveyLocation,
          survey_type: selectedPayload,
          target_area_sqkm: 25.0,
          requirements_payload: payloadPayload,
        });

        // Also sync project title & description
        await projectApi.updateProject(projectId, {
          title: projectName.trim(),
          description: remarks || `Survey mapping project: ${projectName.trim()}`,
        }).catch(() => null);

        // Clear draft storage
        if (typeof window !== 'undefined') {
          localStorage.removeItem('latrics_project_draft');
        }

        setSuccessMessage('Revised Project Request submitted successfully! Redirecting to project overview...');
        setTimeout(() => {
          router.push(`/projects/${projectId}/overview`);
        }, 1500);
      } else {
        await projectApi.createProject({
          title: projectName.trim(),
          description: remarks || `Survey mapping project: ${projectName.trim()}`,
          survey_location: finalSurveyLocation,
          survey_type: selectedPayload,
          target_area_sqkm: 25.0,
          requirements_payload: payloadPayload,
        });

        // Clear draft storage
        if (typeof window !== 'undefined') {
          localStorage.removeItem('latrics_project_draft');
        }

        setSuccessMessage('New Project Request submitted successfully! Redirecting to your projects ledger...');
        setTimeout(() => {
          router.push('/projects');
        }, 1500);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to submit project request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Available member suggestions from company profile
  const availableMembers = orgMembers.map((m) => m.full_name || m.email);

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
        maxWidth: '1280px',
        margin: '0 auto',
        paddingBottom: '3rem',
      }}
    >
      {/* ── Top Breadcrumb Bar ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.825rem' }}>
        <Link
          href="/projects"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.2rem',
            color: '#09090b',
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          <ChevronLeft size={15} /> Projects
        </Link>
        <span style={{ color: 'var(--text-muted)' }}>&gt;</span>
        {isRevision && (
          <>
            <Link
              href={`/projects/${projectId}/overview`}
              style={{
                color: '#09090b',
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              {projectName || 'Project'}
            </Link>
            <span style={{ color: 'var(--text-muted)' }}>&gt;</span>
          </>
        )}
        <span style={{ color: 'var(--text-secondary)' }}>
          {isRevision ? 'Revise Request' : isDraftMode ? 'Edit Draft' : 'New Request'}
        </span>
      </div>

      {/* ── Page Hero Header & Action Buttons ── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '1rem',
          paddingBottom: '0.25rem',
        }}
      >
        <div>
          <h1
            style={{
              fontSize: '1.45rem',
              fontWeight: 800,
              color: '#09090b',
              letterSpacing: '-0.02em',
              lineHeight: 1.2,
            }}
          >
            {isRevision ? 'Revise Project Request' : isDraftMode ? 'Edit Draft Request' : 'New Project Request'}
          </h1>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            {isRevision
              ? 'Update survey specifications, sensors, or requirements. Submitting will create an updated revision for Latrics review.'
              : isDraftMode
              ? 'Resume and update your saved draft request. All your previously saved details and documents are loaded.'
              : 'Submit a new survey / mapping request. All fields marked with * are required.'}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={isSavingDraft || isSubmitting}
            className="btn btn-secondary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              height: '38px',
              fontSize: '0.8rem',
              fontWeight: 600,
              padding: '0 1rem',
              backgroundColor: '#ffffff',
              border: '1px solid #d4d4d8',
              cursor: isSavingDraft || isSubmitting ? 'not-allowed' : 'pointer',
            }}
          >
            {isSavingDraft ? (
              <>
                <Loader2 size={15} className="animate-spin" /> Saving Draft...
              </>
            ) : (
              <>
                <FileText size={15} /> Save Draft
              </>
            )}
          </button>
          <button
            type="submit"
            disabled={isSubmitting || isSavingDraft}
            className="btn btn-primary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              height: '38px',
              fontSize: '0.8rem',
              fontWeight: 700,
              padding: '0 1.15rem',
              backgroundColor: '#09090b',
              color: '#ffffff',
            }}
          >
            {isSubmitting ? (
              'Submitting...'
            ) : (
              <>
                <Send size={14} /> {isRevision ? 'Submit Request Revision' : 'Submit Request'}
              </>
            )}
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

      {/* ── Feedback Notifications ── */}
      {draftToast && (
        <div
          style={{
            padding: '0.75rem 1rem',
            backgroundColor: '#ffffff',
            border: '1px solid #09090b',
            borderRadius: '6px',
            color: '#09090b',
            fontWeight: 600,
            fontSize: '0.825rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileCheck size={16} color="#09090b" />
            <span>{draftSavedMessage || 'Draft saved successfully. You can return anytime to complete and submit your request.'}</span>
          </div>
          <button
            type="button"
            onClick={() => setDraftToast(false)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#71717a' }}
          >
            <X size={14} />
          </button>
        </div>
      )}

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
          <Check size={18} /> {successMessage}
        </div>
      )}

      {/* ── 1. Project Details ── */}
      <div
        className="wf-card"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          border: '1px solid #e4e4e7',
          padding: '1.25rem',
        }}
      >
        <h2 className="wf-title" style={{ fontSize: '0.95rem', fontWeight: 700, color: '#09090b' }}>
          1. Project Details
        </h2>
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
            style={{
              fontSize: '0.825rem',
              height: '38px',
              border: '1px solid #d4d4d8',
              borderRadius: '6px',
              padding: '0 0.75rem',
            }}
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
            style={{
              fontSize: '0.825rem',
              height: '38px',
              border: '1px solid #d4d4d8',
              borderRadius: '6px',
              padding: '0 0.75rem',
            }}
          />
        </div>

        {/* City and State */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
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
              style={{
                fontSize: '0.825rem',
                height: '38px',
                border: '1px solid #d4d4d8',
                borderRadius: '6px',
                padding: '0 0.75rem',
              }}
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
              style={{
                fontSize: '0.825rem',
                height: '38px',
                border: '1px solid #d4d4d8',
                borderRadius: '6px',
                padding: '0 0.75rem',
                backgroundColor: '#ffffff',
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
        </div>
      </div>

      {/* ── 2. Contact Information ── */}
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
          {/* Left Sub-Card: Profile Contact Info (Auto-filled by default from Profile) */}
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
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#09090b' }}>
              Primary Contact (Auto-filled)
            </span>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <label style={{ fontSize: '0.725rem', fontWeight: 600, color: '#09090b' }}>
                Owner / Contact Person <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                required
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                className="form-input"
                style={{
                  fontSize: '0.8rem',
                  height: '36px',
                  backgroundColor: '#ffffff',
                  border: '1px solid #d4d4d8',
                  borderRadius: '4px',
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: '0.75rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <label style={{ fontSize: '0.725rem', fontWeight: 600, color: '#09090b' }}>
                  Email <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="email"
                  required
                  value={primaryEmail}
                  onChange={(e) => setPrimaryEmail(e.target.value)}
                  className="form-input"
                  style={{
                    fontSize: '0.8rem',
                    height: '36px',
                    backgroundColor: '#ffffff',
                    border: '1px solid #d4d4d8',
                    borderRadius: '4px',
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <label style={{ fontSize: '0.725rem', fontWeight: 600, color: '#09090b' }}>
                  Phone Number <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div style={{ display: 'flex', gap: '0.35rem' }}>
                  <select
                    value={phoneCode}
                    onChange={(e) => setPhoneCode(e.target.value)}
                    className="form-select"
                    style={{
                      width: '68px',
                      fontSize: '0.75rem',
                      height: '36px',
                      backgroundColor: '#ffffff',
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
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="form-input"
                    style={{
                      flex: 1,
                      fontSize: '0.8rem',
                      height: '36px',
                      backgroundColor: '#ffffff',
                      border: '1px solid #d4d4d8',
                      borderRadius: '4px',
                    }}
                  />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <label style={{ fontSize: '0.725rem', fontWeight: 600, color: '#09090b' }}>
                Company <span style={{ color: '#ef4444' }}>*</span>
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
                Project Communication Contacts <span style={{ color: '#ef4444' }}>*</span>
              </span>
              <p style={{ fontSize: '0.725rem', color: 'var(--text-secondary)', marginTop: '0.2rem', lineHeight: 1.35 }}>
                Select one or more team members from your organization who should be included in project communications with the Latrics team.
              </p>
            </div>

            {/* Custom Multi-Select Dropdown Container */}
            <div ref={contactDropdownRef} style={{ position: 'relative', marginTop: '0.25rem' }}>
              <div
                onClick={() => setIsContactDropdownOpen(!isContactDropdownOpen)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  height: '36px',
                  padding: '0 0.75rem',
                  border: '1px solid #d4d4d8',
                  borderRadius: '4px',
                  backgroundColor: '#ffffff',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  color: '#71717a',
                }}
              >
                <span>{selectedContacts.length > 0 ? `${selectedContacts.length} contact(s) selected` : 'Select contacts...'}</span>
                <ChevronDown size={15} color="#71717a" />
              </div>

              {/* Dropdown Menu - Lists Only Authenticated Members Under This Company Profile */}
              {isContactDropdownOpen && (
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
                    maxHeight: '220px',
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
                            handleAddContact(contactSearchInput);
                          }
                        }
                      }}
                      className="form-input"
                      style={{ fontSize: '0.75rem', height: '30px', flex: 1 }}
                    />
                    {contactSearchInput.trim() && (
                      <button
                        type="button"
                        onClick={() => handleAddContact(contactSearchInput)}
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
                  ) : availableMembers.length > 0 ? (
                    availableMembers
                      .filter((name) =>
                        name.toLowerCase().includes(contactSearchInput.toLowerCase())
                      )
                      .map((name) => {
                        const isSelected = selectedContacts.includes(name);
                        return (
                          <div
                            key={name}
                            onClick={() => {
                              if (isSelected) {
                                handleRemoveContact(name);
                              } else {
                                handleAddContact(name);
                              }
                            }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '0.4rem 0.6rem',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              backgroundColor: isSelected ? '#f4f4f5' : 'transparent',
                              fontSize: '0.775rem',
                              fontWeight: isSelected ? 600 : 400,
                              color: '#09090b',
                            }}
                          >
                            <span>{name}</span>
                            {isSelected && <Check size={14} color="#09090b" />}
                          </div>
                        );
                      })
                  ) : (
                    <div style={{ padding: '0.5rem', fontSize: '0.75rem', color: '#71717a', textAlign: 'center' }}>
                      No other authenticated team members found in company profile.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Selected Contact Pill Badges (Shown only when chosen by user) */}
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
                  <button
                    type="button"
                    onClick={() => handleRemoveContact(contact)}
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
                </div>
              ))}
              {selectedContacts.length === 0 && (
                <span style={{ fontSize: '0.725rem', color: '#a1a1aa', fontStyle: 'italic' }}>
                  No communication contacts selected yet. Choose contacts from the dropdown above.
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Two Column Row: 3. Payload / Sensor & 4. Deliverables ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '1.25rem',
        }}
      >
        {/* ── 3. Payload / Sensor ── */}
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
              3. Payload / Sensor <span style={{ color: '#ef4444' }}>*</span>
            </h2>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
              Select the payload / sensor for this project (single selection).
            </p>
          </div>

          {/* 3 Selectable Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.65rem' }}>
            {/* 1) 61MP Camera */}
            <div
              onClick={() => setSelectedPayload('61mp_camera')}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                padding: '1rem 0.5rem',
                border: selectedPayload === '61mp_camera' ? '2px solid #09090b' : '1px solid #e4e4e7',
                borderRadius: '6px',
                cursor: 'pointer',
                backgroundColor: '#ffffff',
                position: 'relative',
                transition: 'all 0.15s ease',
              }}
            >
              {/* Radio Circle Top Left */}
              <div
                style={{
                  position: 'absolute',
                  top: '8px',
                  left: '8px',
                  width: '16px',
                  height: '16px',
                  borderRadius: '50%',
                  border: selectedPayload === '61mp_camera' ? '5px solid #09090b' : '1.5px solid #a1a1aa',
                  backgroundColor: '#ffffff',
                }}
              />
              <Camera size={26} color="#09090b" style={{ marginTop: '0.25rem', marginBottom: '0.5rem' }} />
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#09090b', lineHeight: 1.2 }}>
                61MP Camera
              </span>
              <span style={{ fontSize: '0.675rem', color: 'var(--text-secondary)', marginTop: '0.35rem', lineHeight: 1.25 }}>
                High resolution RGB imagery
              </span>
            </div>

            {/* 2) LiDAR */}
            <div
              onClick={() => setSelectedPayload('lidar')}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                padding: '1rem 0.5rem',
                border: selectedPayload === 'lidar' ? '2px solid #09090b' : '1px solid #e4e4e7',
                borderRadius: '6px',
                cursor: 'pointer',
                backgroundColor: '#ffffff',
                position: 'relative',
                transition: 'all 0.15s ease',
              }}
            >
              {/* Radio Circle Top Left */}
              <div
                style={{
                  position: 'absolute',
                  top: '8px',
                  left: '8px',
                  width: '16px',
                  height: '16px',
                  borderRadius: '50%',
                  border: selectedPayload === 'lidar' ? '5px solid #09090b' : '1.5px solid #a1a1aa',
                  backgroundColor: '#ffffff',
                }}
              />
              <Layers size={26} color="#09090b" style={{ marginTop: '0.25rem', marginBottom: '0.5rem' }} />
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#09090b', lineHeight: 1.2 }}>
                LiDAR
              </span>
              <span style={{ fontSize: '0.675rem', color: 'var(--text-secondary)', marginTop: '0.35rem', lineHeight: 1.25 }}>
                3D spatial data capture
              </span>
            </div>

            {/* 3) Oblique Camera */}
            <div
              onClick={() => setSelectedPayload('oblique_camera')}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                padding: '1rem 0.5rem',
                border: selectedPayload === 'oblique_camera' ? '2px solid #09090b' : '1px solid #e4e4e7',
                borderRadius: '6px',
                cursor: 'pointer',
                backgroundColor: '#ffffff',
                position: 'relative',
                transition: 'all 0.15s ease',
              }}
            >
              {/* Radio Circle Top Left */}
              <div
                style={{
                  position: 'absolute',
                  top: '8px',
                  left: '8px',
                  width: '16px',
                  height: '16px',
                  borderRadius: '50%',
                  border: selectedPayload === 'oblique_camera' ? '5px solid #09090b' : '1.5px solid #a1a1aa',
                  backgroundColor: '#ffffff',
                }}
              />
              <Aperture size={26} color="#09090b" style={{ marginTop: '0.25rem', marginBottom: '0.5rem' }} />
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#09090b', lineHeight: 1.2 }}>
                Oblique Camera
              </span>
              <span style={{ fontSize: '0.675rem', color: 'var(--text-secondary)', marginTop: '0.35rem', lineHeight: 1.25 }}>
                Multi-angle imagery
              </span>
            </div>
          </div>
        </div>

        {/* ── 4. Deliverables ── */}
        <div
          className="wf-card"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            border: '1px solid #e4e4e7',
            padding: '1.25rem',
          }}
        >
          <div>
            <h2 className="wf-title" style={{ fontSize: '0.95rem', fontWeight: 700, color: '#09090b' }}>
              4. Deliverables <span style={{ color: '#ef4444' }}>*</span>
            </h2>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
              Select deliverables based on the selected payload and processing type.
            </p>
          </div>

          {/* Processing Mode Switcher (Multi-select Checkbox Cards) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
            {/* Pre Processing Card */}
            <div
              onClick={() => setOptPreProcessing(!optPreProcessing)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.65rem',
                padding: '0.65rem 0.75rem',
                border: optPreProcessing ? '2px solid #09090b' : '1px solid #e4e4e7',
                borderRadius: '6px',
                cursor: 'pointer',
                backgroundColor: '#ffffff',
                transition: 'all 0.15s ease',
              }}
            >
              <div
                style={{
                  width: '16px',
                  height: '16px',
                  borderRadius: '3px',
                  border: optPreProcessing ? '1px solid #09090b' : '1.5px solid #a1a1aa',
                  backgroundColor: optPreProcessing ? '#09090b' : '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {optPreProcessing && <Check size={12} color="#ffffff" strokeWidth={3} />}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.775rem', fontWeight: 700, color: '#09090b' }}>
                  Pre Processing
                </span>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>
                  Raw data and basic outputs
                </span>
              </div>
            </div>

            {/* Post Processing Card */}
            <div
              onClick={() => setOptPostProcessing(!optPostProcessing)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.65rem',
                padding: '0.65rem 0.75rem',
                border: optPostProcessing ? '2px solid #09090b' : '1px solid #e4e4e7',
                borderRadius: '6px',
                cursor: 'pointer',
                backgroundColor: '#ffffff',
                transition: 'all 0.15s ease',
              }}
            >
              <div
                style={{
                  width: '16px',
                  height: '16px',
                  borderRadius: '3px',
                  border: optPostProcessing ? '1px solid #09090b' : '1.5px solid #a1a1aa',
                  backgroundColor: optPostProcessing ? '#09090b' : '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {optPostProcessing && <Check size={12} color="#ffffff" strokeWidth={3} />}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.775rem', fontWeight: 700, color: '#09090b' }}>
                  Post Processing
                </span>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>
                  Value added products and analysis
                </span>
              </div>
            </div>
          </div>

          {/* Info Banner Note */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.45rem 0.65rem',
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '4px',
              fontSize: '0.7rem',
              color: '#64748b',
            }}
          >
            <Info size={13} style={{ flexShrink: 0 }} />
            <span>You can select Pre Processing, Post Processing, or both. Deliverables are filtered based on selected payload.</span>
          </div>

          {!optPreProcessing && !optPostProcessing && (
            <div
              style={{
                padding: '1.25rem',
                textAlign: 'center',
                backgroundColor: '#fafafa',
                border: '1px dashed #d4d4d8',
                borderRadius: '6px',
                color: '#71717a',
                fontSize: '0.75rem',
              }}
            >
              Please select at least one processing type above (Pre Processing and/or Post Processing) to configure deliverables.
            </div>
          )}

          {/* ── 1. Pre Processing Deliverables (Shown when Pre Processing is checked) ── */}
          {optPreProcessing && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.25rem' }}>
              {(optPreProcessing && optPostProcessing) && (
                <span style={{ fontSize: '0.775rem', fontWeight: 700, color: '#09090b' }}>
                  Pre-Processing Deliverables
                </span>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                {PRE_PROCESSING_DELIVERABLES.map((item) => {
                  const isEnabled = isPreDeliverableEnabled(item.id);
                  const isChecked = isEnabled && !!preDeliverables[item.id];

                  return (
                    <div
                      key={item.id}
                      onClick={() => {
                        if (isEnabled) togglePreDeliverable(item.id);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.65rem',
                        padding: '0.65rem 0.75rem',
                        border: isChecked
                          ? '1px solid #09090b'
                          : isEnabled
                          ? '1px solid #e4e4e7'
                          : '1px solid #f4f4f5',
                        borderRadius: '4px',
                        backgroundColor: isEnabled ? '#ffffff' : '#fafafa',
                        cursor: isEnabled ? 'pointer' : 'not-allowed',
                        opacity: isEnabled ? 1 : 0.45,
                        transition: 'all 0.15s ease',
                        userSelect: 'none',
                      }}
                    >
                      <div
                        style={{
                          width: '16px',
                          height: '16px',
                          borderRadius: '3px',
                          border: isChecked
                            ? '1px solid #09090b'
                            : isEnabled
                            ? '1.5px solid #a1a1aa'
                            : '1.5px solid #d4d4d8',
                          backgroundColor: isChecked ? '#09090b' : '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        {isChecked && <Check size={12} color="#ffffff" strokeWidth={3} />}
                      </div>
                      <span
                        style={{
                          fontSize: '0.775rem',
                          fontWeight: isChecked ? 700 : isEnabled ? 500 : 400,
                          color: isEnabled ? '#09090b' : '#a1a1aa',
                        }}
                      >
                        {item.label}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Other Option in Pre Processing */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.65rem',
                  padding: '0.5rem 0.75rem',
                  border: preDeliverables.other ? '1px solid #09090b' : '1px solid #e4e4e7',
                  borderRadius: '4px',
                  backgroundColor: '#ffffff',
                }}
              >
                <div
                  onClick={() => togglePreDeliverable('other')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    cursor: 'pointer',
                    userSelect: 'none',
                  }}
                >
                  <div
                    style={{
                      width: '16px',
                      height: '16px',
                      borderRadius: '3px',
                      border: preDeliverables.other ? '1px solid #09090b' : '1.5px solid #a1a1aa',
                      backgroundColor: preDeliverables.other ? '#09090b' : '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {preDeliverables.other && <Check size={12} color="#ffffff" strokeWidth={3} />}
                  </div>
                  <span style={{ fontSize: '0.75rem', fontWeight: preDeliverables.other ? 700 : 500, color: '#09090b', whiteSpace: 'nowrap' }}>
                    Other
                  </span>
                </div>

                <input
                  type="text"
                  placeholder="Specify custom pre-processing output..."
                  value={preOtherText}
                  onChange={(e) => {
                    setPreOtherText(e.target.value);
                    if (!preDeliverables.other) {
                      setPreDeliverables((prev) => ({ ...prev, other: true }));
                    }
                  }}
                  className="form-input"
                  style={{
                    flex: 1,
                    fontSize: '0.75rem',
                    height: '28px',
                    padding: '0 0.5rem',
                    backgroundColor: preDeliverables.other ? '#ffffff' : '#fafafa',
                  }}
                />
              </div>
            </div>
          )}

          {/* ── 2. Post Processing Deliverables (Shown when Post Processing is checked) ── */}
          {optPostProcessing && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: optPreProcessing ? '0.75rem' : '0.25rem' }}>
              {(optPreProcessing && optPostProcessing) && (
                <span style={{ fontSize: '0.775rem', fontWeight: 700, color: '#09090b' }}>
                  Post-Processing Deliverables
                </span>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.5rem' }}>
                {POST_PROCESSING_DELIVERABLES.map((item) => {
                  const isChecked = !!postDeliverables[item.id];

                  return (
                    <div
                      key={item.id}
                      onClick={() => togglePostDeliverable(item.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.55rem',
                        padding: '0.55rem 0.65rem',
                        border: isChecked ? '1px solid #09090b' : '1px solid #e4e4e7',
                        borderRadius: '4px',
                        backgroundColor: '#ffffff',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        userSelect: 'none',
                      }}
                    >
                      <div
                        style={{
                          width: '16px',
                          height: '16px',
                          borderRadius: '3px',
                          border: isChecked ? '1px solid #09090b' : '1.5px solid #a1a1aa',
                          backgroundColor: isChecked ? '#09090b' : '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        {isChecked && <Check size={12} color="#ffffff" strokeWidth={3} />}
                      </div>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: isChecked ? 700 : 500,
                          color: '#09090b',
                        }}
                      >
                        {item.label}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Other Option in Post Processing */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.65rem',
                  padding: '0.5rem 0.75rem',
                  border: postDeliverables.other ? '1px solid #09090b' : '1px solid #e4e4e7',
                  borderRadius: '4px',
                  backgroundColor: '#ffffff',
                }}
              >
                <div
                  onClick={() => togglePostDeliverable('other')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    cursor: 'pointer',
                    userSelect: 'none',
                  }}
                >
                  <div
                    style={{
                      width: '16px',
                      height: '16px',
                      borderRadius: '3px',
                      border: postDeliverables.other ? '1px solid #09090b' : '1.5px solid #a1a1aa',
                      backgroundColor: postDeliverables.other ? '#09090b' : '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {postDeliverables.other && <Check size={12} color="#ffffff" strokeWidth={3} />}
                  </div>
                  <span style={{ fontSize: '0.75rem', fontWeight: postDeliverables.other ? 700 : 500, color: '#09090b', whiteSpace: 'nowrap' }}>
                    Other
                  </span>
                </div>

                <input
                  type="text"
                  placeholder="Specify custom deliverable..."
                  value={postOtherText}
                  onChange={(e) => {
                    setPostOtherText(e.target.value);
                    if (!postDeliverables.other) {
                      setPostDeliverables((prev) => ({ ...prev, other: true }));
                    }
                  }}
                  className="form-input"
                  style={{
                    flex: 1,
                    fontSize: '0.75rem',
                    height: '28px',
                    padding: '0 0.5rem',
                    backgroundColor: postDeliverables.other ? '#ffffff' : '#fafafa',
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Two Column Row: 5. Schedule & 6. KML / Boundary Upload ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '1.25rem',
        }}
      >
        {/* ── 5. Schedule ── */}
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
          <h2 className="wf-title" style={{ fontSize: '0.95rem', fontWeight: 700, color: '#09090b' }}>
            5. Schedule
          </h2>

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
                style={{
                  fontSize: '0.8rem',
                  height: '36px',
                  border: '1px solid #d4d4d8',
                  borderRadius: '4px',
                }}
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
                style={{
                  fontSize: '0.8rem',
                  height: '36px',
                  border: '1px solid #d4d4d8',
                  borderRadius: '4px',
                }}
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
              style={{
                fontSize: '0.8rem',
                height: '36px',
                backgroundColor: '#f4f4f5',
                color: '#52525b',
                fontWeight: 600,
                border: '1px solid #e4e4e7',
                borderRadius: '4px',
              }}
            />
          </div>
        </div>

        {/* ── 6. KML / Boundary Upload (Multiple Files) ── */}
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <h2 className="wf-title" style={{ fontSize: '0.95rem', fontWeight: 700, color: '#09090b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>6. KML / Boundary Upload</span>
                <span style={{ color: '#ef4444' }}>*</span>
                {(existingKmlFiles.length + kmlFiles.length) > 0 && (
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
                    {existingKmlFiles.length + kmlFiles.length} {existingKmlFiles.length + kmlFiles.length === 1 ? 'file' : 'files'}
                  </span>
                )}
              </h2>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                Upload multiple KML, KMZ, or GeoJSON boundary files of your area of interest.
              </p>
            </div>

            {(existingKmlFiles.length + kmlFiles.length) > 0 && (
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <button
                  type="button"
                  onClick={() => {
                    setKmlFiles([]);
                    setExistingKmlFiles([]);
                  }}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.7rem', padding: '0.25rem 0.55rem', height: '28px', color: '#dc2626' }}
                  title="Clear All Files"
                >
                  Clear All
                </button>
                <button
                  type="button"
                  onClick={() => kmlInputRef.current?.click()}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.7rem', padding: '0.25rem 0.65rem', height: '28px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                >
                  <Plus size={13} />
                  <span>Add More</span>
                </button>
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
              border: isDraggingKml ? '2px dashed #09090b' : '1.5px dashed #d4d4d8',
              borderRadius: '6px',
              padding: (existingKmlFiles.length + kmlFiles.length) > 0 ? '1rem 1.15rem' : '1.35rem 1.15rem',
              backgroundColor: isDraggingKml ? '#f4f4f5' : '#fafafa',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
              transition: 'all 0.15s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', minWidth: 0 }}>
              <UploadCloud size={26} color="#71717a" style={{ flexShrink: 0 }} />
              <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                <span
                  style={{
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    color: '#09090b',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {(existingKmlFiles.length + kmlFiles.length) > 0
                    ? `${existingKmlFiles.length + kmlFiles.length} boundary file(s) attached`
                    : 'Drag and drop multiple files here, or browse'}
                </span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                  Supports multiple KML, KMZ files up to 50MB each
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexShrink: 0 }}>
              <button
                type="button"
                onClick={() => kmlInputRef.current?.click()}
                className="btn btn-secondary"
                style={{
                  fontSize: '0.75rem',
                  padding: '0.35rem 0.85rem',
                  height: '32px',
                  fontWeight: 600,
                  backgroundColor: '#ffffff',
                  border: '1px solid #d4d4d8',
                }}
              >
                Browse Files
              </button>
              <input
                ref={kmlInputRef}
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
            </div>
          </div>

          {/* Attached KML Files List */}
          {(existingKmlFiles.length + kmlFiles.length) > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', marginTop: '0.2rem' }}>
              {existingKmlFiles.map((file, idx) => (
                <div
                  key={`existing-kml-${idx}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.5rem 0.75rem',
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '5px',
                    fontSize: '0.775rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', minWidth: 0 }}>
                    <Paperclip size={14} color="#64748b" style={{ flexShrink: 0 }} />
                    <span style={{ fontWeight: 600, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {file.name}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                      {file.size || 'Existing File'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveExistingKmlFile(idx)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: '#94a3b8' }}
                    title="Remove file"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}

              {kmlFiles.map((file, idx) => (
                <div
                  key={`new-kml-${idx}`}
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
                      {formatFileSize(file.size)} • Ready to upload
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
      </div>

      {/* ── Two Column Row: 7. Scope Document & 8. Remarks / Instructions ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '1.25rem',
        }}
      >
        {/* ── 7. Scope Document (Multiple Files) ── */}
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <h2 className="wf-title" style={{ fontSize: '0.95rem', fontWeight: 700, color: '#09090b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>7. Scope Document</span>
                <span style={{ color: '#ef4444' }}>*</span>
                {(existingScopeFiles.length + scopeFiles.length) > 0 && (
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
                    {existingScopeFiles.length + scopeFiles.length} {existingScopeFiles.length + scopeFiles.length === 1 ? 'doc' : 'docs'}
                  </span>
                )}
              </h2>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                Upload scope of work, survey specifications, or reference docs.
              </p>
            </div>

            {(existingScopeFiles.length + scopeFiles.length) > 0 && (
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <button
                  type="button"
                  onClick={() => {
                    setScopeFiles([]);
                    setExistingScopeFiles([]);
                  }}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.7rem', padding: '0.25rem 0.55rem', height: '28px', color: '#dc2626' }}
                  title="Clear All Documents"
                >
                  Clear All
                </button>
                <button
                  type="button"
                  onClick={() => scopeInputRef.current?.click()}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.7rem', padding: '0.25rem 0.65rem', height: '28px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                >
                  <Plus size={13} />
                  <span>Add More</span>
                </button>
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
              border: isDraggingScope ? '2px dashed #09090b' : '1.5px dashed #d4d4d8',
              borderRadius: '6px',
              padding: (existingScopeFiles.length + scopeFiles.length) > 0 ? '1rem 1.15rem' : '1.35rem 1.15rem',
              backgroundColor: isDraggingScope ? '#f4f4f5' : '#fafafa',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
              transition: 'all 0.15s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', minWidth: 0 }}>
              <UploadCloud size={26} color="#71717a" style={{ flexShrink: 0 }} />
              <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                <span
                  style={{
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    color: '#09090b',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {(existingScopeFiles.length + scopeFiles.length) > 0
                    ? `${existingScopeFiles.length + scopeFiles.length} document(s) attached`
                    : 'Drag and drop multiple documents here, or browse'}
                </span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                  Supports PDF, DOC, DOCX, XLS, XLSX up to 50MB each
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexShrink: 0 }}>
              <button
                type="button"
                onClick={() => scopeInputRef.current?.click()}
                className="btn btn-secondary"
                style={{
                  fontSize: '0.75rem',
                  padding: '0.35rem 0.85rem',
                  height: '32px',
                  fontWeight: 600,
                  backgroundColor: '#ffffff',
                  border: '1px solid #d4d4d8',
                }}
              >
                Browse Files
              </button>
              <input
                ref={scopeInputRef}
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
            </div>
          </div>

          {/* Attached Scope Documents List */}
          {(existingScopeFiles.length + scopeFiles.length) > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', marginTop: '0.2rem' }}>
              {existingScopeFiles.map((file, idx) => (
                <div
                  key={`existing-scope-${idx}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.5rem 0.75rem',
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '5px',
                    fontSize: '0.775rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', minWidth: 0 }}>
                    <FileText size={14} color="#64748b" style={{ flexShrink: 0 }} />
                    <span style={{ fontWeight: 600, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {file.name}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                      {file.size || 'Existing Document'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveExistingScopeFile(idx)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: '#94a3b8' }}
                    title="Remove document"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}

              {scopeFiles.map((file, idx) => (
                <div
                  key={`new-scope-${idx}`}
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
                      {formatFileSize(file.size)} • Ready to upload
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

        {/* ── 8. Remarks / Instructions (Optional) ── */}
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
              8. Remarks / Instructions
            </h2>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
              Provide any specific instructions or additional information (Optional).
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
              style={{
                fontSize: '0.8rem',
                resize: 'vertical',
                width: '100%',
                padding: '0.75rem',
                paddingBottom: '1.75rem',
                border: '1px solid #d4d4d8',
                borderRadius: '6px',
                fontFamily: 'inherit',
                outline: 'none',
              }}
            />
            <span
              style={{
                position: 'absolute',
                bottom: '10px',
                right: '12px',
                fontSize: '0.7rem',
                color: 'var(--text-muted)',
                fontWeight: 500,
                pointerEvents: 'none',
              }}
            >
              {remarks.length}/1000
            </span>
          </div>
        </div>
      </div>

      {/* ── Bottom Action & Confirmation Bar ── */}
      <div
        className="wf-card"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          padding: '1rem 1.25rem',
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          border: '1px solid #e4e4e7',
          marginTop: '0.25rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.775rem', color: '#09090b' }}>
          <Info size={16} color="#09090b" style={{ flexShrink: 0 }} />
          <span>Please review all details before submitting. You can save as draft and submit later.</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={isSavingDraft || isSubmitting}
            className="btn btn-secondary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              height: '38px',
              fontSize: '0.8rem',
              fontWeight: 600,
              padding: '0 1rem',
              backgroundColor: '#ffffff',
              border: '1px solid #d4d4d8',
              cursor: isSavingDraft || isSubmitting ? 'not-allowed' : 'pointer',
            }}
          >
            {isSavingDraft ? (
              <>
                <Loader2 size={15} className="animate-spin" /> Saving Draft...
              </>
            ) : (
              <>
                <FileText size={15} /> Save Draft
              </>
            )}
          </button>
          <button
            type="submit"
            disabled={isSubmitting || isSavingDraft}
            className="btn btn-primary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              height: '38px',
              fontSize: '0.8rem',
              fontWeight: 700,
              padding: '0 1.15rem',
              backgroundColor: '#09090b',
              color: '#ffffff',
            }}
          >
            {isSubmitting ? (
              'Submitting...'
            ) : (
              <>
                <Send size={14} /> {isRevision ? 'Submit Request Revision' : 'Submit Request'}
              </>
            )}
          </button>
        </div>
      </div>
    </form>
  );
}
