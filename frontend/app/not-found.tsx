'use client';

import React from 'react';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        padding: '2rem',
        textAlign: 'center',
        fontFamily: 'var(--font-sans)',
      }}
    >
      <div
        style={{
          border: '1px solid #09090b',
          borderRadius: '8px',
          padding: '2rem',
          maxWidth: '480px',
          backgroundColor: '#ffffff',
        }}
      >
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem', color: '#09090b' }}>
          404 — Page Not Found
        </h2>
        <p style={{ fontSize: '0.85rem', color: '#52525b', marginBottom: '1.5rem' }}>
          The requested page could not be located.
        </p>
        <Link href="/dashboard" className="btn btn-primary" style={{ padding: '0.5rem 1.25rem' }}>
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
}
