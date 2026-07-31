// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {CoFheTest} from "@fhenixprotocol/cofhe-mock-contracts/CoFheTest.sol";
import {SignalVsNoise} from "../src/SignalVsNoise.sol";
import {euint256, InEuint256, InEbool} from "@fhenixprotocol/cofhe-contracts/FHE.sol";

contract SignalVsNoiseTest is CoFheTest {
    SignalVsNoise internal game;

    address internal master = address(0x1000);
    address internal p0 = address(0xA0); // Team A
    address internal p1 = address(0xB1); // Team B
    address internal p2 = address(0xA2); // Team A
    address internal p3 = address(0xB3); // Team B

    uint256 internal constant ROOM = 42;
    uint256 internal constant WORD = uint256(keccak256("OCEAN"));

    function setUp() public {
        game = new SignalVsNoise();
        address[4] memory ps = [p0, p1, p2, p3];
        uint8[4] memory ts = [uint8(0), 1, 0, 1]; // A,B,A,B
        vm.prank(master);
        game.createGame(ROOM, ps, ts);
    }

    // Roles for round 1: guesser=p0(A), helper=p2(A), saboteur=p1(B), observer=p3(B)
    function _startRound(uint256 word) internal {
        InEuint256 memory secret = createInEuint256(word, 0, master);
        vm.prank(master);
        game.startRound(ROOM, 0, 2, 1, 3, secret);
    }

    function _submitClues() internal {
        bytes32[5] memory hashes = [
            keccak256("wave"),
            keccak256("bridge"),
            keccak256("blue"),
            keccak256("fish"),
            keccak256("desert")
        ];
        // 3 honest, 2 sabotage (order already shuffled off-chain)
        InEbool[5] memory flags = [
            createInEbool(true, master),
            createInEbool(false, master),
            createInEbool(true, master),
            createInEbool(true, master),
            createInEbool(false, master)
        ];
        vm.prank(master);
        game.submitClues(ROOM, hashes, flags);
    }

    function _guess(uint256 word) internal {
        InEuint256 memory g = createInEuint256(word, 0, p0);
        vm.prank(p0);
        game.submitGuess(ROOM, g);
    }

    // ── Core FHE property: the guesser cannot decrypt the word ──────────────

    function test_guesserDeniedWordAccess_helperAllowed() public {
        _startRound(WORD);
        uint256 handle = euint256.unwrap(game.getSecretHandle(ROOM));

        // Guesser (p0) must NOT be able to decrypt the secret word.
        assertFalse(acl.isAllowed(handle, p0), "guesser must not access word");
        // Helper (p2), Saboteur (p1) and Observer (p3) may.
        assertTrue(acl.isAllowed(handle, p2), "helper should access word");
        assertTrue(acl.isAllowed(handle, p1), "saboteur should access word");
        assertTrue(acl.isAllowed(handle, p3), "observer should access word");
    }

    // ── Correct guess → guesser's team (A) scores ──────────────────────────

    function test_correctGuess_scoresGuesserTeam() public {
        _startRound(WORD);
        _submitClues();
        _guess(WORD); // correct

        vm.warp(block.timestamp + 11); // let mock threshold-decrypt complete
        game.finalizeRound(ROOM);

        (, uint8 round, uint16 sA, uint16 sB, , , , , ) = game.getGame(ROOM);
        assertEq(round, 1);
        assertEq(sA, 1, "team A scores on correct guess");
        assertEq(sB, 0);
    }

    // ── Wrong guess → the OTHER team (B) scores ─────────────────────────────

    function test_wrongGuess_scoresOtherTeam() public {
        _startRound(WORD);
        _submitClues();
        _guess(uint256(keccak256("WRONG"))); // incorrect

        vm.warp(block.timestamp + 11);
        game.finalizeRound(ROOM);

        (, , uint16 sA, uint16 sB, , , , , ) = game.getGame(ROOM);
        assertEq(sA, 0);
        assertEq(sB, 1, "team B scores when guesser is wrong");
    }

    // ── Clue truth-flags decrypt correctly at round end ─────────────────────

    function test_clueRevealDecrypts() public {
        _startRound(WORD);
        _submitClues();
        _guess(WORD);

        vm.warp(block.timestamp + 11);
        (bool[5] memory flags, bool ready) = game.getClueReveal(ROOM);
        assertTrue(ready, "clue flags should be decrypted");
        assertTrue(flags[0]);
        assertFalse(flags[1]);
        assertTrue(flags[2]);
        assertTrue(flags[3]);
        assertFalse(flags[4]);
    }

    // ── Only the guesser may submit the guess ───────────────────────────────

    function test_onlyGuesserCanGuess() public {
        _startRound(WORD);
        _submitClues();
        InEuint256 memory g = createInEuint256(WORD, 0, p1);
        vm.prank(p1); // saboteur tries to guess
        vm.expectRevert(bytes("not the guesser"));
        game.submitGuess(ROOM, g);
    }

    // ── Finalize before decryption is ready reverts cleanly ─────────────────

    function test_finalizeBeforeReadyReverts() public {
        _startRound(WORD);
        _submitClues();
        _guess(WORD);
        // no warp → not ready
        vm.expectRevert(bytes("decrypting"));
        game.finalizeRound(ROOM);
    }

    // ═══ Security / adversarial ═════════════════════════════════════════════

    // ── Access control: non-master cannot orchestrate ───────────────────────

    function test_nonMasterCannotStartRound() public {
        InEuint256 memory secret = createInEuint256(WORD, 0, p0);
        vm.prank(p0);
        vm.expectRevert(bytes("not master"));
        game.startRound(ROOM, 0, 2, 1, 3, secret);
    }

    function test_nonMasterCannotSubmitClues() public {
        _startRound(WORD);
        bytes32[5] memory hashes;
        InEbool[5] memory flags = [
            createInEbool(true, p0),
            createInEbool(false, p0),
            createInEbool(true, p0),
            createInEbool(true, p0),
            createInEbool(false, p0)
        ];
        vm.prank(p0);
        vm.expectRevert(bytes("not master"));
        game.submitClues(ROOM, hashes, flags);
    }

    // ── Input validation on createGame ──────────────────────────────────────

    function test_createGame_rejectsDuplicatePlayers() public {
        address[4] memory ps = [p0, p0, p2, p3]; // p0 twice
        uint8[4] memory ts = [uint8(0), 1, 0, 1];
        vm.prank(master);
        vm.expectRevert(bytes("duplicate player"));
        game.createGame(999, ps, ts);
    }

    function test_createGame_rejectsLopsidedTeams() public {
        address[4] memory ps = [p0, p1, p2, p3];
        uint8[4] memory ts = [uint8(0), 0, 0, 1]; // 3 vs 1
        vm.prank(master);
        vm.expectRevert(bytes("teams must be 2v2"));
        game.createGame(999, ps, ts);
    }

    function test_cannotCreateDuplicateRoom() public {
        address[4] memory ps = [p0, p1, p2, p3];
        uint8[4] memory ts = [uint8(0), 1, 0, 1];
        vm.prank(master);
        vm.expectRevert(bytes("room exists"));
        game.createGame(ROOM, ps, ts); // ROOM already created in setUp
    }

    // ── Phase integrity: no double guess, no skipping phases ────────────────

    function test_cannotDoubleGuess() public {
        _startRound(WORD);
        _submitClues();
        _guess(WORD);
        // second guess: phase is now RESOLVING, not GUESS
        InEuint256 memory g2 = createInEuint256(WORD, 0, p0);
        vm.prank(p0);
        vm.expectRevert(bytes("wrong phase"));
        game.submitGuess(ROOM, g2);
    }

    function test_cannotGuessBeforeClues() public {
        _startRound(WORD); // phase = CLUES, not GUESS
        InEuint256 memory g = createInEuint256(WORD, 0, p0);
        vm.prank(p0);
        vm.expectRevert(bytes("wrong phase"));
        game.submitGuess(ROOM, g);
    }

    function test_cannotStartRoundWhileInProgress() public {
        _startRound(WORD); // now in CLUES
        InEuint256 memory secret = createInEuint256(WORD, 0, master);
        vm.prank(master);
        vm.expectRevert(bytes("wrong phase"));
        game.startRound(ROOM, 0, 2, 1, 3, secret);
    }

    function test_invalidRolesRejected() public {
        InEuint256 memory secret = createInEuint256(WORD, 0, master);
        vm.prank(master);
        vm.expectRevert(bytes("roles must be distinct"));
        game.startRound(ROOM, 0, 0, 1, 3, secret); // guesser == helper
    }

    // ── Liveness: AFK guesser can't freeze the room ─────────────────────────

    function test_resolveTimeout_scoresOtherTeam() public {
        _startRound(WORD);
        _submitClues();
        // guesser (team A) never guesses → master times out → team B scores
        vm.prank(master);
        game.resolveTimeout(ROOM);

        (SignalVsNoise.Phase phase, , uint16 sA, uint16 sB, , , , , ) = game
            .getGame(ROOM);
        assertEq(sA, 0);
        assertEq(sB, 1, "other team scores on timeout");
        assertEq(uint8(phase), uint8(SignalVsNoise.Phase.ROUND_END));
    }

    function test_resolveTimeout_onlyMaster() public {
        _startRound(WORD);
        _submitClues();
        vm.prank(p1);
        vm.expectRevert(bytes("not master"));
        game.resolveTimeout(ROOM);
    }

    function test_resolveTimeout_onlyInGuessPhase() public {
        _startRound(WORD); // CLUES phase
        vm.prank(master);
        vm.expectRevert(bytes("wrong phase"));
        game.resolveTimeout(ROOM);
    }

    // ── Full 8-round game runs to GAME_OVER ─────────────────────────────────

    function test_fullGameReachesGameOver() public {
        for (uint8 r = 0; r < 8; r++) {
            InEuint256 memory secret = createInEuint256(WORD, 0, master);
            vm.prank(master);
            game.startRound(ROOM, 0, 2, 1, 3, secret);
            _submitClues();
            _guess(WORD);
            vm.warp(block.timestamp + 11);
            game.finalizeRound(ROOM);
        }
        (SignalVsNoise.Phase phase, uint8 round, uint16 sA, , , , , , ) = game
            .getGame(ROOM);
        assertEq(round, 8);
        assertEq(sA, 8, "team A won every round");
        assertEq(uint8(phase), uint8(SignalVsNoise.Phase.GAME_OVER));
    }

    function test_cannotStartNinthRound() public {
        test_fullGameReachesGameOver(); // phase now GAME_OVER
        InEuint256 memory secret = createInEuint256(WORD, 0, master);
        vm.prank(master);
        vm.expectRevert(bytes("wrong phase"));
        game.startRound(ROOM, 0, 2, 1, 3, secret);
    }
}
