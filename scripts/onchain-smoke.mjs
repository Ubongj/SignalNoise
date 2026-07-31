/**
 * On-chain smoke test: runs the real encrypted round-start flow against the
 * live SignalVsNoise contract on Arbitrum Sepolia, using the deployer wallet.
 *
 *   createGame  →  startRound (encrypted word via cofhejs)  →  read getGame
 *
 * Proves the full encrypted write path works on real testnet. Run:
 *   node scripts/onchain-smoke.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import {
  createPublicClient,
  createWalletClient,
  http,
  keccak256,
  toBytes,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { arbitrumSepolia } from 'viem/chains';

// cofhejs's ESM node bundle mis-handles dynamic require of built-ins; the CJS
// build works fine, so load it through createRequire.
const require = createRequire(import.meta.url);
const { cofhejs, Encryptable } = require('cofhejs/node');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

// ── load PRIVATE_KEY + RPC from contracts/.env ──────────────────────────────
const envText = fs.readFileSync(path.join(root, 'contracts', '.env'), 'utf8');
const env = Object.fromEntries(
  envText
    .split(/\r?\n/)
    .filter((l) => l && !l.trimStart().startsWith('#') && l.includes('='))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);
const PRIVATE_KEY = env.PRIVATE_KEY;
const RPC = env.ARBITRUM_SEPOLIA_RPC_URL || 'https://sepolia-rollup.arbitrum.io/rpc';
if (!PRIVATE_KEY) throw new Error('PRIVATE_KEY missing in contracts/.env');

const ADDRESS = '0x524F28e46eD5bcC3Ad7918F878b5024893DF3e83';
const abi = JSON.parse(
  fs.readFileSync(path.join(root, 'src', 'lib', 'abi', 'SignalVsNoise.json'), 'utf8'),
);

const ok = (r, label) => {
  if (r?.error) throw new Error(`${label} failed: ${JSON.stringify(r.error)}`);
  return r?.data ?? r;
};

async function main() {
  const account = privateKeyToAccount(PRIVATE_KEY);
  const publicClient = createPublicClient({ chain: arbitrumSepolia, transport: http(RPC) });
  const walletClient = createWalletClient({ account, chain: arbitrumSepolia, transport: http(RPC) });
  console.log('Deployer / guesser:', account.address);

  // 1) cofhejs init (fetches network FHE keys, mints a signed permit)
  console.log('\n[1/4] Initializing cofhejs (TESTNET)…');
  const initRes = await cofhejs.initializeWithViem({
    viemClient: publicClient,
    viemWalletClient: walletClient,
    environment: 'TESTNET',
    generatePermit: true,
  });
  if (initRes?.error) {
    console.error('  raw error:', JSON.stringify(initRes.error, Object.getOwnPropertyNames(initRes.error || {}), 2));
    console.error('  cause    :', initRes.error?.cause);
    throw new Error('cofhejs init failed (see above)');
  }
  console.log('      ✓ initialized');

  // 2) createGame — 4 distinct players, teams A,B,A,B; guesser = index 0 (us)
  const roomId = BigInt(keccak256(toBytes('SMOKE-' + Date.now())));
  const players = [
    account.address,
    '0x000000000000000000000000000000000000dead',
    '0x00000000000000000000000000000000deadbeef',
    '0x0000000000000000000000000000000000c0ffee',
  ];
  const teams = [0, 1, 0, 1];
  console.log('\n[2/4] createGame  roomId=' + roomId.toString().slice(0, 12) + '…');
  let hash = await walletClient.writeContract({
    address: ADDRESS,
    abi,
    functionName: 'createGame',
    args: [roomId, players, teams],
  });
  await publicClient.waitForTransactionReceipt({ hash });
  console.log('      ✓ tx', hash);

  // 3) startRound — encrypt keccak256("ocean") and submit
  const wordHash = BigInt(keccak256(toBytes('ocean')));
  console.log('\n[3/4] Encrypting word + startRound…');
  const [secretIn] = ok(await cofhejs.encrypt([Encryptable.uint256(wordHash)]), 'encrypt');
  console.log('      encrypted input keys:', Object.keys(secretIn));
  hash = await walletClient.writeContract({
    address: ADDRESS,
    abi,
    functionName: 'startRound',
    args: [roomId, 0, 2, 1, 3, secretIn],
  });
  const rcpt = await publicClient.waitForTransactionReceipt({ hash });
  console.log('      ✓ encrypted tx', hash, '(block', rcpt.blockNumber + ')');

  // 4) read back on-chain state
  console.log('\n[4/4] Reading getGame…');
  const g = await publicClient.readContract({ address: ADDRESS, abi, functionName: 'getGame', args: [roomId] });
  const phaseNames = ['EMPTY', 'LOBBY', 'CLUES', 'GUESS', 'RESOLVING', 'ROUND_END', 'GAME_OVER'];
  console.log('      phase   :', phaseNames[Number(g[0])]);
  console.log('      round   :', Number(g[1]));
  console.log('      scores  : A', Number(g[2]), '/ B', Number(g[3]));
  console.log('      roles   : guesser', Number(g[4]), 'helper', Number(g[5]), 'sab', Number(g[6]), 'obs', Number(g[7]));

  console.log('\n✅ Encrypted round-start round-trip succeeded on Arbitrum Sepolia.');
}

main().catch((e) => {
  console.error('\n❌', e.message || e);
  process.exit(1);
});
