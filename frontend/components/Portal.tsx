'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

export interface PortalProps {
  children: React.ReactNode;
}

/**
 * Portal component that renders children directly into document.body.
 * This guarantees that modal dialogs and overlays are positioned relative
 * to the browser viewport ("point of view") rather than being constrained
 * by parent containers, page scroll heights, or CSS transform containing blocks.
 */
export const Portal: React.FC<PortalProps> = ({ children }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || typeof document === 'undefined') {
    return null;
  }

  return createPortal(children, document.body);
};

export default Portal;
