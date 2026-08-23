import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAccount, useWriteContract } from 'wagmi';
import { arbitrumSepolia } from 'wagmi/chains';
import type { Address } from 'viem';
import { useSocket } from '@/hooks/useSocket';
import { Button, Card, Input } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/Toast';
import { saveOnChainRoom } from '@/lib/onchainHistory';
import { ConnectWallet } from '@/components/web3/ConnectWallet';
import { CATEGORIES } from '@/lib/categories';
import {
  signalVsNoiseAddress,
  signalVsNoiseAbi,
  isContractConfigured,
  roomIdFromCode,
} from '@/lib/contract';

type Mode = 'idle' | 'create' | 'join';

// Placeholder opponents so the contract's 4-distinct-players rule is satisfied
// when the host records a room on-chain solo. Real player addresses get wired in
// a later step; this only proves/records the room's existence trustlessly.
const PLACEHOLDER_OPPONENTS: Address[] = [
  '0x000000000000000000000000000000000000dead',
  '0x00000000000000000000000000000000deadbeef',
  '0x0000000000000000000000000000000000c0ffee',
];

export default function Home() {
  const router = useRouter();
  const { createRoom, joinRoom, connected } = useSocket();
  const { address, isConnected, chainId } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const { show } = useToast();
  const [mode, setMode] = useState<Mode>('idle');
  const [playerName, setPlayerName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [showHowTo, setShowHowTo] = useState(false);
  const [category, setCategory] = useState('mixed');
  const [chain, setChain] = useState<'off' | 'on'>('off');

  const onRightChain = chainId === arbitrumSepolia.id;

  useEffect(() => {
    if (router.query.join) setMode('join');
  }, [router.query.join]);

  // Progressive enhancement: if the host has a wallet on Arbitrum Sepolia, record
  // the room on-chain. Fire-and-forget — the game NEVER waits on or breaks because
  // of this; wallet-less players are entirely unaffected.
  const recordRoomOnChain = (roomCode: string) => {
    // No wallet → casual play, nothing to say.
    if (!isConnected || !address || !isContractConfigured) return;
    // Wallet on the wrong chain → tell them why it's off-chain.
    if (chainId !== arbitrumSepolia.id) {
      show('info', 'Wrong network — playing off-chain. Switch to Arbitrum Sepolia to record on-chain.', {
        duration: 6000,
      });
      return;
    }
    const pid = show('pending', 'Recording room on-chain…');
    writeContractAsync({
      address: signalVsNoiseAddress,
      abi: signalVsNoiseAbi,
      functionName: 'createGame',
      args: [roomIdFromCode(roomCode), [address, ...PLACEHOLDER_OPPONENTS], [0, 1, 0, 1]],
    })
      .then((hash) => {
        saveOnChainRoom({ code: roomCode, txHash: hash, at: Date.now() });
        show('success', 'Room recorded on-chain', {
          id: pid,
          href: `https://sepolia.arbiscan.io/tx/${hash}`,
        });
      })
      .catch((err: unknown) => {
        // Non-fatal: the game plays fine regardless. Surface a friendly reason.
        const msg = err instanceof Error ? err.message : String(err);
        const friendly = /reject|denied/i.test(msg)
          ? 'On-chain recording cancelled'
          : /insufficient funds/i.test(msg)
            ? 'Not enough test ETH to record on-chain'
            : "Couldn't record room on-chain (playing off-chain)";
        show('error', friendly, { id: pid });
        console.warn('[on-chain] room not recorded:', msg);
      });
  };

  const handleCreate = async () => {
    if (!playerName.trim()) { setFormError('Enter your name'); return; }
    setLoading(true);
    setFormError('');
    try {
      const { roomId } = await createRoom(playerName.trim(), false, address, category);
      if (chain === 'on') recordRoomOnChain(roomId); // non-blocking; only when host opted in
      router.push(`/game/${roomId}`);
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : 'Failed to create room');
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!playerName.trim()) { setFormError('Enter your name'); return; }
    if (!roomCode.trim()) { setFormError('Enter a room code'); return; }
    setLoading(true);
    setFormError('');
    try {
      await joinRoom(roomCode.trim().toUpperCase(), playerName.trim(), address);
      router.push(`/game/${roomCode.trim().toUpperCase()}`);
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : 'Failed to join room');
      setLoading(false);
    }
  };

  const handleDemo = async () => {
    if (!playerName.trim()) { setFormError('Enter your name to start the demo'); return; }
    setLoading(true);
    setFormError('');
    try {
      const { roomId } = await createRoom(playerName.trim(), true, undefined, category);
      router.push(`/game/${roomId}`);
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : 'Failed to start demo');
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-bg text-ink flex flex-col overflow-x-hidden">
      {/* Ambient background glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/4 w-[32rem] h-[32rem] bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -right-40 w-[28rem] h-[28rem] bg-accent-blue/10 rounded-full blur-3xl" />
      </div>

      {/* ─── Top bar ─────────────────────────────────────────────────── */}
      <header className="relative z-40 border-b border-outline/60 backdrop-blur">
        <nav className="flex justify-between items-center w-full px-4 sm:px-8 h-16 max-w-6xl mx-auto gap-3">
          <span className="font-display font-bold text-xl sm:text-2xl tracking-tight whitespace-nowrap">
            Signal <span className="text-ink-variant font-normal">vs</span> Noise
          </span>
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setShowHowTo(true)}
              className="rounded-lg px-3 sm:px-4 py-2 text-sm font-medium text-ink-variant hover:text-ink border border-transparent hover:border-outline transition-colors"
            >
              How to play
            </button>
            <ConnectWallet />
          </div>
        </nav>
      </header>

      {/* ─── Hero ────────────────────────────────────────────────────── */}
      <main className="relative z-20 flex-grow flex flex-col">
        {/* ─── Hero — one full viewport ─────────────────────────────── */}
        <section className="relative min-h-[calc(100vh-4rem)] flex flex-col items-center justify-end text-center px-4 pb-[5vh] sm:pb-[7vh]">
          {/* Tagline */}
          <p className="absolute top-20 sm:top-28 left-1/2 -translate-x-1/2 w-full px-4 text-ink-variant text-sm max-w-xs sm:max-w-sm leading-relaxed">
            Four players, five clues. Only you know who&apos;s lying — trust the signal, block the noise.
          </p>

          {/* Signal · compass · Noise (full-bleed, screenshot proportions) */}
          <div className="w-full flex items-center justify-center gap-2 sm:gap-4 select-none">
            <span className="flex-1 min-w-0 text-right font-display font-bold leading-none tracking-tight text-ink text-[clamp(2.5rem,14vw,11rem)]">
              Signal
            </span>
            <Compass className="w-[clamp(96px,22vw,320px)] shrink-0" />
            <span className="flex-1 min-w-0 text-left font-display font-bold leading-none tracking-tight text-ink-variant text-[clamp(2.5rem,14vw,11rem)]">
              Noise
            </span>
          </div>

          {/* Built on Fhenix */}
          <p className="mt-8 sm:mt-10 text-sm text-ink-variant">
            Built on <span className="text-primary font-medium">Fhenix</span>
          </p>

          {/* Scroll cue */}
          <button
            onClick={() => document.getElementById('join')?.scrollIntoView({ behavior: 'smooth' })}
            aria-label="Scroll to join"
            className="absolute bottom-6 left-1/2 -translate-x-1/2 text-ink-variant/60 hover:text-ink text-2xl animate-bounce"
          >
            ↓
          </button>
        </section>

        {/* ─── Join (scroll target) ─────────────────────────────────── */}
        <section id="join" className="min-h-screen flex flex-col items-center justify-center text-center px-4 py-16">
          <h2 className="font-display font-bold text-3xl sm:text-4xl tracking-tight mb-3">Ready to play?</h2>
          <p className="text-ink-variant mb-8 max-w-sm">
            Create a room and share the code, join a friend&apos;s room, or run a solo demo against bots.
          </p>

          {/* Name input */}
          <div className="w-full max-w-sm mb-5">
            <Input
              type="text"
              placeholder="Your name"
              value={playerName}
              onChange={e => setPlayerName(e.target.value)}
              maxLength={20}
            />
          </div>

          {formError && <p className="text-accent-red text-sm mb-4">{formError}</p>}

          {mode === 'idle' && (
            <div className="w-full max-w-sm flex flex-col gap-3 animate-fade-in">
              <div className="flex flex-col sm:flex-row gap-3">
                <Button onClick={() => { setMode('create'); setFormError(''); }} size="lg" className="flex-1">
                  Create room
                </Button>
                <Button variant="secondary" onClick={() => { setMode('join'); setFormError(''); }} size="lg" className="flex-1">
                  Join room
                </Button>
              </div>
              <Button variant="ghost" onClick={handleDemo} disabled={loading || !connected} size="sm">
                {loading ? 'Starting…' : !connected ? 'Connecting…' : '▶ Play solo demo vs bots'}
              </Button>
            </div>
          )}

          {mode === 'create' && (
            <Card glow="green" className="w-full max-w-sm p-6 space-y-4 text-left animate-scale-in">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">Create a room</h2>
                <button onClick={() => { setMode('idle'); setFormError(''); }} className="text-ink-variant hover:text-ink text-sm">✕</button>
              </div>
              <Input
                label="Your name"
                type="text"
                placeholder="e.g. Alex"
                value={playerName}
                onChange={e => setPlayerName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
                maxLength={20}
                autoFocus
              />

              {/* Game mode — off-chain vs on-chain */}
              <div>
                <label className="text-ink-variant text-xs font-medium block mb-2">Game mode</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setChain('off')}
                    className={`px-3 py-2.5 border text-center transition-colors ${
                      chain === 'off' ? 'border-primary bg-primary/10 text-ink' : 'border-outline text-ink-variant hover:border-outline-strong'
                    }`}
                  >
                    <span className="text-sm font-semibold">⚡ Off-chain</span>
                    <span className="block text-[10px] text-ink-variant/70 mt-0.5">Fast · no wallet</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setChain('on')}
                    className={`px-3 py-2.5 border text-center transition-colors ${
                      chain === 'on' ? 'border-primary bg-primary/10 text-ink' : 'border-outline text-ink-variant hover:border-outline-strong'
                    }`}
                  >
                    <span className="text-sm font-semibold">🔗 On-chain</span>
                    <span className="block text-[10px] text-ink-variant/70 mt-0.5">Records to Arbitrum</span>
                  </button>
                </div>
                {chain === 'on' && (
                  <div className="mt-2 text-xs">
                    {!isConnected ? (
                      <div className="flex items-center justify-between gap-2 bg-white/5 border border-outline px-3 py-2">
                        <span className="text-ink-variant">Connect a wallet to record the room on-chain.</span>
                        <ConnectWallet />
                      </div>
                    ) : !onRightChain ? (
                      <p className="text-accent-yellow">Wrong network — switch to Arbitrum Sepolia to record on-chain (the game still plays either way).</p>
                    ) : (
                      <p className="text-primary">✓ This room will be recorded on-chain when you create it.</p>
                    )}
                  </div>
                )}
              </div>

              {/* Word category — the theme for the game */}
              <div>
                <label className="text-ink-variant text-xs font-medium block mb-2">Word category</label>
                <div className="grid grid-cols-3 gap-2">
                  {CATEGORIES.map(c => (
                    <button
                      key={c.key}
                      type="button"
                      onClick={() => setCategory(c.key)}
                      className={`px-2 py-2 border text-center transition-colors ${
                        category === c.key ? 'border-primary bg-primary/10 text-ink' : 'border-outline text-ink-variant hover:border-outline-strong'
                      }`}
                    >
                      <span className="text-base leading-none block">{c.emoji}</span>
                      <span className="block text-[10px] leading-tight mt-1">{c.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <Button onClick={handleCreate} disabled={loading || !connected} fullWidth>
                {loading ? 'Creating…' : 'Create game →'}
              </Button>
            </Card>
          )}

          {mode === 'join' && (
            <Card glow="green" className="w-full max-w-sm p-6 space-y-4 text-left animate-scale-in">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">Join a room</h2>
                <button onClick={() => { setMode('idle'); setFormError(''); }} className="text-ink-variant hover:text-ink text-sm">✕</button>
              </div>
              <Input
                label="Your name"
                type="text"
                placeholder="e.g. Alex"
                value={playerName}
                onChange={e => setPlayerName(e.target.value)}
                maxLength={20}
                autoFocus
              />
              <Input
                label="Room code"
                type="text"
                placeholder="e.g. XJ92"
                value={roomCode}
                onChange={e => setRoomCode(e.target.value.toUpperCase())}
                onKeyDown={e => e.key === 'Enter' && handleJoin()}
                maxLength={6}
                className="tracking-widest uppercase font-mono"
              />
              <Button onClick={handleJoin} disabled={loading || !connected} fullWidth>
                {loading ? 'Joining…' : 'Join game →'}
              </Button>
            </Card>
          )}

        </section>
      </main>

      {showHowTo && <HowToPlayModal onClose={() => setShowHowTo(false)} />}
    </div>
  );
}

function Compass({ className }: { className?: string }) {
  const C = 100;
  // Round to 3 decimals so server- and client-rendered SVG strings are
  // byte-identical (raw Math.cos/sin floats differ in their last digits
  // across environments and cause a React hydration mismatch).
  const r3 = (v: number) => Math.round(v * 1000) / 1000;
  const ticks = Array.from({ length: 72 }, (_, i) => {
    const angle = i * 5;
    const long = i % 9 === 0;
    const rad = ((angle - 90) * Math.PI) / 180;
    const rOuter = 90;
    const rInner = long ? 76 : 83;
    return {
      x1: r3(C + rOuter * Math.cos(rad)),
      y1: r3(C + rOuter * Math.sin(rad)),
      x2: r3(C + rInner * Math.cos(rad)),
      y2: r3(C + rInner * Math.sin(rad)),
      long,
    };
  });

  return (
    <svg viewBox="0 0 200 200" className={className} role="img" aria-label="Compass">
      <defs>
        <radialGradient id="face" cx="50%" cy="40%" r="70%">
          <stop offset="0%" stopColor="#12303f" />
          <stop offset="100%" stopColor="#001623" />
        </radialGradient>
      </defs>

      {/* rings */}
      <circle cx={C} cy={C} r="98" fill="#0a2634" stroke="#33454f" strokeWidth="1.5" />
      <circle cx={C} cy={C} r="90" fill="url(#face)" stroke="#33454f" strokeWidth="1" />
      <circle cx={C} cy={C} r="70" fill="none" stroke="#33454f" strokeWidth="0.75" opacity="0.6" />

      {/* ticks */}
      {ticks.map((t, i) => (
        <line
          key={i}
          x1={t.x1}
          y1={t.y1}
          x2={t.x2}
          y2={t.y2}
          stroke={t.long ? '#c3ced4' : '#33454f'}
          strokeWidth={t.long ? 1.4 : 0.8}
        />
      ))}

      {/* cardinal labels */}
      <g fill="#c3ced4" fontFamily="var(--font-mono)" fontSize="11" fontWeight="700" textAnchor="middle">
        <text x={C} y="38">N</text>
        <text x="166" y="105">E</text>
        <text x={C} y="172">S</text>
        <text x="34" y="105">W</text>
      </g>

      {/* needle (animated) */}
      <g className="compass-needle">
        <polygon points="100,44 93,102 107,102" fill="#0ad9dc" />
        <polygon points="100,156 93,98 107,98" fill="#3c5561" />
      </g>

      {/* hub */}
      <circle cx={C} cy={C} r="11" fill="#0a2634" stroke="#33454f" strokeWidth="1" />
      <text x={C} y="104" fill="#0ad9dc" fontFamily="var(--font-mono)" fontSize="9" fontWeight="700" textAnchor="middle">
        SN
      </text>
    </svg>
  );
}

function HowToPlayModal({ onClose }: { onClose: () => void }) {
  const roles = [
    { name: 'Guesser', color: 'text-accent-yellow', desc: 'Sees the 5 shuffled clues and must name the secret word.' },
    { name: 'Helper', color: 'text-accent-green', desc: 'Knows the word, submits 3 honest clues to guide their teammate.' },
    { name: 'Saboteur', color: 'text-accent-red', desc: 'On the other team — slips in 2 misleading clues to derail the guess.' },
    { name: 'Observer', color: 'text-ink-variant', desc: 'Sits the round out and watches it unfold.' },
  ];
  const steps = [
    'Two teams of two. Every round one player is the Guesser, their teammate is the Helper, and an opponent is the Saboteur.',
    'The Helper writes 3 honest clues; the Saboteur writes 2 misleading ones. Clues are single words and can\'t contain part of the secret word.',
    'All 5 clues are shuffled and shown to the Guesser as cards labelled C1–C5 — with no hint of which are real.',
    'The Guesser has 25 seconds to name the word. Right = your team scores; wrong (or time out) = the other team scores.',
    'Roles rotate over 8 rounds. Highest score wins.',
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <Card
        glow="green"
        className="relative w-full max-w-lg max-h-[85vh] overflow-y-auto p-6 sm:p-8 text-left animate-scale-in"
      >
        <div onClick={e => e.stopPropagation()}>
          <div className="flex items-start justify-between mb-1">
            <h2 className="font-display font-bold text-2xl tracking-tight">How to play</h2>
            <button onClick={onClose} className="text-ink-variant hover:text-ink text-lg -mt-1" aria-label="Close">✕</button>
          </div>
          <p className="text-ink-variant text-sm mb-6">
            A 4-player deduction game. Separate the honest signal from the sabotage.
          </p>

          <h3 className="font-semibold text-sm mb-3">The roles</h3>
          <div className="space-y-2 mb-6">
            {roles.map(r => (
              <div key={r.name} className="flex gap-3">
                <span className={`w-20 shrink-0 font-semibold text-sm ${r.color}`}>{r.name}</span>
                <span className="text-ink-variant text-sm">{r.desc}</span>
              </div>
            ))}
          </div>

          <h3 className="font-semibold text-sm mb-3">Each round</h3>
          <ol className="space-y-3 mb-6">
            {steps.map((s, i) => (
              <li key={i} className="flex gap-3 text-sm">
                <span className="w-6 h-6 shrink-0 rounded-full bg-primary/15 text-primary font-semibold flex items-center justify-center text-xs">
                  {i + 1}
                </span>
                <span className="text-ink-variant leading-relaxed">{s}</span>
              </li>
            ))}
          </ol>

          <Button fullWidth onClick={onClose}>Got it</Button>
        </div>
      </Card>
    </div>
  );
}
