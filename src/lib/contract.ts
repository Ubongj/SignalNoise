import { keccak256, toBytes, type Address } from 'viem';
import abi from './abi/SignalVsNoise.json';

/**
 * Deployed SignalVsNoise address on Arbitrum Sepolia. Set after `forge script
 * Deploy` via NEXT_PUBLIC_SIGNAL_VS_NOISE_ADDRESS in .env.local.
 */
export const signalVsNoiseAddress = (process.env.NEXT_PUBLIC_SIGNAL_VS_NOISE_ADDRESS ||
  '0x0000000000000000000000000000000000000000') as Address;

export const signalVsNoiseAbi = abi;

export const isContractConfigured =
  signalVsNoiseAddress !== '0x0000000000000000000000000000000000000000';

/** On-chain phase enum, mirrored from the Solidity contract. */
export enum Phase {
  EMPTY,
  LOBBY,
  CLUES,
  GUESS,
  RESOLVING,
  ROUND_END,
  GAME_OVER,
}

/**
 * The contract stores the word/guess as an encrypted `keccak256` of the word.
 * The plaintext is normalized (trimmed + lowercased) so "Ocean", "OCEAN " and
 * "ocean" all hash equal — matching how the game compares words.
 */
export function wordHash(word: string): bigint {
  const normalized = word.trim().toLowerCase();
  return BigInt(keccak256(toBytes(normalized)));
}

/** Public commitment hash of a clue word (stored on-chain in the clear). */
export function clueTextHash(clue: string): `0x${string}` {
  return keccak256(toBytes(clue.trim().toLowerCase()));
}

/** Turn a room code (e.g. "XJ92") into the uint256 roomId used on-chain. */
export function roomIdFromCode(code: string): bigint {
  return BigInt(keccak256(toBytes(code.trim().toUpperCase())));
}
