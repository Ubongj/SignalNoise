import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract, useSwitchChain } from 'wagmi';
import { arbitrumSepolia } from 'wagmi/chains';
import type { Address } from 'viem';
import { Button, Card } from '@/components/ui/primitives';
import { ConnectWallet } from '@/components/web3/ConnectWallet';
import { useMounted } from '@/lib/useMounted';
import { readOnChainRooms, saveOnChainRoom, type OnChainRoom } from '@/lib/onchainHistory';

function useOnChainRooms(): OnChainRoom[] {
  const [rooms, setRooms] = useState<OnChainRoom[]>([]);
  useEffect(() => {
    const refresh = () => setRooms(readOnChainRooms());
    refresh();
    window.addEventListener('svn:onchain-rooms', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('svn:onchain-rooms', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);
  return rooms;
}

function timeAgo(ms: number): string {
  const s = Math.round((Date.now() - ms) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
}
import {
  signalVsNoiseAddress,
  signalVsNoiseAbi,
  isContractConfigured,
  roomIdFromCode,
  Phase,
} from '@/lib/contract';

// Three fixed placeholder opponents so createGame's 4-distinct-players rule is
// satisfied while we prove the write path with a single connected wallet.
const PLACEHOLDERS: Address[] = [
  '0x000000000000000000000000000000000000dead',
  '0x00000000000000000000000000000000deadbeef',
  '0x0000000000000000000000000000000000c0ffee',
];

const randomCode = () =>
  Array.from({ length: 4 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]).join('');

const short = (a?: string) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : '—');

export default function OnChainDemo() {
  const mounted = useMounted();
  const { address, isConnected, chainId } = useAccount();
  const onRightChain = chainId === arbitrumSepolia.id;
  const { switchChain, isPending: switching } = useSwitchChain();

  const [code, setCode] = useState<string>('');
  const [roomId, setRoomId] = useState<bigint | undefined>();

  const { writeContract, data: hash, isPending: signing, error } = useWriteContract();
  const receipt = useWaitForTransactionReceipt({ hash });

  // Read the game back once the tx confirms — proves the write actually landed.
  const game = useReadContract({
    address: signalVsNoiseAddress,
    abi: signalVsNoiseAbi,
    functionName: 'getGame',
    args: roomId !== undefined ? [roomId] : undefined,
    query: { enabled: receipt.isSuccess && roomId !== undefined },
  });

  const rooms = useOnChainRooms();

  // Persist to local history once the tx confirms.
  useEffect(() => {
    if (receipt.isSuccess && hash && code) {
      saveOnChainRoom({ code, txHash: hash, at: Date.now() });
    }
  }, [receipt.isSuccess, hash, code]);

  const handleCreate = () => {
    if (!address) return;
    const c = randomCode();
    const id = roomIdFromCode(c);
    setCode(c);
    setRoomId(id);
    writeContract({
      address: signalVsNoiseAddress,
      abi: signalVsNoiseAbi,
      functionName: 'createGame',
      args: [id, [address, ...PLACEHOLDERS], [0, 1, 0, 1]],
    });
  };

  const status = signing
    ? 'Waiting for signature…'
    : receipt.isLoading
      ? 'Confirming on-chain…'
      : receipt.isSuccess
        ? 'Confirmed ✓'
        : hash
          ? 'Submitted'
          : 'Ready';

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const phaseName = game.data ? Phase[Number((game.data as any)[0])] : undefined;

  return (
    <div className="min-h-screen bg-bg text-ink">
      <header className="flex items-center justify-between px-4 sm:px-8 h-16 border-b border-outline/60">
        <Link href="/" className="font-display font-bold text-lg sm:text-xl tracking-tight hover:opacity-80">
          Signal <span className="text-ink-variant font-normal">vs</span> Noise
        </Link>
        <ConnectWallet />
      </header>

      <main className="max-w-lg mx-auto px-4 py-12">
        <p className="text-ink-variant text-sm mb-1">On-chain demo · Arbitrum Sepolia</p>
        <h1 className="font-display font-bold text-3xl mb-2">Create a game on-chain</h1>
        <p className="text-ink-variant text-sm mb-8 leading-relaxed">
          Fires a real <code className="text-primary">createGame</code> transaction to the deployed
          contract using your connected wallet as player 1 (plus placeholder opponents). No FHE here —
          this proves the write path end-to-end.
        </p>

        {!mounted ? (
          <Card className="p-6 text-ink-variant text-sm">Loading…</Card>
        ) : !isContractConfigured ? (
          <Card className="p-5 text-accent-red text-sm">Contract address not configured.</Card>
        ) : !isConnected ? (
          <Card className="p-6 flex flex-col items-center gap-4">
            <p className="text-ink-variant text-sm">Connect a wallet to begin.</p>
            <ConnectWallet />
          </Card>
        ) : !onRightChain ? (
          <Card className="p-6 flex flex-col items-center gap-4">
            <p className="text-accent-red text-sm">Wrong network — switch to Arbitrum Sepolia.</p>
            <Button onClick={() => switchChain({ chainId: arbitrumSepolia.id })} disabled={switching}>
              {switching ? 'Switching…' : 'Switch network'}
            </Button>
          </Card>
        ) : (
          <Card className="p-6 space-y-5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-ink-variant">Wallet</span>
              <span className="font-mono">{short(address)}</span>
            </div>

            <Button onClick={handleCreate} disabled={signing || receipt.isLoading} fullWidth size="lg">
              {signing || receipt.isLoading ? status : 'Create game on-chain →'}
            </Button>

            {hash && (
              <div className="space-y-2 text-sm border-t border-outline/60 pt-4">
                <Row label="Status">
                  <span className={receipt.isSuccess ? 'text-primary' : 'text-ink-variant'}>{status}</span>
                </Row>
                <Row label="Room code"><span className="font-mono">{code}</span></Row>
                <Row label="Transaction">
                  <a
                    href={`https://sepolia.arbiscan.io/tx/${hash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary hover:underline font-mono"
                  >
                    {short(hash)} ↗
                  </a>
                </Row>
                {receipt.isSuccess && (
                  <Row label="On-chain phase">
                    {phaseName ? (
                      <span className="text-primary">{phaseName}</span>
                    ) : (
                      <span className="text-ink-variant">reading…</span>
                    )}
                  </Row>
                )}
              </div>
            )}

            {error && (
              <p className="text-accent-red text-xs leading-relaxed break-words">
                {(error as Error).message.split('\n')[0].slice(0, 200)}
              </p>
            )}
          </Card>
        )}

        <p className="text-ink-variant/60 text-xs mt-6">
          Once confirmed, the read-back shows <span className="text-ink-variant">LOBBY</span> — the game now
          lives on-chain. View the contract on{' '}
          <a
            href={`https://sepolia.arbiscan.io/address/${signalVsNoiseAddress}`}
            target="_blank"
            rel="noreferrer"
            className="text-primary hover:underline"
          >
            Arbiscan
          </a>
          .
        </p>

        {mounted && rooms.length > 0 && (
          <div className="mt-10">
            <h2 className="font-display font-bold text-lg mb-3">Your recent on-chain rooms</h2>
            <Card className="divide-y divide-outline/50">
              {rooms.map((r) => (
                <div key={r.txHash} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                  <span className="font-mono font-semibold tracking-wider text-ink">{r.code}</span>
                  <span className="text-ink-variant/70 text-xs">{timeAgo(r.at)}</span>
                  <a
                    href={`https://sepolia.arbiscan.io/tx/${r.txHash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary hover:underline font-mono text-xs"
                  >
                    {r.txHash.slice(0, 6)}…{r.txHash.slice(-4)} ↗
                  </a>
                </div>
              ))}
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-ink-variant">{label}</span>
      <span className="text-right font-medium">{children}</span>
    </div>
  );
}
