'use client';

import React from 'react';

interface WireframeBoxProps {
  width?: string | number;
  height?: string | number;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
  showCross?: boolean;
}

export default function WireframeBox({
  width = '100%',
  height = '100%',
  className = '',
  style = {},
  children,
  showCross = true,
}: WireframeBoxProps) {
  return (
    <div
      className={`wireframe-placeholder-box ${className}`}
      style={{
        position: 'relative',
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
        border: '1px solid #d4d4d8',
        backgroundColor: '#fafafa',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        ...style,
      }}
    >
      {showCross && (
        <svg
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
          }}
          preserveAspectRatio="none"
        >
          <line x1="0" y1="0" x2="100%" y2="100%" stroke="#e4e4e7" strokeWidth="1" />
          <line x1="100%" y1="0" x2="0" y2="100%" stroke="#e4e4e7" strokeWidth="1" />
        </svg>
      )}
      {children && (
        <div style={{ position: 'relative', zIndex: 1 }}>{children}</div>
      )}
    </div>
  );
}
