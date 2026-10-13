'use client';

import React from 'react';
import { X } from 'lucide-react';

interface SlipZoomModalProps {
  imageUrl: string | null;
  onClose: () => void;
}

export const SlipZoomModal: React.FC<SlipZoomModalProps> = ({ imageUrl, onClose }) => {
  if (!imageUrl) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100000,
        padding: '2rem',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '85vw', maxHeight: '85vh', position: 'relative' }}
      >
        <img
          src={imageUrl}
          alt="Full Slip preview"
          style={{
            maxWidth: '100%',
            maxHeight: '85vh',
            borderRadius: '8px',
            objectFit: 'contain',
            border: '1px solid #3f3f46',
          }}
        />
        <button
          type="button"
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '-12px',
            right: '-12px',
            backgroundColor: '#ffffff',
            border: 'none',
            borderRadius: '50%',
            width: '28px',
            height: '28px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
          }}
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
};
