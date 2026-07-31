# Signal vs Noise — CoFHE contracts

On-chain, FHE-secured engine for the game, built on **Fhenix CoFHE** and targeting
**Arbitrum Sepolia**.

## What FHE secures

| Data | How | Why it matters |
| --- | --- | --- |
| **Secret word** | `euint256` of `keccak256(word)`, `FHE.allow`ed to Helper/Saboteur/Observer but **never the Guesser** | "The guesser can't peek" is enforced by cryptography, not server trust |
| **Clue truth-flags** | one `ebool` per clue (honest vs sabotage), decrypted at round end | Proves which clues were sabotage — no tampering possible |
| **The guess** | encrypted `euint256`; `FHE.eq` vs the secret under encryption; only the yes/no result is decrypted | Scoring without ever exposing the linkage on-chain |

The test [`test_guesserDeniedWordAccess_helperAllowed`](test/SignalVsNoise.t.sol)
asserts the core property directly against the ACL.

## Stack / versions

- Foundry (solc 0.8.25, EVM `cancun`)
- `@fhenixprotocol/cofhe-contracts@0.0.13` (matches the mocks + documented `FHE.decrypt` API)
- `@fhenixprotocol/cofhe-mock-contracts@0.3.1` for local testing (`CoFheTest`)

## Round lifecycle

`createGame` → `startRound` (sets encrypted word + roles) → `submitClues`
(hashes + encrypted flags) → `submitGuess` (guesser only; kicks off decryption)
→ `finalizeRound` (awards the point once decryption lands). 8 rounds, then `GAME_OVER`.

A trusted **master** (the game server) orchestrates and relays committed clues;
the real-time UI is driven off the emitted events.

## Commands

```bash
npm install            # pulls the CoFHE contracts + mocks
forge build
forge test -vv
```

Deploy to Arbitrum Sepolia (fund the deployer with test ETH first):

```bash
cp .env.example .env   # fill in RPC + PRIVATE_KEY
forge script script/Deploy.s.sol:Deploy --rpc-url arbitrum_sepolia --broadcast --verify
```

## Notes for Phase 3 (frontend)

- The ABI lives in `out/SignalVsNoise.sol/SignalVsNoise.json` after `forge build`.
- Clients build `InEuint256` / `InEbool` inputs and unseal permissioned values
  with **cofhejs**; the word/guess are `keccak256` of the lowercased word.
- In the mock, decryption results are ready ~1–10s after the request — tests
  `vm.warp(+11)`; on-chain, poll `finalizeRound` / the reveal getters.
