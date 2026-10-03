import React from 'react';
import { X, Check } from 'lucide-react';
import { ClientFilterCategory } from '../types';

interface ClientFiltersModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeCategory: ClientFilterCategory;
  onSelectCategory: (category: ClientFilterCategory) => void;
  minRating: number;
  onSelectMinRating: (rating: number) => void;
  onlyPendingPayments: boolean;
  onTogglePendingPayments: (val: boolean) => void;
  onReset: () => void;
}

export const ClientFiltersModal: React.FC<ClientFiltersModalProps> = ({
  isOpen,
  onClose,
  activeCategory,
  onSelectCategory,
  minRating,
  onSelectMinRating,
  onlyPendingPayments,
  onTogglePendingPayments,
  onReset,
}) => {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '1rem',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '10px',
          width: '100%',
          maxWidth: '440px',
          padding: '1.5rem',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: '#09090b' }}>
            Filter Clients
          </h3>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#71717a',
              display: 'flex',
              padding: '4px',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Status Category */}
        <div>
          <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#09090b', display: 'block', marginBottom: '0.5rem' }}>
            Status & Workflow Stage
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {[
              { id: 'all', label: 'All Clients' },
              { id: 'active', label: 'Active' },
              { id: 'capturing', label: 'Capturing' },
              { id: 'planning', label: 'Planning' },
              { id: 'pending_payment', label: 'Pending Payments' },
              { id: 'issues', label: 'Issues' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => onSelectCategory(tab.id as ClientFilterCategory)}
                style={{
                  padding: '0.4rem 0.75rem',
                  borderRadius: '20px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: activeCategory === tab.id ? '1px solid #09090b' : '1px solid #e4e4e7',
                  backgroundColor: activeCategory === tab.id ? '#09090b' : '#ffffff',
                  color: activeCategory === tab.id ? '#ffffff' : '#09090b',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Rating Filter */}
        <div>
          <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#09090b', display: 'block', marginBottom: '0.5rem' }}>
            Minimum Client Rating
          </label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {[0, 4.0, 4.5, 4.8].map((rate) => (
              <button
                key={rate}
                onClick={() => onSelectMinRating(rate)}
                style={{
                  flex: 1,
                  padding: '0.45rem',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: minRating === rate ? '1px solid #09090b' : '1px solid #e4e4e7',
                  backgroundColor: minRating === rate ? '#f4f4f5' : '#ffffff',
                  color: '#09090b',
                }}
              >
                {rate === 0 ? 'Any' : `${rate} ★ +`}
              </button>
            ))}
          </div>
        </div>

        {/* Financial Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0' }}>
          <div>
            <span style={{ fontSize: '0.825rem', fontWeight: 600, color: '#09090b', display: 'block' }}>
              Pending Invoices Only
            </span>
            <span style={{ fontSize: '0.725rem', color: '#71717a' }}>
              Only display companies with outstanding payments
            </span>
          </div>
          <input
            type="checkbox"
            checked={onlyPendingPayments}
            onChange={(e) => onTogglePendingPayments(e.target.checked)}
            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
          />
        </div>

        {/* Footer actions */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '0.75rem',
            borderTop: '1px solid #f4f4f5',
            paddingTop: '1rem',
          }}
        >
          <button
            onClick={onReset}
            style={{
              padding: '0.5rem 0.85rem',
              backgroundColor: '#ffffff',
              border: '1px solid #e4e4e7',
              borderRadius: '6px',
              fontSize: '0.8rem',
              fontWeight: 600,
              color: '#71717a',
              cursor: 'pointer',
            }}
          >
            Reset Filters
          </button>
          <button
            onClick={onClose}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#09090b',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  );
};
