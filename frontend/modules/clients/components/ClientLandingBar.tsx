import React from 'react';

interface ClientLandingBarProps {
  current: number;
  max?: number;
  width?: string;
}

export const ClientLandingBar: React.FC<ClientLandingBarProps> = ({
  current,
  max = 1000,
  width = '90px',
}) => {
  const percentage = Math.min(100, Math.max(0, (current / max) * 100));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width, gap: '2px' }}>
      {/* Horizontal Progress Bar */}
      <div
        style={{
          width: '100%',
          height: '6px',
          backgroundColor: '#e4e4e7',
          borderRadius: '4px',
          overflow: 'hidden',
          position: 'relative',
        }}
        title={`${current} / ${max} landings`}
      >
        <div
          style={{
            height: '100%',
            width: `${percentage}%`,
            backgroundColor: '#09090b',
            borderRadius: '4px',
            transition: 'width 0.3s ease',
          }}
        />
      </div>

      {/* Axis markers below: Left shows completed landings, Right shows 1000 upper limit */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '10px',
          color: '#71717a',
          lineHeight: 1,
          fontFamily: 'monospace',
          padding: '0 1px',
          marginTop: '2px',
        }}
      >
        <span style={{ fontWeight: 700, color: '#09090b' }}>{current}</span>
        <span style={{ color: '#a1a1aa' }}>{max}</span>
      </div>
    </div>
  );
};
