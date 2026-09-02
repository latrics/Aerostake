'use client';

import React from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          padding: '2rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          fontFamily: 'sans-serif',
          backgroundColor: '#f8f9fa',
        }}
      >
        <div
          style={{
            border: '1px solid #09090b',
            borderRadius: '8px',
            padding: '2rem',
            maxWidth: '480px',
            backgroundColor: '#ffffff',
            textAlign: 'center',
          }}
        >
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.5rem' }}>
            Critical Error
          </h2>
          <p style={{ fontSize: '0.85rem', color: '#52525b', marginBottom: '1.5rem' }}>
            {error?.message || 'A global error occurred.'}
          </p>
          <button
            onClick={() => reset()}
            style={{
              padding: '0.5rem 1.25rem',
              backgroundColor: '#09090b',
              color: '#ffffff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            Reload Application
          </button>
        </div>
      </body>
    </html>
  );
}
