'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { paymentsApi } from '../api';
import type { ClientWalletSummary } from '../types';
import { useAuth } from '@/lib/auth';

export const WALLET_SYNC_EVENT = 'aerostake:wallet-updated';

/**
 * Triggers an immediate wallet sync event across the current window and other browser tabs.
 */
export function triggerWalletSync() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(WALLET_SYNC_EVENT));
    try {
      localStorage.setItem('aerostake:wallet-last-updated', Date.now().toString());
    } catch {
      // Storage access may be restricted
    }
  }
}

export function useClientWalletSync(pollingIntervalMs = 15000) {
  const { user } = useAuth();
  const [wallet, setWallet] = useState<ClientWalletSummary | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isError, setIsError] = useState<boolean>(false);
  const isMountedRef = useRef(true);

  const fetchWallet = useCallback(async (isBackground = false) => {
    if (!user) return;
    if (!isBackground) setIsLoading(true);
    try {
      const summary = await paymentsApi.getMyWallet();
      if (isMountedRef.current) {
        setWallet(summary);
        setIsError(false);
      }
    } catch (err) {
      if (isMountedRef.current) {
        setIsError(true);
      }
    } finally {
      if (isMountedRef.current && !isBackground) {
        setIsLoading(false);
      }
    }
  }, [user]);

  useEffect(() => {
    isMountedRef.current = true;
    fetchWallet(false);

    // 1. Polling interval for background real-time sync
    const intervalId = setInterval(() => {
      fetchWallet(true);
    }, pollingIntervalMs);

    // 2. Custom event listener (e.g. after bill created or payment recorded)
    const handleCustomEvent = () => {
      fetchWallet(true);
    };
    window.addEventListener(WALLET_SYNC_EVENT, handleCustomEvent);

    // 3. Storage event listener (sync across multiple open tabs)
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'aerostake:wallet-last-updated') {
        fetchWallet(true);
      }
    };
    window.addEventListener('storage', handleStorage);

    // 4. Window focus listener (sync when returning to the tab)
    const handleFocus = () => {
      fetchWallet(true);
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      isMountedRef.current = false;
      clearInterval(intervalId);
      window.removeEventListener(WALLET_SYNC_EVENT, handleCustomEvent);
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('focus', handleFocus);
    };
  }, [fetchWallet, pollingIntervalMs]);

  return {
    wallet,
    isLoading,
    isError,
    refresh: () => fetchWallet(false),
  };
}
