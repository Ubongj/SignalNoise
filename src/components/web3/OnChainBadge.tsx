import { useReadContract } from 'wagmi';
import {
  signalVsNoiseAddress,
  signalVsNoiseAbi,
  isContractConfigured,
  roomIdFromCode,
} from '@/lib/contract';
import { useMounted } from '@/lib/useMounted';

/**
 * Small, read-only indicator of whether a room is recorded on-chain. Reads
 * `getGame(roomId)` — a revert means the room is off-chain (a casual socket
 * room). Purely informational; never blocks or writes.
 */
export function OnChainBadge({ roomCode }: { roomCode: string }) {
  const mounted = useMounted();

  const game = useReadContract({
    address: signalVsNoiseAddress,
    abi: signalVsNoiseAbi,
    functionName: 'getGame',
    args: [roomIdFromCode(roomCode)],
    query: {
      enabled: mounted && isContractConfigured && !!roomCode,
      retry: false,
      // The on-chain tx confirms a few seconds after the lobby opens; poll until
      // the room appears, then stop.
      refetchInterval: (q) => (q.state.status === 'success' ? false : 5000),
    },
  });

  if (!mounted || !isContractConfigured) return null;

  const base =
    'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium';

  if (game.isLoading) {
    return (
      <span className={`${base} border-outline text-ink-variant`}>
        <span className="w-1.5 h-1.5 rounded-full bg-ink-variant/50 animate-pulse" />
        checking chain…
      </span>
    );
  }

  if (game.isSuccess) {
    return (
      <a
        href={`https://sepolia.arbiscan.io/address/${signalVsNoiseAddress}`}
        target="_blank"
        rel="noreferrer"
        title="This room is recorded on Arbitrum Sepolia"
        className={`${base} border-primary/40 bg-primary/10 text-primary hover:bg-primary/15 transition-colors`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-primary" />
        Backed on-chain ↗
      </a>
    );
  }

  // getGame reverted → room isn't on-chain (a casual socket room)
  return (
    <span className={`${base} border-outline text-ink-variant/70`}>
      <span className="w-1.5 h-1.5 rounded-full bg-ink-variant/40" />
      Off-chain room
    </span>
  );
}
