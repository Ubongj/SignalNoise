import { useEffect, useState } from 'react';

/**
 * Returns false during SSR and the first client render, true afterwards.
 * Use this to gate any UI that depends on wallet state (`useAccount`, etc.):
 * wagmi reports the cached connection synchronously on the client, so rendering
 * connection-dependent markup before mount causes a hydration mismatch.
 */
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}
