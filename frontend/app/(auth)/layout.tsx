import React from 'react';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100vw',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'radial-gradient(circle at top right, #1e1b4b, #090514, #020005)',
        padding: '1.5rem',
      }}
    >
      <div
        className="glass-panel animate-fade-in"
        style={{
          width: '100%',
          maxWidth: '440px',
          padding: '2.5rem 2rem',
          boxShadow: '0 0 50px rgba(0, 0, 0, 0.6), 0 0 80px rgba(124, 58, 237, 0.1)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1
            className="text-gradient"
            style={{
              fontSize: '2.25rem',
              fontWeight: 800,
              letterSpacing: '-0.05em',
              marginBottom: '0.25rem',
            }}
          >
            AEROSTAKE
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Latrics Joint Ownership Portal
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
