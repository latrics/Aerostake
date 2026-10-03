'use client';

import React, { useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function ClientDocumentsPage() {
  return (
    <Suspense
      fallback={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh' }}>
          <Loader2 size={32} className="animate-spin" color="#09090b" />
        </div>
      }
    >
      <ClientDocumentsContent />
    </Suspense>
  );
}

function ClientDocumentsContent() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/activity-logs?tab=documents');
  }, [router]);

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', gap: '0.75rem', color: 'var(--text-secondary)' }}>
      <Loader2 size={24} className="animate-spin" />
      <span style={{ fontSize: '0.85rem' }}>Redirecting to Daily Logs Documents...</span>
    </div>
  );
}
