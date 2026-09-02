'use client';

import React, { useState, useEffect } from 'react';
import { Bell, BellOff, CheckCircle2, AlertCircle } from 'lucide-react';
import { registerPushNotifications, getNotificationPermissionState } from '@/lib/firebase';

export default function NotificationBanner() {
  const [permission, setPermission] = useState<string>('default');
  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ title: string; body: string } | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setPermission(getNotificationPermissionState());
    }

    // Optional: automatically sync device token if already granted
    if (typeof window !== 'undefined' && Notification.permission === 'granted') {
      registerPushNotifications().catch(() => {});
    }
  }, []);

  const handleEnableNotifications = async () => {
    setLoading(true);
    try {
      const result = await registerPushNotifications();
      if (result.success) {
        setPermission('granted');
        setToastMessage({
          title: 'Push Notifications Enabled',
          body: 'You will now receive live mission alerts, flight updates, and plan approvals.',
        });
        setTimeout(() => setToastMessage(null), 5000);
      } else {
        setPermission(getNotificationPermissionState());
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Top bar push notification toggle button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        {permission === 'granted' ? (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.25rem 0.6rem',
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '6px',
              fontSize: '0.75rem',
              color: '#34d399',
              fontWeight: 500,
            }}
            title="Push notifications active"
          >
            <Bell size={13} />
            <span>Alerts On</span>
          </div>
        ) : (
          <button
            onClick={handleEnableNotifications}
            disabled={loading}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.3rem 0.75rem',
              background: 'rgba(59, 130, 246, 0.15)',
              border: '1px solid rgba(59, 130, 246, 0.35)',
              borderRadius: '6px',
              color: '#60a5fa',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            <Bell size={13} />
            <span>{loading ? 'Enabling...' : 'Enable Alerts'}</span>
          </button>
        )}
      </div>

      {/* Floating In-App Toast Alert */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            maxWidth: '380px',
            background: '#1a2234',
            border: '1px solid rgba(59, 130, 246, 0.4)',
            borderRadius: '10px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
            padding: '1rem 1.25rem',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.75rem',
            animation: 'fadeIn 0.3s ease-out',
          }}
        >
          <CheckCircle2 size={20} style={{ color: '#34d399', flexShrink: 0, marginTop: '2px' }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#f8fafc', marginBottom: '0.2rem' }}>
              {toastMessage.title}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8', lineHeight: 1.4 }}>
              {toastMessage.body}
            </div>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#64748b',
              cursor: 'pointer',
              fontSize: '1rem',
              lineHeight: 1,
            }}
          >
            &times;
          </button>
        </div>
      )}
    </>
  );
}
