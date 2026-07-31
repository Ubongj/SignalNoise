/**
 * Lightweight local record of rooms this browser created on-chain. Avoids
 * fragile `getLogs` range queries — we just remember what we submitted, with the
 * tx hash for an Arbiscan link. Read-only history, capped at 10 entries.
 */
export interface OnChainRoom {
  code: string;
  txHash: string;
  at: number; // epoch ms
}

const KEY = 'svn_onchain_rooms';

export function saveOnChainRoom(room: OnChainRoom): void {
  if (typeof window === 'undefined') return;
  const next = [room, ...readOnChainRooms().filter((r) => r.code !== room.code)].slice(0, 10);
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
    // let same-tab listeners (the /onchain page) refresh
    window.dispatchEvent(new Event('svn:onchain-rooms'));
  } catch {
    /* storage full / disabled — non-fatal */
  }
}

export function readOnChainRooms(): OnChainRoom[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as OnChainRoom[]) : [];
  } catch {
    return [];
  }
}
