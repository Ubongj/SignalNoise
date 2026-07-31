import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { createPublicClient, http } from 'viem';
import { arbitrumSepolia } from 'wagmi/chains';
import {
  signalVsNoiseAddress,
  signalVsNoiseAbi,
  isContractConfigured,
} from '@/lib/contract';

// NOTE: cofhejs (and its tfhe WASM) is intentionally NOT imported here.
// It can't run in-browser against the current testnet (CoFHE key-version skew),
// and importing it drags tfhe's rayon worker chunk into the bundle, which breaks
// `next dev` hydration. The encrypted flow is proven via scripts/mock/mock-round.mjs;
// the in-browser encryption demo returns once we run a local CoFHE mock node.

// Lightweight direct read (independent of wagmi's react-query caching) just to
// prove the app can reach the deployed contract.
function useTotalRounds() {
  const [state, setState] = useState<{ value?: number; loading: boolean; ok: boolean }>({
    loading: isContractConfigured,
    ok: false,
  });
  useEffect(() => {
    if (!isContractConfigured) return;
    let alive = true;
    const client = createPublicClient({
      chain: arbitrumSepolia,
      transport: http('https://sepolia-rollup.arbitrum.io/rpc'),
    });
    client
      .readContract({ address: signalVsNoiseAddress, abi: signalVsNoiseAbi, functionName: 'TOTAL_ROUNDS' })
      .then((v) => alive && setState({ value: Number(v), loading: false, ok: true }))
      .catch(() => alive && setState({ loading: false, ok: false }));
    return () => { alive = false; };
  }, []);
  return state;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2 border-b border-outline/50 last:border-0">
      <span className="text-ink-variant text-sm">{label}</span>
      <span className="text-sm font-medium text-right">{children}</span>
    </div>
  );
}

const Dot = ({ ok }: { ok: boolean }) => (
  <span className={`inline-block w-2 h-2 rounded-full mr-2 align-middle ${ok ? 'bg-primary' : 'bg-accent-red'}`} />
);

/**
 * Live "protocol status" panel: proves the app is really talking to the
 * deployed contract (reads TOTAL_ROUNDS on-chain), shows wallet/network state,
 * and lets the user test the FHE encryption handshake.
 */
export function OnChainStatus() {
  const { address, isConnected, chainId } = useAccount();
  const onRightChain = chainId === arbitrumSepolia.id;

  const totalRounds = useTotalRounds();
  const contractReachable = totalRounds.ok;
  const short = (a?: string) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : '—');

  return (
    <div className="w-full max-w-sm mx-auto mt-10 game-card p-5 text-left">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-display font-bold text-lg">Protocol status</h3>
        <span className="text-[10px] uppercase tracking-wider text-ink-variant border border-outline rounded px-2 py-0.5">
          Arbitrum Sepolia
        </span>
      </div>

      <Row label="Contract">
        {!isContractConfigured ? (
          <span className="text-accent-red">not configured</span>
        ) : contractReachable ? (
          <span title={signalVsNoiseAddress}>
            <Dot ok /> {short(signalVsNoiseAddress)}
          </span>
        ) : totalRounds.loading ? (
          <span className="text-ink-variant">checking…</span>
        ) : (
          <span className="text-accent-red"><Dot ok={false} /> unreachable</span>
        )}
      </Row>

      <Row label="Rounds (on-chain read)">
        {contractReachable ? (
          <span className="text-primary">{totalRounds.value}</span>
        ) : (
          <span className="text-ink-variant">—</span>
        )}
      </Row>

      <Row label="Wallet">
        {isConnected ? (
          <span className="font-mono"><Dot ok /> {short(address)}</span>
        ) : (
          <span className="text-ink-variant">not connected</span>
        )}
      </Row>

      <Row label="Network">
        {!isConnected ? (
          <span className="text-ink-variant">—</span>
        ) : onRightChain ? (
          <span><Dot ok /> correct</span>
        ) : (
          <span className="text-accent-red"><Dot ok={false} /> wrong network</span>
        )}
      </Row>

      <Row label="Encryption (FHE)">
        <span className="text-ink-variant" title="Proven via scripts/mock/mock-round.mjs">
          mock-verified
        </span>
      </Row>

      <p className="mt-2 text-[11px] text-ink-variant/60 leading-relaxed">
        FHE encryption is verified end-to-end in mock mode. In-browser encryption
        returns once the cofhejs ↔ CoFHE testnet versions align.
      </p>
    </div>
  );
}
