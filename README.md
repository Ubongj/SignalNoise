# Signal vs Noise

A **4-player word-deduction party game** with a trustless, FHE-secured on-chain
layer. Two teams of two race over 8 rounds: each round one player is the
**Guesser**, their teammate the **Helper** (3 honest clues), and an opponent the
**Saboteur** (2 misleading clues). Separate the signal from the noise, guess the
word, score the point.

Built with **Next.js + Socket.IO** for real-time play, a **Fhenix CoFHE** smart
contract on **Arbitrum Sepolia** for the trustless bits, and **wagmi + RainbowKit**
for wallets.

---

## The idea

The game's whole tension — *"only you know who's lying"* — is made **provable**
with Fully Homomorphic Encryption:

- The **secret word** lives on-chain **encrypted**, decryptable by the Helper /
  Saboteur / Observer but **never the Guesser**. Enforced by cryptography, not by
  trusting a server.
- Each clue carries an encrypted **honest/sabotage flag**, hidden during the guess
  and revealed at round end — so no one can tamper with which clues were real.
- The guess is compared to the word **under encryption** (`FHE.eq`); only the
  yes/no result is decrypted to score.

---

## Architecture — four layers

| Layer | Where | What it does |
| --- | --- | --- |
| **Game UI** | `src/pages`, `src/components` | Landing + the 8 game-phase screens. |
| **Real-time server** | `server.js`, `src/hooks/useSocket.ts` | Socket.IO: timers, roles, bots, live state. The fast path. |
| **Smart contract** | `contracts/` | `SignalVsNoise.sol` — encrypted word/clues/guess + scoring on CoFHE. |
| **Web3 bridge** | `src/lib`, `src/components/web3` | wagmi/RainbowKit wallets, contract reads/writes, cofhejs encryption. |

**Hybrid model:** Socket.IO drives real-time play (no wallet needed — casual play
and bots always work). The contract is an **optional, additive** trust layer: when
the host has a wallet connected, the room is recorded on-chain. The game *never*
blocks on or breaks because of the chain.

---

## Status

| Piece | State |
| --- | --- |
| Full 8-round game (Socket.IO + bots) | ✅ Working |
| Revamped UI, mobile + desktop | ✅ Working |
| Contract deployed + verified (Arbitrum Sepolia) | ✅ `0x524F28e46eD5bcC3Ad7918F878b5024893DF3e83` |
| Contract tests (Foundry) | ✅ 20/20 passing + self-audit (`contracts/AUDIT.md`) |
| Wallet connect + on-chain read/write from UI | ✅ Working |
| Encrypted round end-to-end (**mock** mode) | ✅ `scripts/mock/mock-round.mjs` |
| Encrypted round on **live testnet** | ⛔ Blocked — cofhejs ↔ CoFHE version skew (external) |

---

## Getting started

```bash
npm install
npm run dev          # http://localhost:3000  (custom Socket.IO server)
```

> **Verify in a real browser (Chrome).** The heavy web3 dev bundle doesn't run in
> some embedded preview browsers. If a page shows *"missing required error
> components"*, the dev cache is stale — stop the server, `rm -rf .next`, restart.

Production:

```bash
npm run build
npm start             # NODE_ENV=production node server.js
```

### Environment (`.env.local`)

```
NEXT_PUBLIC_SIGNAL_VS_NOISE_ADDRESS=0x524F28e46eD5bcC3Ad7918F878b5024893DF3e83
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=      # free at cloud.reown.com — enables mobile wallets
NEXT_PUBLIC_SITE_URL=                       # prod URL (e.g. https://…) → absolute og:image for share cards
```

Injected wallets (MetaMask) work without the projectId; WalletConnect/mobile needs it.

---

## Smart contracts

Foundry project in [`contracts/`](contracts). See [`contracts/README.md`](contracts/README.md).

```bash
cd contracts
npm install           # pulls @fhenixprotocol/cofhe-contracts + mocks
forge build
forge test -vv        # 20 tests, incl. "guesser is cryptographically denied the word"
```

Deploy (needs a funded Arbitrum Sepolia wallet — set `PRIVATE_KEY` + RPC in `contracts/.env`):

```bash
forge script script/Deploy.s.sol:Deploy --rpc-url arbitrum_sepolia --broadcast
```

**Version note:** pinned to `@fhenixprotocol/cofhe-contracts@0.0.13` (matches the
mocks + the documented `FHE.decrypt` API; the `0.1.x` line is an unsupported
redesign).

---

## FHE: mock vs live

The encrypted flow is **proven end-to-end in mock mode** — run it yourself:

```bash
# terminal 1
anvil --chain-id 420105 --port 8545
# terminal 2
node scripts/mock/mock-round.mjs
```

It stands up the CoFHE mock coprocessor on a local node, deploys the contract, and
runs a full encrypted round via **cofhejs** (encrypt word → startRound → encrypt
flags → submitClues → encrypt guess → submitGuess → finalize). A correct guess
scores the right team.

**Live testnet is blocked:** `cofhejs@0.3.1` can't deserialize the FHE public key
currently published on Arbitrum Sepolia's CoFHE (a tfhe version mismatch — not our
code). When Fhenix aligns the versions, live encryption should work unchanged.

---

## Handy scripts

| Script | Does |
| --- | --- |
| `scripts/onchain-basic.mjs` | `createGame` + `getGame` against the live contract (no FHE). |
| `scripts/onchain-smoke.mjs` | Reproduces the live-testnet cofhejs key-version error. |
| `scripts/mock/mock-round.mjs` | Full encrypted round on a local CoFHE mock node. |

Also: **`/onchain`** page — a standalone UI to fire a real `createGame` tx from a
wallet and watch it confirm on Arbiscan.

---

## Known gotchas

- **Dev bundle + embedded browsers:** the unminified web3 dev bundle can fail to
  hydrate in some in-app preview browsers; use a normal Chrome, or a production build.
- **Wallet hydration:** anything rendering off `useAccount` must be gated with
  `useMounted` (`src/lib/useMounted.ts`) — wagmi reports the cached connection
  synchronously, so SSR + hydration mismatches otherwise.
- **Corrupted `.next`:** force-killing `node` mid-build can corrupt the dev cache
  (→ *"missing required error components"*). Fix: `rm -rf .next` and restart.
- **WalletConnect QR** (`Error: invalid border=0`): RainbowKit's `cuer@0.0.3`
  passes `border: 0`, which `qr@0.6.0` rejects. Fixed by a `package.json`
  `overrides` pin to `qr@0.5.5` (accepts `border: 0`). Don't remove it.

---

## Project layout

```
src/
  pages/            index (landing), game/[roomId], onchain
  components/game/   the 8 phase screens + ClueCard
  components/web3/   ConnectWallet, OnChainBadge
  lib/               contract.ts, wagmi.ts, cofhe.ts, useCofhe, useMounted
  hooks/useSocket.ts real-time client
server.js            Socket.IO game server (rooms, timers, bots)
contracts/           Foundry: SignalVsNoise.sol, tests, deploy, AUDIT.md
scripts/             on-chain + mock FHE demos
```
