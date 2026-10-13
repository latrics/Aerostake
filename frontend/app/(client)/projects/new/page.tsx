'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ChevronLeft,
  FileText,
  Send,
  X,
  FileCheck,
  AlertCircle,
  Check,
  Loader2,
  Lock,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { projectApi } from '@/modules/projects/api';
import { ProjectStatus } from '@/modules/projects/types';
import { usersApi } from '@/modules/users/api';
import { UserProfile } from '@/modules/users/types';
import { readFileAsDataUrl } from '@/lib/document-utils';
import { PageHeader } from '@/components/PageHeader';

import {
  PayloadType,
  formatFileSize,
} from '@/modules/projects/new-project-constants';

import { ProjectBasicInfoSection } from '@/modules/projects/components/new-project/ProjectBasicInfoSection';
import { ProjectContactAndTeamSection } from '@/modules/projects/components/new-project/ProjectContactAndTeamSection';
import { ProjectPayloadSensorSection } from '@/modules/projects/components/new-project/ProjectPayloadSensorSection';
import { ProjectDeliverablesSection } from '@/modules/projects/components/new-project/ProjectDeliverablesSection';
import { ProjectScheduleSection } from '@/modules/projects/components/new-project/ProjectScheduleSection';
import { ProjectBoundaryUploadSection } from '@/modules/projects/components/new-project/ProjectBoundaryUploadSection';
import { ProjectScopeDocumentSection } from '@/modules/projects/components/new-project/ProjectScopeDocumentSection';
import { ProjectRemarksSection } from '@/modules/projects/components/new-project/ProjectRemarksSection';
import { ProjectFormBottomBar } from '@/modules/projects/components/new-project/ProjectFormBottomBar';

function ClientNewProjectRequestPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawDraftId = searchParams?.get('draftId') || '';
  const rawProjectId = searchParams?.get('projectId') || searchParams?.get('requestId') || searchParams?.get('id') || searchParams?.get('edit') || rawDraftId;
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
  const [requestedAreaSqKm, setRequestedAreaSqKm] = useState('');
  const [airspaceZone, setAirspaceZone] = useState<string>('Green Zone');
  const [manageFlightPermissions, setManageFlightPermissions] = useState<boolean>(false);

  const isSubClient = user?.role === 'client_sub' || user?.role?.toString() === 'client_sub';
  const isPilot = user?.role === 'pilot' || user?.role?.toString().toLowerCase() === 'pilot';
  const [loadedProjectStatus, setLoadedProjectStatus] = useState<string>('');
  const isSubmittedOrExistingProject = Boolean(
    ((searchParams?.get('projectId') || searchParams?.get('requestId') || searchParams?.get('id')) && !searchParams?.get('draftId')) ||
    (loadedProjectStatus && loadedProjectStatus !== 'draft')
  );
  const isReadOnly = isPilot || isSubmittedOrExistingProject;
  const isStage1Passed = isSubmittedOrExistingProject;

  // Project Communication Contacts - Dynamically fetched from company profile authenticated members
  const [orgMembers, setOrgMembers] = useState<UserProfile[]>([]);
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);

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

  // 2. Contact Information State - Primary contact is ALWAYS the Primary Client's details
  const [companyName, setCompanyName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [primaryEmail, setPrimaryEmail] = useState('');
  const [phoneCode, setPhoneCode] = useState('+91');
  const [phoneNumber, setPhoneNumber] = useState('');

  // Primary contact must ALWAYS reflect the Primary Client (organization owner)
  useEffect(() => {
    if (!user || isRevision || isDraftMode) return;

    const parsePhoneNumber = (raw: string) => {
      if (!raw) return { code: '+91', number: '' };
      const trimmed = raw.trim();
      const codes = ['+91', '+971', '+61', '+65', '+44', '+1'];
      for (const c of codes) {
        if (trimmed.startsWith(c)) {
          return { code: c, number: trimmed.slice(c.length).trim() };
        }
      }
      const parts = trimmed.split(' ');
      if (parts.length > 1 && parts[0].startsWith('+')) {
        return { code: parts[0], number: parts.slice(1).join(' ') };
      }
      return { code: '+91', number: trimmed };
    };

    const isSub = user.role === 'client_sub' || user.role?.toString() === 'client_sub';
    const cpPrimary = user.company_profile?.primary_contact;
    const primaryMember = orgMembers.find(
      (m) => m.role === 'client_primary' || m.role === 'client'
    );

    setCompanyName(user.company_name || user.company_profile?.company_name || '');

    if (isSub) {
      const targetName = cpPrimary?.full_name || primaryMember?.full_name || 'Primary Client';
      const targetEmail = cpPrimary?.email || primaryMember?.email || '';
      const targetPhone = cpPrimary?.phone_number || primaryMember?.phone_number || '';

      setOwnerName(targetName);
      setPrimaryEmail(targetEmail);
      const parsed = parsePhoneNumber(targetPhone);
      setPhoneCode(parsed.code);
      setPhoneNumber(parsed.number);
    } else {
      setOwnerName(user.full_name || cpPrimary?.full_name || '');
      setPrimaryEmail(user.email || cpPrimary?.email || '');
      const rawPhone = user.phone_number || cpPrimary?.phone_number || '';
      const parsed = parsePhoneNumber(rawPhone);
      setPhoneCode(parsed.code);
      setPhoneNumber(parsed.number);
    }
  }, [user, orgMembers, isRevision, isDraftMode]);

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
      if (reqPayload.requested_area_sqkm || reqPayload.target_area_sqkm) {
        setRequestedAreaSqKm(String(reqPayload.requested_area_sqkm || reqPayload.target_area_sqkm));
      }
      if (Array.isArray(reqPayload.airspace_zones) && reqPayload.airspace_zones.length > 0) {
        setAirspaceZone(reqPayload.airspace_zones[0]);
      } else if (typeof reqPayload.airspace_zone === 'string' && reqPayload.airspace_zone) {
        setAirspaceZone(reqPayload.airspace_zone);
      }
      if (typeof reqPayload.latrics_manage_permissions === 'boolean') {
        setManageFlightPermissions(reqPayload.latrics_manage_permissions);
      } else if (typeof reqPayload.manage_flight_permissions === 'boolean') {
        setManageFlightPermissions(reqPayload.manage_flight_permissions);
      }

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

      if (Array.isArray(reqPayload.payload_sensors) && reqPayload.payload_sensors.length > 0) {
        setSelectedPayloads(reqPayload.payload_sensors);
      } else if (reqPayload.payload_sensor) {
        const raw = String(reqPayload.payload_sensor).toLowerCase();
        const valid: PayloadType[] = [];
        if (raw.includes('61mp')) valid.push('61mp_camera');
        if (raw.includes('lidar')) valid.push('lidar');
        if (raw.includes('oblique')) valid.push('oblique_camera');
        setSelectedPayloads(valid.length > 0 ? valid : ['61mp_camera']);
      }

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

      if (!targetId && typeof window !== 'undefined') {
        try {
          const cachedStr = localStorage.getItem('latrics_project_draft');
          if (cachedStr) {
            const cachedData = JSON.parse(cachedStr);
            if (cachedData) {
              if (cachedData.draftId) {
                targetId = cachedData.draftId;
              }
              hydrateFromPayload(cachedData.projectName || '', cachedData, cachedData.draftId);
            }
          }
        } catch (e) {
          console.error('Error reading localStorage draft', e);
        }
      }

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

      if (targetId) {
        try {
          const proj = await projectApi.getProject(targetId);
          if (!isMounted || !proj) return;
          setLoadedProjectStatus(proj.status || '');
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

  // 3. Payload / Sensor State
  const [selectedPayloads, setSelectedPayloads] = useState<PayloadType[]>(['61mp_camera']);

  const togglePayload = (payload: PayloadType) => {
    if (isReadOnly) return;
    setSelectedPayloads((prev) => {
      if (prev.includes(payload)) {
        if (prev.length <= 1) return prev;
        return prev.filter((p) => p !== payload);
      } else {
        return [...prev, payload];
      }
    });
  };

  // 4. Deliverables State
  const [optPreProcessing, setOptPreProcessing] = useState<boolean>(false);
  const [optPostProcessing, setOptPostProcessing] = useState<boolean>(true);

  const [preDeliverables, setPreDeliverables] = useState<Record<string, boolean>>({
    geo_tagged_image: true,
    event_files: true,
    point_cloud: false,
    trajectory_files: false,
    other: false,
  });
  const [preOtherText, setPreOtherText] = useState('');

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

  useEffect(() => {
    const hasLidar = selectedPayloads.includes('lidar');
    if (!hasLidar) {
      setPreDeliverables((prev) => ({
        ...prev,
        geo_tagged_image: prev.geo_tagged_image ?? true,
        event_files: prev.event_files ?? true,
        point_cloud: false,
        trajectory_files: false,
      }));
    } else {
      setPreDeliverables((prev) => ({
        ...prev,
        geo_tagged_image: prev.geo_tagged_image ?? true,
        event_files: prev.event_files ?? true,
        point_cloud: prev.point_cloud ?? true,
        trajectory_files: prev.trajectory_files ?? true,
      }));
    }
  }, [selectedPayloads]);

  const isPreDeliverableEnabled = (id: string): boolean => {
    if (id === 'geo_tagged_image' || id === 'event_files' || id === 'other') {
      return true;
    }
    if (id === 'point_cloud' || id === 'trajectory_files') {
      return selectedPayloads.includes('lidar');
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

  // 6. KML & Scope Files State
  const [kmlFiles, setKmlFiles] = useState<File[]>([]);
  const [existingKmlFiles, setExistingKmlFiles] = useState<Array<{ name: string; size?: string; dataUrl?: string }>>([]);

  const [scopeFiles, setScopeFiles] = useState<File[]>([]);
  const [existingScopeFiles, setExistingScopeFiles] = useState<Array<{ name: string; size?: string; dataUrl?: string }>>([]);

  const [fileDataUrls, setFileDataUrls] = useState<Record<string, string>>({});

  const handleAddKmlFiles = async (newFiles: FileList | File[]) => {
    const incoming = Array.from(newFiles);
    const results = await Promise.all(
      incoming.map(async (f) => {
        let dUrl = '';
        try {
          dUrl = await readFileAsDataUrl(f);
        } catch {}
        return { name: f.name, dUrl };
      })
    );
    setFileDataUrls((prev) => {
      const updated = { ...prev };
      results.forEach((r) => {
        if (r.dUrl) updated[r.name] = r.dUrl;
      });
      return updated;
    });
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

  const handleAddScopeFiles = async (newFiles: FileList | File[]) => {
    const incoming = Array.from(newFiles);
    const results = await Promise.all(
      incoming.map(async (f) => {
        let dUrl = '';
        try {
          dUrl = await readFileAsDataUrl(f);
        } catch {}
        return { name: f.name, dUrl };
      })
    );
    setFileDataUrls((prev) => {
      const updated = { ...prev };
      results.forEach((r) => {
        if (r.dUrl) updated[r.name] = r.dUrl;
      });
      return updated;
    });
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

  // 8. Remarks State
  const [remarks, setRemarks] = useState('');

  // UI status state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [draftToast, setDraftToast] = useState(false);
  const [draftSavedMessage, setDraftSavedMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleAddContact = (name: string) => {
    const trimmed = name.trim();
    if (trimmed && !selectedContacts.includes(trimmed)) {
      setSelectedContacts([...selectedContacts, trimmed]);
    }
  };

  const handleRemoveContact = (name: string) => {
    setSelectedContacts(selectedContacts.filter((c) => c !== name));
  };

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

  const handleSaveDraft = async () => {
    if (isPilot || isStage1Passed) return;
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
        payload_sensor: selectedPayloads.join(', '),
        payload_sensors: selectedPayloads,
        airspace_zone: airspaceZone,
        airspace_zones: [airspaceZone],
        latrics_manage_permissions: manageFlightPermissions,
        manage_flight_permissions: manageFlightPermissions,
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
            dataUrl: fileDataUrls[f.name],
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
            category: 'Scope',
            date: new Date().toISOString().split('T')[0],
            dataUrl: fileDataUrls[f.name],
          })),
        ],
        remarks,
        requested_area_sqkm: requestedAreaSqKm ? parseFloat(requestedAreaSqKm) : null,
      };

      const finalSurveyLocation = trimmedAddress || (trimmedCity && trimmedState ? `${trimmedCity}, ${trimmedState}` : 'Specified in Scope');
      const areaNum = requestedAreaSqKm ? parseFloat(requestedAreaSqKm) : 10;

      let savedId = currentDraftId;
      if (savedId) {
        await projectApi.updateProject(savedId, {
          title: projectName.trim() || 'Untitled Draft Request',
          description: remarks.trim() || '',
          survey_location: finalSurveyLocation,
          survey_type: selectedPayloads.join(', ') || '61mp_camera',
          target_area_sqkm: areaNum,
          requirements_payload: payloadPayload,
        });
      } else {
        const created = await projectApi.createProject({
          title: projectName.trim() || 'Untitled Draft Request',
          description: remarks.trim() || '',
          survey_location: finalSurveyLocation,
          survey_type: selectedPayloads.join(', ') || '61mp_camera',
          target_area_sqkm: areaNum,
          requirements_payload: payloadPayload,
          status: ProjectStatus.DRAFT,
        });
        if (created?.id) {
          savedId = created.id;
          setCurrentDraftId(created.id);
          setIsDraftMode(true);
          if (typeof window !== 'undefined') {
            window.history.replaceState(null, '', `?draftId=${created.id}`);
          }
        }
      }

      if (typeof window !== 'undefined') {
        const draftData = {
          draftId: savedId,
          projectName: projectName.trim(),
          ...payloadPayload,
          updatedAt: new Date().toISOString(),
        };
        localStorage.setItem('latrics_project_draft', JSON.stringify(draftData));
      }

      setDraftSavedMessage('Draft saved successfully to database. You can return anytime to continue.');
      setDraftToast(true);
      setTimeout(() => setDraftToast(false), 5000);
    } catch (err: any) {
      console.error('Failed to save draft:', err);
      setErrorMessage('Failed to save draft to database. Please check your connection.');
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (isReadOnly) return;

    if (!projectName.trim()) {
      setErrorMessage('Project Name is required.');
      return;
    }
    if (!locationAddress.trim()) {
      setErrorMessage('Physical site address is required.');
      return;
    }
    if (!city.trim() || !state) {
      setErrorMessage('City and State are required.');
      return;
    }
    if (!requestedAreaSqKm || parseFloat(requestedAreaSqKm) <= 0) {
      setErrorMessage('Requested scanning area (sq. km) is required and must be greater than 0.');
      return;
    }
    if (selectedPayloads.length === 0) {
      setErrorMessage('Please select at least one payload/sensor.');
      return;
    }
    if (!startDate || !endDate) {
      setErrorMessage('Expected start and end dates are required.');
      return;
    }
    if (new Date(startDate) > new Date(endDate)) {
      setErrorMessage('End date must be on or after the start date.');
      return;
    }
    if (existingKmlFiles.length === 0 && kmlFiles.length === 0) {
      setErrorMessage('Please upload at least one KML, KMZ, or GeoJSON boundary file.');
      return;
    }
    if (existingScopeFiles.length === 0 && scopeFiles.length === 0) {
      setErrorMessage('Please upload at least one Scope Document file (PDF, DOC, DOCX, or Excel).');
      return;
    }
    if (selectedContacts.length === 0) {
      setErrorMessage('Please select at least one project communication contact from your organization.');
      return;
    }

    if (!optPreProcessing && !optPostProcessing) {
      setErrorMessage('Please select at least one processing type (Pre Processing, Post Processing, or Both).');
      return;
    }

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
        payload_sensor: selectedPayloads.join(', '),
        payload_sensors: selectedPayloads,
        airspace_zone: airspaceZone,
        airspace_zones: [airspaceZone],
        latrics_manage_permissions: manageFlightPermissions,
        manage_flight_permissions: manageFlightPermissions,
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
            dataUrl: fileDataUrls[f.name],
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
            category: 'Scope',
            date: new Date().toISOString().split('T')[0],
            dataUrl: fileDataUrls[f.name],
          })),
        ],
        remarks,
        requested_area_sqkm: parseFloat(requestedAreaSqKm),
      };

      const finalSurveyLocation = `${trimmedAddress}, ${trimmedCity}, ${trimmedState}`;
      const areaNum = parseFloat(requestedAreaSqKm);

      if (isRevision && projectId) {
        await projectApi.updateProject(projectId, {
          title: projectName.trim(),
          description: remarks.trim() || '',
          survey_location: finalSurveyLocation,
          survey_type: selectedPayloads.join(', ') || '61mp_camera',
          target_area_sqkm: areaNum,
          requirements_payload: payloadPayload,
        });

        setSuccessMessage('Project Request revision submitted successfully!');
        setTimeout(() => {
          router.push(`/projects/${projectId}/overview`);
        }, 1500);
      } else if (isDraftMode && currentDraftId) {
        await projectApi.updateProject(currentDraftId, {
          title: projectName.trim(),
          description: remarks.trim() || '',
          survey_location: finalSurveyLocation,
          survey_type: selectedPayloads.join(', ') || '61mp_camera',
          target_area_sqkm: areaNum,
          requirements_payload: payloadPayload,
          status: ProjectStatus.SUBMITTED,
        });

        if (typeof window !== 'undefined') {
          localStorage.removeItem('latrics_project_draft');
        }

        setSuccessMessage('Draft submitted as formal project request! Redirecting to requests...');
        setTimeout(() => {
          router.push('/requests');
        }, 1500);
      } else {
        await projectApi.createProject({
          title: projectName.trim(),
          description: remarks.trim() || '',
          survey_location: finalSurveyLocation,
          survey_type: selectedPayloads.join(', ') || '61mp_camera',
          target_area_sqkm: areaNum,
          requirements_payload: payloadPayload,
        });

        if (typeof window !== 'undefined') {
          localStorage.removeItem('latrics_project_draft');
        }

        setSuccessMessage('New Request submitted successfully! Redirecting to requests...');
        setTimeout(() => {
          router.push('/requests');
        }, 1500);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to submit project request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const allContactOptions = useMemo(() => {
    const list: Array<{
      id: string;
      name: string;
      email: string;
      phone: string;
      designation: string;
      isPrimary: boolean;
    }> = [];

    orgMembers.forEach((m) => {
      const isPrimary = m.role === 'client_primary' || m.role === 'client';
      list.push({
        id: m.id || m.email,
        name: m.full_name || m.email,
        email: m.email,
        phone: m.phone_number || '',
        designation: m.designation || (isPrimary ? 'Primary Client' : 'Team Member'),
        isPrimary,
      });
    });

    const cpPrimary = user?.company_profile?.primary_contact;
    if (
      cpPrimary &&
      cpPrimary.email &&
      !list.some((c) => c.email.toLowerCase() === cpPrimary.email.toLowerCase())
    ) {
      list.unshift({
        id: cpPrimary.email,
        name: cpPrimary.full_name || cpPrimary.email,
        email: cpPrimary.email,
        phone: cpPrimary.phone_number || '',
        designation: cpPrimary.department || 'Primary Client',
        isPrimary: true,
      });
    }

    const cpTeam = user?.company_profile?.team_members as any[];
    if (Array.isArray(cpTeam)) {
      cpTeam.forEach((tm) => {
        if (tm.email && !list.some((c) => c.email.toLowerCase() === tm.email.toLowerCase())) {
          list.push({
            id: tm.id ? String(tm.id) : tm.email,
            name: tm.full_name || tm.email,
            email: tm.email,
            phone: tm.phone_number || '',
            designation: tm.department || 'Team Member',
            isPrimary: false,
          });
        }
      });
    }

    return list;
  }, [orgMembers, user]);

  const getContactProfile = (contactKey: string) => {
    const trimmed = contactKey.trim().toLowerCase();
    const member = orgMembers.find(
      (m) =>
        m.id === contactKey ||
        (m.full_name && m.full_name.trim().toLowerCase() === trimmed) ||
        (m.email && m.email.trim().toLowerCase() === trimmed)
    );
    const cpPrimary = user?.company_profile?.primary_contact;
    const isCpPrimary =
      cpPrimary &&
      ((cpPrimary.full_name && cpPrimary.full_name.trim().toLowerCase() === trimmed) ||
        (cpPrimary.email && cpPrimary.email.trim().toLowerCase() === trimmed));

    const tm = (user?.company_profile?.team_members as any[])?.find(
      (t: any) =>
        (t.full_name && t.full_name.trim().toLowerCase() === trimmed) ||
        (t.email && t.email.trim().toLowerCase() === trimmed)
    );

    const isCurrentUser =
      user &&
      ((user.full_name && user.full_name.trim().toLowerCase() === trimmed) ||
        (user.email && user.email.trim().toLowerCase() === trimmed));

    const isPrimary =
      member?.role === 'client_primary' ||
      member?.role === 'client' ||
      isCpPrimary ||
      (!isSubClient && isCurrentUser);

    const roleLabel = isPrimary
      ? 'Primary Client'
      : member?.role === 'client_sub' || (isSubClient && isCurrentUser)
      ? 'Subordinate Member'
      : 'Team Member';

    return {
      name:
        member?.full_name ||
        (isCpPrimary ? cpPrimary?.full_name : null) ||
        (isCurrentUser ? user?.full_name : null) ||
        tm?.full_name ||
        contactKey,
      email:
        member?.email ||
        (isCpPrimary ? cpPrimary?.email : null) ||
        (isCurrentUser ? user?.email : null) ||
        tm?.email ||
        '—',
      phone:
        member?.phone_number ||
        (isCpPrimary ? cpPrimary?.phone_number : null) ||
        (isCurrentUser ? user?.phone_number : null) ||
        tm?.phone_number ||
        'Not provided',
      designation:
        member?.designation ||
        (isCpPrimary ? cpPrimary?.department : null) ||
        (isCurrentUser ? user?.designation : null) ||
        tm?.department ||
        roleLabel,
      role: member?.role || (isPrimary ? 'client_primary' : 'client_sub'),
      isPrimary,
    };
  };

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
      {/* ── Page Header ── */}
      <PageHeader
        title={isRevision ? 'Revise Project Request' : isDraftMode ? 'Edit Draft Request' : 'New Project Request'}
        subtitle={
          isRevision
            ? 'Update survey specifications, sensors, or requirements. Submitting will create an updated revision for Latrics review.'
            : isDraftMode
            ? 'Resume and update your saved draft request. All your previously saved details and documents are loaded.'
            : 'Submit a new survey / mapping request. All fields marked with * are required.'
        }
        breadcrumbs={
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Link
              href="/projects"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.2rem',
                color: '#71717a',
                textDecoration: 'none',
              }}
            >
              <ChevronLeft size={14} /> Projects
            </Link>
            <span style={{ color: 'var(--text-muted)' }}>/</span>
            {isRevision && (
              <>
                <Link
                  href={`/projects/${projectId}/overview`}
                  style={{
                    color: '#71717a',
                    textDecoration: 'none',
                  }}
                >
                  {projectName || 'Project'}
                </Link>
                <span style={{ color: 'var(--text-muted)' }}>/</span>
              </>
            )}
            <span style={{ color: '#09090b', fontWeight: 600 }}>
              {isRevision ? 'Revise Request' : isDraftMode ? 'Edit Draft' : 'New Request'}
            </span>
          </div>
        }
      >
        {isReadOnly ? (
          <button
            type="button"
            onClick={() => router.push(projectId ? `/projects/${projectId}/overview` : '/projects')}
            className="btn btn-secondary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              height: '36px',
              fontSize: '0.8rem',
              fontWeight: 600,
              padding: '0 0.95rem',
              backgroundColor: '#ffffff',
              border: '1px solid #d4d4d8',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
          >
            ← Back to Project Overview
          </button>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={isSavingDraft || isSubmitting}
              className="btn btn-secondary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                height: '36px',
                fontSize: '0.8rem',
                fontWeight: 600,
                padding: '0 0.95rem',
                backgroundColor: '#ffffff',
                border: '1px solid #d4d4d8',
                borderRadius: '6px',
                cursor: isSavingDraft || isSubmitting ? 'not-allowed' : 'pointer',
              }}
            >
              {isSavingDraft ? (
                <>
                  <Loader2 size={14} className="animate-spin" /> Saving Draft...
                </>
              ) : (
                <>
                  <FileText size={14} /> Save Draft
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
                height: '36px',
                fontSize: '0.8rem',
                fontWeight: 700,
                padding: '0 1.15rem',
                borderRadius: '6px',
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
        )}
      </PageHeader>

      {/* ── Sealed or Pilot Read-Only Banner ── */}
      {isReadOnly ? (
        <div
          style={{
            padding: '0.75rem 1rem',
            backgroundColor: '#fafafa',
            border: '1px solid #d4d4d8',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.8rem',
            color: '#18181b',
            fontWeight: 600,
          }}
        >
          <Lock size={15} color="#09090b" style={{ flexShrink: 0 }} />
          <span>
            <strong>Stage 1 Request Sealed (Read-Only):</strong> This survey request has been submitted and sealed. All parameters, boundaries, and deliverables are permanently locked as an immutable audit record.
          </span>
        </div>
      ) : isPilot ? (
        <div
          style={{
            padding: '0.75rem 1rem',
            backgroundColor: '#f4f4f5',
            border: '1px solid #d4d4d8',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.8rem',
            color: '#18181b',
          }}
        >
          <Lock size={15} color="#71717a" style={{ flexShrink: 0 }} />
          <span>
            <strong>Pilot View-Only Mode:</strong> Drone pilots have read-only access to survey request parameters. Modifying or submitting request specifications is restricted.
          </span>
        </div>
      ) : null}

      {/* ── Active Draft Restored Banner ── */}
      {isDraftMode && !isRevision && (
        <div
          style={{
            padding: '0.75rem 1rem',
            backgroundColor: '#fafafa',
            border: '1px solid #d4d4d8',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.8rem',
            color: '#27272a',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileText size={15} color="#09090b" />
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
              color: '#09090b',
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
          <Check size={18} /> {successMessage}
        </div>
      )}

      <fieldset disabled={isReadOnly} style={{ border: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '1.25rem', pointerEvents: isReadOnly ? 'none' : 'auto' }}>
        {/* ── 1. Project Details ── */}
        <ProjectBasicInfoSection
          projectName={projectName}
          setProjectName={setProjectName}
          locationAddress={locationAddress}
          setLocationAddress={setLocationAddress}
          city={city}
          setCity={setCity}
          state={state}
          setState={setState}
          requestedAreaSqKm={requestedAreaSqKm}
          setRequestedAreaSqKm={setRequestedAreaSqKm}
          isReadOnly={isReadOnly}
        />

        {/* ── 2. Contact Information ── */}
        <ProjectContactAndTeamSection
          ownerName={ownerName}
          setOwnerName={setOwnerName}
          primaryEmail={primaryEmail}
          setPrimaryEmail={setPrimaryEmail}
          phoneCode={phoneCode}
          setPhoneCode={setPhoneCode}
          phoneNumber={phoneNumber}
          setPhoneNumber={setPhoneNumber}
          companyName={companyName}
          isSubClient={isSubClient}
          selectedContacts={selectedContacts}
          onAddContact={handleAddContact}
          onRemoveContact={handleRemoveContact}
          allContactOptions={allContactOptions}
          isLoadingMembers={isLoadingMembers}
          getContactProfile={getContactProfile}
          isReadOnly={isReadOnly}
        />

        {/* ── Two Column Row: 3. Payload / Sensor & 4. Deliverables ── */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '1.25rem',
          }}
        >
          {/* ── 3. Payload / Sensor ── */}
          <ProjectPayloadSensorSection
            selectedPayloads={selectedPayloads}
            togglePayload={togglePayload}
            airspaceZone={airspaceZone}
            setAirspaceZone={setAirspaceZone}
            manageFlightPermissions={manageFlightPermissions}
            setManageFlightPermissions={setManageFlightPermissions}
            isReadOnly={isReadOnly}
          />

          {/* ── 4. Deliverables ── */}
          <ProjectDeliverablesSection
            optPreProcessing={optPreProcessing}
            setOptPreProcessing={setOptPreProcessing}
            optPostProcessing={optPostProcessing}
            setOptPostProcessing={setOptPostProcessing}
            preDeliverables={preDeliverables}
            togglePreDeliverable={togglePreDeliverable}
            isPreDeliverableEnabled={isPreDeliverableEnabled}
            preOtherText={preOtherText}
            setPreOtherText={setPreOtherText}
            setPreDeliverables={setPreDeliverables}
            postDeliverables={postDeliverables}
            togglePostDeliverable={togglePostDeliverable}
            postOtherText={postOtherText}
            setPostOtherText={setPostOtherText}
            setPostDeliverables={setPostDeliverables}
            isReadOnly={isReadOnly}
          />
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
          <ProjectScheduleSection
            startDate={startDate}
            onStartDateChange={handleStartDateChange}
            endDate={endDate}
            onEndDateChange={handleEndDateChange}
            tenureDays={tenureDays}
            isReadOnly={isReadOnly}
          />

          {/* ── 6. KML / Boundary Upload ── */}
          <ProjectBoundaryUploadSection
            kmlFiles={kmlFiles}
            existingKmlFiles={existingKmlFiles}
            onAddKmlFiles={handleAddKmlFiles}
            onRemoveKmlFile={handleRemoveKmlFile}
            onRemoveExistingKmlFile={handleRemoveExistingKmlFile}
            onClearAllKmlFiles={() => {
              setKmlFiles([]);
              setExistingKmlFiles([]);
            }}
            isReadOnly={isReadOnly}
          />
        </div>

        {/* ── Two Column Row: 7. Scope Document & 8. Remarks / Instructions ── */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '1.25rem',
          }}
        >
          {/* ── 7. Scope Document ── */}
          <ProjectScopeDocumentSection
            scopeFiles={scopeFiles}
            existingScopeFiles={existingScopeFiles}
            onAddScopeFiles={handleAddScopeFiles}
            onRemoveScopeFile={handleRemoveScopeFile}
            onRemoveExistingScopeFile={handleRemoveExistingScopeFile}
            onClearAllScopeFiles={() => {
              setScopeFiles([]);
              setExistingScopeFiles([]);
            }}
            isReadOnly={isReadOnly}
          />

          {/* ── 8. Remarks / Instructions ── */}
          <ProjectRemarksSection
            remarks={remarks}
            setRemarks={setRemarks}
            isReadOnly={isReadOnly}
          />
        </div>
      </fieldset>

      {/* ── Bottom Action & Confirmation Bar ── */}
      <ProjectFormBottomBar
        isReadOnly={isReadOnly}
        isSavingDraft={isSavingDraft}
        isSubmitting={isSubmitting}
        isRevision={isRevision}
        onSaveDraft={handleSaveDraft}
        onBack={() => router.push(projectId ? `/projects/${projectId}/overview` : '/projects')}
      />
    </form>
  );
}

export default function ClientNewProjectRequestPage() {
  return (
    <Suspense
      fallback={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
          <Loader2 size={32} className="animate-spin" color="#09090b" />
        </div>
      }
    >
      <ClientNewProjectRequestPageContent />
    </Suspense>
  );
}
