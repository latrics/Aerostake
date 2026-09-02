'use client';

import React, { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Application Error:', error);
  }, [error]);

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
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.5rem', color: '#09090b' }}>
          Something went wrong
        </h2>
        <p style={{ fontSize: '0.85rem', color: '#52525b', marginBottom: '1.5rem' }}>
          {error?.message || 'An unexpected error occurred.'}
        </p>
        <button
          onClick={() => reset()}
          className="btn btn-primary"
          style={{ padding: '0.5rem 1.25rem' }}
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
