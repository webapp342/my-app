import { useState, useEffect, useCallback } from 'react';

interface BalanceInfo {
  token: string;
  balance: string;
  network: string;
}

interface SyncStats {
  totalTransactions: number;
  savedTransactions: number;
  errors: string[];
}

interface BalanceTrackingState {
  balances: BalanceInfo[];
  balanceCount: number;
  transactionCount: number;
  lastSync: string | null;
  isLoading: boolean;
  isSyncing: boolean;
  error: string | null;
  syncStats: SyncStats | null;
}

export function useBalanceTracking(
  userId: string | null,
  walletAddress: string | null
) {
  const [state, setState] = useState<BalanceTrackingState>({
    balances: [],
    balanceCount: 0,
    transactionCount: 0,
    lastSync: null,
    isLoading: false,
    isSyncing: false,
    error: null,
    syncStats: null,
  });

  // Fetch current balance status
  const fetchBalanceStatus = useCallback(async () => {
    if (!userId) return;

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await fetch(`/api/sync-transactions?userId=${userId}`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Response is not JSON');
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      setState(prev => ({
        ...prev,
        balances: data.balances || [],
        balanceCount: data.balanceCount || 0,
        transactionCount: data.transactionCount || 0,
        lastSync: data.lastSync,
        isLoading: false,
      }));
    } catch (error) {
      console.error('[BALANCE TRACKING] Error fetching status:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Unknown error',
        isLoading: false,
      }));
    }
  }, [userId]);

  // Sync transactions from blockchain
  const syncTransactions = useCallback(async () => {
    if (!userId || !walletAddress) {
      console.warn(
        '[BALANCE TRACKING] Missing userId or walletAddress for sync'
      );
      return;
    }

    setState(prev => ({
      ...prev,
      isSyncing: true,
      error: null,
      syncStats: null,
    }));

    try {
      console.log(
        `[BALANCE TRACKING] Starting sync for user ${userId}, wallet ${walletAddress}`
      );

      const response = await fetch('/api/sync-transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          address: walletAddress,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Response is not JSON');
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      console.log('[BALANCE TRACKING] Sync completed:', data);

      setState(prev => ({
        ...prev,
        syncStats: data.stats,
        isSyncing: false,
      }));

      // Refresh balance status after sync
      await fetchBalanceStatus();
    } catch (error) {
      console.error('[BALANCE TRACKING] Error syncing transactions:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Unknown error',
        isSyncing: false,
      }));
    }
  }, [userId, walletAddress, fetchBalanceStatus]);

  // Auto-fetch balance status on mount and when dependencies change
  useEffect(() => {
    if (userId) {
      fetchBalanceStatus();
    }
  }, [userId, fetchBalanceStatus]);

  // Auto-sync only if really necessary (to save database space)
  useEffect(() => {
    if (
      userId &&
      walletAddress &&
      state.transactionCount === 0 &&
      !state.isLoading &&
      !state.isSyncing
    ) {
      // Only auto-sync if user explicitly requests it (don't auto-sync on every page load)
      console.log(
        '[BALANCE TRACKING] No transactions found. Click "Sync Transactions" to load data.'
      );
    }
  }, [
    userId,
    walletAddress,
    state.transactionCount,
    state.isLoading,
    state.isSyncing,
  ]);

  return {
    ...state,
    syncTransactions,
    refreshStatus: fetchBalanceStatus,
    clearError: () => setState(prev => ({ ...prev, error: null })),
    clearSyncStats: () => setState(prev => ({ ...prev, syncStats: null })),
  };
}
