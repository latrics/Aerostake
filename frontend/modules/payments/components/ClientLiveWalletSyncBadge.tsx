'use client';

import React from 'react';
import Link from 'next/link';
import { Wallet, RefreshCw } from 'lucide-react';
import { useClientWalletSync } from '../hooks/useClientWalletSync';

interface ClientLiveWalletSyncBadgeProps {
  collapsed?: boolean;
  variant?: 'sidebar' | 'header';
}

export const ClientLiveWalletSyncBadge: React.FC<ClientLiveWalletSyncBadgeProps> = ({
  collapsed = false,
  variant = 'sidebar',
}) => {
  const { wallet, isLoading, refresh } = useClientWalletSync();

  const isDue = wallet ? wallet.current_balance > 0 : false;
  const balance = wallet ? wallet.current_balance : 0;

  const formattedBalance = `₹${Math.abs(balance).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

  if (variant === 'header') {
    return (
      <Link
        href="/payments"
        title="Live Cumulative Wallet Balance — Click to view payments"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.45rem',
          textDecoration: 'none',
          padding: '0.35rem 0.65rem',
          borderRadius: '6px',
          backgroundColor: '#fafafa',
          border: '1px solid #e4e4e7',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
        }}
        className="hover:border-zinc-400"
      >
        <span
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Wallet size={15} color="#52525b" />
          <span
            style={{
              position: 'absolute',
              top: '-2px',
              right: '-2px',
              width: '5px',
              height: '5px',
              borderRadius: '50%',
              backgroundColor: '#10b981',
            }}
          />
        </span>
        <span style={{ fontSize: '0.725rem', fontWeight: 600, color: '#71717a' }}>
          Wallet:
        </span>
        <span
          style={{
            fontSize: '0.825rem',
            fontWeight: 800,
            fontFamily: 'monospace',
            color: isDue ? '#dc2626' : '#16a34a',
          }}
        >
          {formattedBalance}
        </span>
      </Link>
    );
  }

  // Sidebar variant
  if (collapsed) {
    return (
      <Link
        href="/payments"
        title={`Live Wallet: ${formattedBalance} (${isDue ? 'Due' : 'Settled/Credit'})`}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0.5rem 0',
          textDecoration: 'none',
          cursor: 'pointer',
          borderRadius: '6px',
        }}
        className="hover:bg-zinc-100"
      >
        <div style={{ position: 'relative' }}>
          <Wallet size={18} color="#52525b" />
          <span
            style={{
              position: 'absolute',
              top: '-1px',
              right: '-1px',
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: isDue ? '#dc2626' : '#16a34a',
            }}
          />
        </div>
      </Link>
    );
  }

  return (
    <div
      style={{
        padding: '0.65rem 0.75rem',
        borderRadius: '8px',
        backgroundColor: '#fafafa',
        border: '1px solid #e4e4e7',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.35rem',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <Wallet size={13} color="#71717a" />
          <span
            style={{
              fontSize: '0.675rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              color: '#71717a',
            }}
          >
            Wallet Balance
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <span
            style={{
              width: '5px',
              height: '5px',
              borderRadius: '50%',
              backgroundColor: '#10b981',
              display: 'inline-block',
            }}
            title="Real-time synced"
          />
          <span style={{ fontSize: '0.625rem', color: '#10b981', fontWeight: 700 }}>
            LIVE
          </span>
          <button
            onClick={(e) => {
              e.preventDefault();
              refresh();
            }}
            title="Refresh balance"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '1px',
              color: '#a1a1aa',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <RefreshCw size={11} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      <Link
        href="/payments"
        style={{
          textDecoration: 'none',
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
        }}
      >
        <span
          style={{
            fontSize: '1rem',
            fontWeight: 900,
            fontFamily: 'monospace',
            letterSpacing: '-0.3px',
            color: isDue ? '#dc2626' : '#16a34a',
          }}
        >
          {formattedBalance}
        </span>
        <span
          style={{
            fontSize: '0.675rem',
            fontWeight: 600,
            color: '#71717a',
          }}
          className="hover:underline"
        >
          Ledger &rarr;
        </span>
      </Link>
    </div>
  );
};
