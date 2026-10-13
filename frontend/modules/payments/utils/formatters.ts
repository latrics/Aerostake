import { Project } from '@/modules/projects/types';
import { formatDateDDMMYYYY } from '@/lib/date';

export const formatCurrency = (amount: number): string => {
  return `₹${Math.abs(amount).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

export const formatDate = (dateStr?: string | null): string => {
  return formatDateDDMMYYYY(dateStr);
};

export const getCity = (p: Project): string => {
  return p.city || (p.requirements_payload as any)?.city || '';
};

export const getState = (p: Project): string => {
  return p.state || (p.requirements_payload as any)?.state || '';
};

export const getPayload = (p: Project): string => {
  return p.payload || (p.requirements_payload as any)?.payload || '';
};

export const formatLocation = (p: Project): string => {
  const parts: string[] = [];
  if (p.survey_location) parts.push(p.survey_location);
  const c = getCity(p);
  const s = getState(p);
  if (c) parts.push(c);
  if (s) parts.push(s);
  return parts.length > 0 ? parts.join(', ') : 'Location not specified';
};

export const openSlipInNewTab = (url: string): void => {
  if (!url) return;
  if (url.startsWith('data:')) {
    try {
      const arr = url.split(',');
      const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png';
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      const blob = new Blob([u8arr], { type: mime });
      const blobUrl = URL.createObjectURL(blob);
      const win = window.open(blobUrl, '_blank');
      if (!win) {
        window.location.href = blobUrl;
      }
    } catch {
      const win = window.open();
      if (win) {
        win.document.write(
          `<title>Payment Slip</title><body style="margin:0;background:#09090b;display:flex;align-items:center;justify-content:center;min-height:100vh;"><img src="${url}" style="max-width:100%;max-height:100vh;object-fit:contain;"/></body>`
        );
      }
    }
  } else {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
};
