// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {
    FHE,
    euint256,
    ebool,
    InEuint256,
    InEbool
} from "@fhenixprotocol/cofhe-contracts/FHE.sol";

/**
 * @title  SignalVsNoise
 * @notice On-chain, FHE-secured engine for the "Signal vs Noise" word-deduction
 *         game, built on Fhenix CoFHE.
 *
 *         Two teams of two play 8 rounds. Each round has a Guesser, a Helper
 *         (the guesser's teammate), a Saboteur (an opponent), and an Observer
 *         (the other opponent).
 *
 *         What FHE buys us — the whole point of the game made trustless:
 *
 *         1. SECRET WORD. Stored as an encrypted `euint256` (the keccak256 of
 *            the word). Decryption access is granted to the Helper, Saboteur and
 *            Observer — but NEVER the Guesser. So "the guesser can't see the
 *            word" is enforced by cryptography, not by trusting a server.
 *
 *         2. CLUE TRUTH-FLAGS. Each of the 5 clues carries a public text hash
 *            (the guesser sees the clue words) plus an encrypted `ebool` marking
 *            it honest or sabotage. Hidden during the guess, revealed at round
 *            end — proving no one tampered with which clues were real.
 *
 *         3. GUESS CHECK. The guesser submits an encrypted guess; the contract
 *            compares it to the secret with `FHE.eq` under encryption and
 *            decrypts only the yes/no result to award the point.
 *
 *         A trusted "master" (the game server / host) orchestrates rounds and
 *         relays committed clues; the real-time UI is driven off events.
 *
 *         Trust & threat model:
 *         - The `master` of a room is trusted to set roles, the secret word,
 *           and the clue flags honestly. It is the game server per room. FHE
 *           still guarantees the guesser can never read the word regardless.
 *         - `createGame` is permissionless, so a griefer could squat a specific
 *           `roomId` first. Rooms are keyed by server-chosen ids with entropy;
 *           if one is taken the server simply issues a fresh id.
 *         - No ETH is held or transferred; there is no reentrancy surface
 *           beyond the trusted CoFHE TaskManager, which never calls back.
 *         - `resolveTimeout` prevents an AFK guesser from freezing a room.
 */
contract SignalVsNoise {
    // ─── Types ──────────────────────────────────────────────────────────────

    uint8 public constant TOTAL_ROUNDS = 8;
    uint8 public constant CLUE_COUNT = 5;

    enum Phase {
        EMPTY, // 0 — room does not exist
        LOBBY, // 1 — created, waiting to start a round
        CLUES, // 2 — secret set, awaiting clue commitment
        GUESS, // 3 — clues committed, awaiting the guess
        RESOLVING, // 4 — guess in, decryption requested
        ROUND_END, // 5 — round scored, ready for next round
        GAME_OVER // 6 — all rounds played
    }

    struct Game {
        address master; // orchestrator (server/host)
        bool exists;
        Phase phase;
        uint8 round; // 1-based; 0 before the first round starts
        uint16 scoreA;
        uint16 scoreB;
        // Roles for the current round (indices into `players[roomId]`)
        uint8 guesser;
        uint8 helper;
        uint8 saboteur;
        uint8 observer;
        // Encrypted current-round state
        euint256 secret; // encrypted keccak256(word)
        euint256 guess; // encrypted keccak256(guess)
        ebool correct; // FHE.eq(guess, secret)
        bool decryptRequested;
    }

    // roomId => game
    mapping(uint256 => Game) private games;
    // roomId => the four player addresses
    mapping(uint256 => address[4]) private players;
    // roomId => team of each player (0 = Team A, 1 = Team B)
    mapping(uint256 => uint8[4]) private teams;
    // roomId => public commitment hashes of the 5 clue words
    mapping(uint256 => bytes32[5]) private clueTextHashes;
    // roomId => encrypted honest/sabotage flag per clue
    mapping(uint256 => ebool[5]) private clueFlags;

    // ─── Events (the server relays these to the live UI) ────────────────────

    event GameCreated(uint256 indexed roomId, address indexed master);
    event RoundStarted(
        uint256 indexed roomId,
        uint8 round,
        uint8 guesser,
        uint8 helper,
        uint8 saboteur,
        uint8 observer
    );
    event CluesSubmitted(uint256 indexed roomId, uint8 round);
    event GuessSubmitted(uint256 indexed roomId, uint8 round, address guesser);
    event RoundResolved(
        uint256 indexed roomId,
        uint8 round,
        bool correct,
        uint16 scoreA,
        uint16 scoreB
    );
    event GameOver(uint256 indexed roomId, uint16 scoreA, uint16 scoreB);

    // ─── Modifiers ──────────────────────────────────────────────────────────

    modifier onlyMaster(uint256 roomId) {
        require(games[roomId].master == msg.sender, "not master");
        _;
    }

    modifier inPhase(uint256 roomId, Phase p) {
        require(games[roomId].phase == p, "wrong phase");
        _;
    }

    // ─── Lifecycle ──────────────────────────────────────────────────────────

    /// @notice Create a room with its four players and their team assignments.
    /// @param _teams team per player: 0 = Team A, 1 = Team B (exactly 2 each).
    function createGame(
        uint256 roomId,
        address[4] calldata _players,
        uint8[4] calldata _teams
    ) external {
        Game storage g = games[roomId];
        require(!g.exists, "room exists");

        uint8 aCount = 0;
        for (uint256 i = 0; i < 4; i++) {
            require(_players[i] != address(0), "bad player");
            require(_teams[i] < 2, "bad team");
            if (_teams[i] == 0) aCount++;
            // all four players must be distinct addresses
            for (uint256 j = i + 1; j < 4; j++) {
                require(_players[i] != _players[j], "duplicate player");
            }
        }
        require(aCount == 2, "teams must be 2v2");

        g.master = msg.sender;
        g.exists = true;
        g.phase = Phase.LOBBY;
        players[roomId] = _players;
        teams[roomId] = _teams;

        emit GameCreated(roomId, msg.sender);
    }

    /// @notice Begin a round: set the encrypted secret word and the roles.
    ///         Decryption of the secret is granted to everyone but the guesser.
    /// @param secretIn encrypted keccak256(word) produced client-side (cofhejs).
    function startRound(
        uint256 roomId,
        uint8 guesserIdx,
        uint8 helperIdx,
        uint8 saboteurIdx,
        uint8 observerIdx,
        InEuint256 calldata secretIn
    ) external onlyMaster(roomId) {
        Game storage g = games[roomId];
        require(
            g.phase == Phase.LOBBY || g.phase == Phase.ROUND_END,
            "wrong phase"
        );
        require(g.round < TOTAL_ROUNDS, "game finished");
        _validRoles(guesserIdx, helperIdx, saboteurIdx, observerIdx);

        g.round += 1;
        g.guesser = guesserIdx;
        g.helper = helperIdx;
        g.saboteur = saboteurIdx;
        g.observer = observerIdx;
        g.decryptRequested = false;

        euint256 secret = FHE.asEuint256(secretIn);
        g.secret = secret;

        // Contract keeps access so it can compare + decrypt later.
        FHE.allowThis(secret);
        // Everyone EXCEPT the guesser may unseal the word client-side.
        address[4] storage p = players[roomId];
        FHE.allow(secret, p[helperIdx]);
        FHE.allow(secret, p[saboteurIdx]);
        FHE.allow(secret, p[observerIdx]);

        g.phase = Phase.CLUES;
        emit RoundStarted(
            roomId,
            g.round,
            guesserIdx,
            helperIdx,
            saboteurIdx,
            observerIdx
        );
    }

    /// @notice Commit the 5 clues: public text hashes + encrypted honest/fake
    ///         flags. Flag order is already shuffled off-chain, so position
    ///         reveals nothing about which are real.
    function submitClues(
        uint256 roomId,
        bytes32[5] calldata textHashes,
        InEbool[5] calldata realFlags
    ) external onlyMaster(roomId) inPhase(roomId, Phase.CLUES) {
        clueTextHashes[roomId] = textHashes;
        for (uint256 i = 0; i < CLUE_COUNT; i++) {
            ebool f = FHE.asEbool(realFlags[i]);
            clueFlags[roomId][i] = f;
            FHE.allowThis(f);
        }
        games[roomId].phase = Phase.GUESS;
        emit CluesSubmitted(roomId, games[roomId].round);
    }

    /// @notice The guesser submits an encrypted guess. The contract compares it
    ///         to the secret under encryption and requests decryption of the
    ///         result (and of the secret + clue flags, for the round-end reveal).
    /// @param guessIn encrypted keccak256(guess) produced client-side.
    function submitGuess(
        uint256 roomId,
        InEuint256 calldata guessIn
    ) external inPhase(roomId, Phase.GUESS) {
        Game storage g = games[roomId];
        require(msg.sender == players[roomId][g.guesser], "not the guesser");

        // Effects before interactions: lock the phase so the guess can't be
        // replayed or the round re-entered while decryption is in flight.
        g.decryptRequested = true;
        g.phase = Phase.RESOLVING;

        euint256 guess = FHE.asEuint256(guessIn);
        g.guess = guess;
        FHE.allowThis(guess);

        ebool correct = FHE.eq(guess, g.secret);
        g.correct = correct;
        FHE.allowThis(correct);

        // Kick off threshold decryption; results land in a later block.
        FHE.decrypt(correct); // → who scores
        FHE.decrypt(g.secret); // → reveal the word (round is over)
        for (uint256 i = 0; i < CLUE_COUNT; i++) {
            FHE.decrypt(clueFlags[roomId][i]); // → reveal honest vs sabotage
        }

        emit GuessSubmitted(roomId, g.round, msg.sender);
    }

    /// @notice Finalize once the correctness bit has decrypted: award the point
    ///         and advance the round (or end the game). Callable by anyone; it
    ///         reverts cleanly if decryption isn't ready yet.
    function finalizeRound(
        uint256 roomId
    ) external inPhase(roomId, Phase.RESOLVING) {
        Game storage g = games[roomId];
        require(g.decryptRequested, "no guess");

        (bool isCorrect, bool ready) = FHE.getDecryptResultSafe(g.correct);
        require(ready, "decrypting");

        // Correct → the guesser's team scores; wrong → the other team scores.
        uint8 guesserTeam = teams[roomId][g.guesser];
        bool teamAScores = (guesserTeam == 0) == isCorrect;
        if (teamAScores) g.scoreA += 1;
        else g.scoreB += 1;

        emit RoundResolved(roomId, g.round, isCorrect, g.scoreA, g.scoreB);

        if (g.round >= TOTAL_ROUNDS) {
            g.phase = Phase.GAME_OVER;
            emit GameOver(roomId, g.scoreA, g.scoreB);
        } else {
            g.phase = Phase.ROUND_END;
        }
    }

    /// @notice Liveness escape hatch: if the guesser never submits (their
    ///         off-chain timer ran out), the master resolves the round as a
    ///         miss — the guesser's team fails and the other team scores.
    ///         The word and clue flags are still revealed.
    function resolveTimeout(
        uint256 roomId
    ) external onlyMaster(roomId) inPhase(roomId, Phase.GUESS) {
        Game storage g = games[roomId];

        // Guesser missed → the OTHER team scores.
        uint8 guesserTeam = teams[roomId][g.guesser];
        if (guesserTeam == 0) g.scoreB += 1;
        else g.scoreA += 1;

        // Reveal the word and which clues were honest, same as a normal round.
        FHE.decrypt(g.secret);
        for (uint256 i = 0; i < CLUE_COUNT; i++) {
            FHE.decrypt(clueFlags[roomId][i]);
        }

        emit RoundResolved(roomId, g.round, false, g.scoreA, g.scoreB);

        if (g.round >= TOTAL_ROUNDS) {
            g.phase = Phase.GAME_OVER;
            emit GameOver(roomId, g.scoreA, g.scoreB);
        } else {
            g.phase = Phase.ROUND_END;
        }
    }

    // ─── Views ──────────────────────────────────────────────────────────────

    function getGame(
        uint256 roomId
    )
        external
        view
        returns (
            Phase phase,
            uint8 round,
            uint16 scoreA,
            uint16 scoreB,
            uint8 guesser,
            uint8 helper,
            uint8 saboteur,
            uint8 observer,
            address master
        )
    {
        Game storage g = games[roomId];
        require(g.exists, "no room");
        return (
            g.phase,
            g.round,
            g.scoreA,
            g.scoreB,
            g.guesser,
            g.helper,
            g.saboteur,
            g.observer,
            g.master
        );
    }

    function getPlayers(
        uint256 roomId
    ) external view returns (address[4] memory, uint8[4] memory) {
        return (players[roomId], teams[roomId]);
    }

    function getClueTextHashes(
        uint256 roomId
    ) external view returns (bytes32[5] memory) {
        return clueTextHashes[roomId];
    }

    /// @notice The encrypted secret handle (a permissioned player unseals it
    ///         client-side via cofhejs; the guesser has no access).
    function getSecretHandle(uint256 roomId) external view returns (euint256) {
        return games[roomId].secret;
    }

    /// @notice Decrypted honest/sabotage flags for the current round, once the
    ///         round-end reveal decryption has completed.
    function getClueReveal(
        uint256 roomId
    ) external view returns (bool[5] memory flags, bool ready) {
        ready = true;
        for (uint256 i = 0; i < CLUE_COUNT; i++) {
            (bool v, bool done) = FHE.getDecryptResultSafe(
                clueFlags[roomId][i]
            );
            if (!done) ready = false;
            flags[i] = v;
        }
    }

    /// @notice Decrypted secret word hash once revealed at round end.
    function getRevealedSecret(
        uint256 roomId
    ) external view returns (uint256 wordHash, bool ready) {
        return FHE.getDecryptResultSafe(games[roomId].secret);
    }

    // ─── Internal ───────────────────────────────────────────────────────────

    function _validRoles(uint8 a, uint8 b, uint8 c, uint8 d) private pure {
        require(a < 4 && b < 4 && c < 4 && d < 4, "role oob");
        // all four roles must map to distinct players
        require(
            a != b && a != c && a != d && b != c && b != d && c != d,
            "roles must be distinct"
        );
    }
}
