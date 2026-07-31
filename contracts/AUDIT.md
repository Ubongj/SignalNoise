# SignalVsNoise — Security Audit Notes

Self-audit of [`src/SignalVsNoise.sol`](src/SignalVsNoise.sol). Tooling:
**Slither 0.11.6** (static analysis) + **Foundry** adversarial tests (20, all
passing) against the CoFHE mocks.

> Not a substitute for a professional third-party audit before mainnet or
> value-bearing use. This is a testnet game with no funds at stake.

## Method

- `slither . --filter-paths "node_modules|lib"` → 13 results, all
  low/informational (see below).
- `forge test` → 20 tests: access control, input validation, phase integrity,
  liveness, the FHE access-control property, and a full 8-round game.

## Findings & resolutions

| # | Severity | Issue | Status |
|---|----------|-------|--------|
| 1 | Medium | **AFK-guesser liveness.** A guesser who never submits froze the round in `GUESS` forever. | **Fixed** — added `resolveTimeout` (master-only, `GUESS` phase) scoring the round as a miss and advancing. Tested. |
| 2 | Low | **Duplicate players.** `createGame` verified 2v2 teams but not that the 4 addresses were distinct; duplicates corrupt role/allow logic. | **Fixed** — require all four addresses distinct. Tested. |
| 3 | Low | **CEI ordering.** Phase was set after the FHE decrypt batch in `submitGuess`. | **Fixed** — phase/flag set before external calls. |
| 4 | Info | `aCount` uninitialized-local (Slither). | **Fixed** — explicit `= 0`. |
| 5 | Info | Reentrancy detectors on `FHE.*` calls. | **Acknowledged — not exploitable.** Calls target the trusted CoFHE `TaskManager` system contract, which never calls back; no ETH is handled. Standard for FHE contracts. |
| 6 | Info | `_players` / `_teams` naming-convention. | **Won't fix** — leading underscore is the conventional marker for these params. |

## Design-level trust assumptions (documented, by design)

- **Master is trusted.** The per-room `master` (the game server) sets roles, the
  secret, and clue flags. A dishonest master can mis-run its own room. This is
  the intended hybrid model. FHE still guarantees the **guesser can never read
  the word**, verified in `test_guesserDeniedWordAccess_helperAllowed` directly
  against the ACL.
- **`createGame` is permissionless**, so a griefer could squat a specific
  `roomId`. Mitigation: server-chosen ids with entropy; reissue if taken.

## Properties verified by tests

- Guesser is denied decrypt access to the word; helper/saboteur/observer are granted it.
- Correct guess → guesser's team scores; wrong/timeout → other team scores.
- Clue truth-flags decrypt to the exact honest/sabotage pattern committed.
- Only the guesser can guess; only the master can orchestrate.
- No double-guess, no phase-skipping, no round past 8, no duplicate rooms.
- Full 8-round game reaches `GAME_OVER` with correct scoring.

## Not covered (out of scope here)

- Formal verification / economic-incentive analysis.
- On-chain enforcement of clue rules (single word, no word-part) — enforced
  client + server side; on-chain clues are opaque commitments.
