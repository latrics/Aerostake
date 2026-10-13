'use client';

import React, { useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { NotificationButton } from './NotificationButton';

export interface RefreshButtonProps {
  onClick: () => void | Promise<void>;
  isLoading?: boolean;
  tooltip?: string;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Standardized icon-only Refresh button for page headers across the portal.
 * Adheres strictly to a 36x36px square footprint with smooth hover & spin states.
 */
export function RefreshButton({
  onClick,
  isLoading = false,
  tooltip = 'Refresh',
  size = 15,
  className = '',
  style = {},
}: RefreshButtonProps) {
  const [internalSpin, setInternalSpin] = useState(false);

  const handleClick = async () => {
    if (isLoading || internalSpin) return;
    setInternalSpin(true);
    try {
      await onClick();
    } finally {
      setTimeout(() => setInternalSpin(false), 550);
    }
  };

  const isSpinning = isLoading || internalSpin;

  return (
    <button
      type="button"
      onClick={handleClick}
      title={tooltip}
      aria-label={tooltip}
      disabled={isSpinning}
      className={`page-header-refresh-btn ${className}`}
      style={{
        width: '36px',
        height: '36px',
        minWidth: '36px',
        borderRadius: '6px',
        backgroundColor: '#ffffff',
        border: '1px solid #e4e4e7',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: isSpinning ? 'not-allowed' : 'pointer',
        color: '#09090b',
        transition: 'all 0.15s ease',
        padding: 0,
        flexShrink: 0,
        ...style,
      }}
      onMouseEnter={(e) => {
        if (!isSpinning) {
          e.currentTarget.style.backgroundColor = '#f4f4f5';
          e.currentTarget.style.borderColor = '#d4d4d8';
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = '#ffffff';
        e.currentTarget.style.borderColor = '#e4e4e7';
      }}
    >
      <RotateCcw
        size={size}
        className={isSpinning ? 'animate-spin' : ''}
        style={{
          transition: 'transform 0.15s ease',
        }}
      />
    </button>
  );
}

export interface PageHeaderProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  badge?: React.ReactNode;
  breadcrumbs?: React.ReactNode;
  breadcrumb?: React.ReactNode;
  children?: React.ReactNode;
  actions?: React.ReactNode;
  showNotification?: boolean;
  onRefresh?: () => void | Promise<void>;
  isRefreshing?: boolean;
  refreshTooltip?: string;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Universal PageHeader Component for Aerostake
 *
 * Ensures static visual rhythm and identical vertical offset across all pages.
 * Left Zone: Consistent typography, breadcrumbs, title, subtitle & badges.
 * Right Zone: Contextual action controls, standardized icon-only refresh button,
 * and persistent notification bell at the far right.
 */
export function PageHeader({
  title,
  subtitle,
  badge,
  breadcrumbs,
  breadcrumb,
  children,
  actions,
  showNotification = true,
  onRefresh,
  isRefreshing = false,
  refreshTooltip = 'Refresh',
  className = '',
  style = {},
}: PageHeaderProps) {
  const effectiveBreadcrumb = breadcrumb || breadcrumbs;

  return (
    <header
      className={`page-header ${className}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        minHeight: '48px',
        marginBottom: '1.5rem',
        gap: '1rem',
        flexWrap: 'wrap',
        ...style,
      }}
    >
      {/* ── Left Zone: Breadcrumbs, Title, Subtitle, Badges ── */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.2rem',
          minWidth: '220px',
        }}
      >
        {effectiveBreadcrumb && (
          <nav
            aria-label="Breadcrumb navigation"
            style={{
              fontSize: '0.8rem',
              color: '#71717a',
              lineHeight: 1.25,
              marginBottom: '0.15rem',
            }}
          >
            {effectiveBreadcrumb}
          </nav>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
          <h1
            style={{
              fontSize: '1.5rem',
              fontWeight: 800,
              letterSpacing: '-0.025em',
              color: '#09090b',
              lineHeight: 1.2,
              margin: 0,
            }}
          >
            {title}
          </h1>
          {badge && <div style={{ display: 'inline-flex', alignItems: 'center' }}>{badge}</div>}
        </div>
        {subtitle && (
          <p
            style={{
              fontSize: '0.825rem',
              color: '#71717a',
              marginTop: '0.15rem',
              marginBottom: 0,
              lineHeight: 1.4,
            }}
          >
            {subtitle}
          </p>
        )}
      </div>

      {/* ── Right Zone: Action Controls, Icon-only Refresh, Notification Bell ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.55rem',
          flexWrap: 'wrap',
        }}
      >
        {/* Contextual actions, search inputs, filters */}
        {children}
        {actions}

        {/* Standardized Refresh Icon Button */}
        {onRefresh && (
          <RefreshButton
            onClick={onRefresh}
            isLoading={isRefreshing}
            tooltip={refreshTooltip}
          />
        )}

        {/* Universal Notifications Bell */}
        {showNotification && <NotificationButton />}
      </div>
    </header>
  );
}
