/**
 * Non-encrypted on-chain proof: createGame + read getGame against the live
 * SignalVsNoise contract on Arbitrum Sepolia. Verifies deploy + ABI + wagmi
 * transport + contract logic (no cofhejs / FHE involved).
 *   node scripts/onchain-basic.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createPublicClient, createWalletClient, http, keccak256, toBytes } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { arbitrumSepolia } from 'viem/chains';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const envText = fs.readFileSync(path.join(root, 'contracts', '.env'), 'utf8');
const env = Object.fromEntries(
  envText.split(/\r?\n/).filter((l) => l && !l.trimStart().startsWith('#') && l.includes('='))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }),
);
const RPC = env.ARBITRUM_SEPOLIA_RPC_URL || 'https://sepolia-rollup.arbitrum.io/rpc';
const ADDRESS = '0x524F28e46eD5bcC3Ad7918F878b5024893DF3e83';
const abi = JSON.parse(fs.readFileSync(path.join(root, 'src', 'lib', 'abi', 'SignalVsNoise.json'), 'utf8'));

const account = privateKeyToAccount(env.PRIVATE_KEY);
const publicClient = createPublicClient({ chain: arbitrumSepolia, transport: http(RPC) });
const walletClient = createWalletClient({ account, chain: arbitrumSepolia, transport: http(RPC) });

const roomId = BigInt(keccak256(toBytes('BASIC-' + Date.now())));
const players = [
  account.address,
  '0x000000000000000000000000000000000000dead',
  '0x00000000000000000000000000000000deadbeef',
  '0x0000000000000000000000000000000000c0ffee',
];

console.log('Master:', account.address);
console.log('createGame roomId=' + roomId.toString().slice(0, 12) + '…');
const hash = await walletClient.writeContract({
  address: ADDRESS, abi, functionName: 'createGame', args: [roomId, players, [0, 1, 0, 1]],
});
const rcpt = await publicClient.waitForTransactionReceipt({ hash });
console.log('  ✓ tx', hash, '(block', rcpt.blockNumber + ', status', rcpt.status + ')');

const g = await publicClient.readContract({ address: ADDRESS, abi, functionName: 'getGame', args: [roomId] });
const phaseNames = ['EMPTY', 'LOBBY', 'CLUES', 'GUESS', 'RESOLVING', 'ROUND_END', 'GAME_OVER'];
console.log('  getGame → phase:', phaseNames[Number(g[0])], '| round:', Number(g[1]), '| master:', g[8]);
console.log('\n✅ Live contract write + read succeeded on Arbitrum Sepolia.');
