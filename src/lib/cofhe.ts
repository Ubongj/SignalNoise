import type { PublicClient, WalletClient } from 'viem';

/**
 * Client-only wrapper around cofhejs.
 *
 * `cofhejs/web` pulls in the tfhe WebAssembly module, so we import it
 * dynamically — never on the server — and expose small helpers for the three
 * things the game needs: initialize (with a signed permit), encrypt inputs, and
 * unseal permissioned values (e.g. the secret word, for non-guessers).
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let cofhePromise: Promise<any> | null = null;
let initialized = false;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function loadCofhe(): Promise<any> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('cofhejs is browser-only'));
  }
  if (!cofhePromise) cofhePromise = import('cofhejs/web');
  return cofhePromise;
}

/** Initialize cofhejs for the connected wallet and mint a permit for unsealing. */
export async function initCofhe(
  publicClient: PublicClient,
  walletClient: WalletClient,
): Promise<void> {
  const { cofhejs } = await loadCofhe();
  const res = await cofhejs.initializeWithViem({
    viemClient: publicClient,
    viemWalletClient: walletClient,
    environment: 'TESTNET',
    generatePermit: true,
  });
  if (res?.error) throw new Error(`cofhejs init failed: ${JSON.stringify(res.error)}`);
  initialized = true;
}

export function isCofheReady(): boolean {
  return initialized;
}

/** Encrypt a 256-bit value (a word/guess keccak hash) into an InEuint256. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function encryptUint256(value: bigint): Promise<any> {
  const { cofhejs, Encryptable } = await loadCofhe();
  const res = await cofhejs.encrypt([Encryptable.uint256(value)]);
  if (res?.error) throw new Error(`encrypt failed: ${JSON.stringify(res.error)}`);
  return res.data[0];
}

/** Encrypt a set of booleans (the clue honest/sabotage flags) into InEbool[]. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function encryptBools(values: boolean[]): Promise<any[]> {
  const { cofhejs, Encryptable } = await loadCofhe();
  const res = await cofhejs.encrypt(values.map((v) => Encryptable.bool(v)));
  if (res?.error) throw new Error(`encrypt failed: ${JSON.stringify(res.error)}`);
  return res.data;
}

/** Unseal a permissioned euint256 handle client-side (returns the plaintext). */
export async function unsealUint256(ctHash: bigint): Promise<bigint> {
  const { cofhejs, FheTypes } = await loadCofhe();
  const res = await cofhejs.unseal(ctHash, FheTypes.Uint256);
  if (res?.error) throw new Error(`unseal failed: ${JSON.stringify(res.error)}`);
  return res.data as bigint;
}
