import { useReadContract, useWriteContract } from 'wagmi';
import { type Address } from 'viem';
import {
  signalVsNoiseAddress,
  signalVsNoiseAbi,
  isContractConfigured,
  Phase,
} from './contract';
import { encryptUint256, encryptBools } from './cofhe';

const base = {
  address: signalVsNoiseAddress,
  abi: signalVsNoiseAbi,
} as const;

export interface OnChainGame {
  phase: Phase;
  round: number;
  scoreA: number;
  scoreB: number;
  guesser: number;
  helper: number;
  saboteur: number;
  observer: number;
  master: Address;
}

/** Live on-chain game state for a room (polls while the room is active). */
export function useOnChainGame(roomId: bigint | undefined) {
  const query = useReadContract({
    ...base,
    functionName: 'getGame',
    args: roomId !== undefined ? [roomId] : undefined,
    query: {
      enabled: isContractConfigured && roomId !== undefined,
      refetchInterval: 4000,
    },
  });

  const data = query.data as
    | readonly [number, number, number, number, number, number, number, number, Address]
    | undefined;

  const game: OnChainGame | undefined = data
    ? {
        phase: data[0] as Phase,
        round: Number(data[1]),
        scoreA: Number(data[2]),
        scoreB: Number(data[3]),
        guesser: Number(data[4]),
        helper: Number(data[5]),
        saboteur: Number(data[6]),
        observer: Number(data[7]),
        master: data[8],
      }
    : undefined;

  return { game, ...query };
}

/**
 * Write actions. The master (server/host) orchestrates rounds; the guesser
 * submits their own guess. Encryption happens client-side via cofhejs right
 * before the transaction.
 */
export function useSignalActions() {
  const { writeContractAsync, isPending } = useWriteContract();

  return {
    isPending,

    createGame: (roomId: bigint, players: [Address, Address, Address, Address], teams: [number, number, number, number]) =>
      writeContractAsync({ ...base, functionName: 'createGame', args: [roomId, players, teams] }),

    startRound: async (
      roomId: bigint,
      roles: { guesser: number; helper: number; saboteur: number; observer: number },
      wordHashValue: bigint,
    ) => {
      const secretIn = await encryptUint256(wordHashValue);
      return writeContractAsync({
        ...base,
        functionName: 'startRound',
        args: [roomId, roles.guesser, roles.helper, roles.saboteur, roles.observer, secretIn],
      });
    },

    submitClues: async (
      roomId: bigint,
      textHashes: [`0x${string}`, `0x${string}`, `0x${string}`, `0x${string}`, `0x${string}`],
      realFlags: [boolean, boolean, boolean, boolean, boolean],
    ) => {
      const flagsIn = await encryptBools(realFlags);
      return writeContractAsync({
        ...base,
        functionName: 'submitClues',
        args: [roomId, textHashes, flagsIn],
      });
    },

    submitGuess: async (roomId: bigint, guessHashValue: bigint) => {
      const guessIn = await encryptUint256(guessHashValue);
      return writeContractAsync({ ...base, functionName: 'submitGuess', args: [roomId, guessIn] });
    },

    finalizeRound: (roomId: bigint) =>
      writeContractAsync({ ...base, functionName: 'finalizeRound', args: [roomId] }),

    resolveTimeout: (roomId: bigint) =>
      writeContractAsync({ ...base, functionName: 'resolveTimeout', args: [roomId] }),
  };
}
