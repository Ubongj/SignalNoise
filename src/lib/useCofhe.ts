import { useCallback, useState } from 'react';
import { usePublicClient, useWalletClient } from 'wagmi';

export type CofheStatus = 'idle' | 'initializing' | 'ready' | 'error';

/**
 * Initializes cofhejs for the connected wallet on demand.
 *
 * The cofhejs wrapper (and its tfhe WASM) is imported *dynamically inside*
 * `init` — never at module load — so tfhe stays out of the page's initial
 * bundle. Importing it eagerly pulls a circular tfhe worker chunk that breaks
 * client hydration.
 */
export function useCofhe() {
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const [status, setStatus] = useState<CofheStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  const init = useCallback(async () => {
    if (!publicClient || !walletClient) {
      setError('Connect a wallet first');
      setStatus('error');
      return;
    }
    setStatus('initializing');
    setError(null);
    try {
      const { initCofhe } = await import('./cofhe');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await initCofhe(publicClient as any, walletClient as any);
      setStatus('ready');
    } catch (e) {
      setStatus('error');
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [publicClient, walletClient]);

  return { status, error, init };
}
