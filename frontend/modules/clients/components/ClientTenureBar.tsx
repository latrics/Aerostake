import React from 'react';

interface ClientTenureBarProps {
  daysLeft?: number;
  totalDays?: number;
  width?: string;
}

export const ClientTenureBar: React.FC<ClientTenureBarProps> = ({
  daysLeft = 1095,
  totalDays = 1095,
  width = '95px',
}) => {
  const percentage = Math.min(100, Math.max(0, (daysLeft / totalDays) * 100));
  const yearsLeft = (daysLeft / 365).toFixed(1);

  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', width, gap: '2px' }}
      title={`${daysLeft} days left (${yearsLeft} yrs) out of ${totalDays} days (3-year tenure)`}
    >
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

      {/* Axis markers below: Left shows days left, Right shows 1095d (3 years) upper limit */}
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
        <span style={{ fontWeight: 700, color: '#09090b' }}>
          {daysLeft}d
        </span>
        <span style={{ color: '#a1a1aa' }} title="3 Years Total Tenure">
          {totalDays}d
        </span>
      </div>
    </div>
  );
};
