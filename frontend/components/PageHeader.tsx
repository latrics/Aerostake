'use client';

import React from 'react';
import { NotificationButton } from './NotificationButton';
interface PageHeaderProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  badge?: React.ReactNode;
  breadcrumbs?: React.ReactNode;
  children?: React.ReactNode;
  showNotification?: boolean;
}

export function PageHeader({
  title,
  subtitle,
  badge,
  breadcrumbs,
  children,
  showNotification = true,
}: PageHeaderProps) {

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '1.5rem',
        gap: '1rem',
        flexWrap: 'wrap',
      }}
    >
      {/* Left: Title, Subtitle, optional Badge/Breadcrumbs */}
      <div>
        {breadcrumbs && (
          <div style={{ marginBottom: '0.35rem', fontSize: '0.8rem', color: '#71717a' }}>
            {breadcrumbs}
          </div>
        )}
        {badge && (
          <div style={{ marginBottom: '0.35rem' }}>
            {badge}
          </div>
        )}
        <h1
          style={{
            fontSize: '1.5rem',
            fontWeight: 800,
            letterSpacing: '-0.02em',
            color: '#09090b',
            lineHeight: 1.25,
            margin: 0,
          }}
        >
          {title}
        </h1>
        {subtitle && (
          <p
            style={{
              fontSize: '0.85rem',
              color: '#71717a',
              marginTop: '0.25rem',
              marginBottom: 0,
              lineHeight: 1.4,
            }}
          >
            {subtitle}
          </p>
        )}
      </div>

      {/* Right: Notification Button before any controls at right corner, or notification alone if blank */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.65rem',
          flexWrap: 'wrap',
        }}
      >
        {showNotification && <NotificationButton />}
        {children}
      </div>
    </div>
  );
}
