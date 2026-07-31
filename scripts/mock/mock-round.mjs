/**
 * FULL ENCRYPTED ROUND in mock mode.
 *
 * Stands up the CoFHE mock coprocessor on a local Anvil node (chainId 420105),
 * deploys SignalVsNoise there, then runs a complete round where cofhejs does the
 * real client-side encryption:
 *
 *   createGame → encrypt word → startRound → encrypt flags → submitClues
 *              → encrypt guess → submitGuess → advance time → finalizeRound
 *
 * Proves the cofhejs ⇄ contract encrypted flow that the live testnet can't run
 * yet (version skew). Requires: anvil --chain-id 420105 --port 8545 running.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import {
  createPublicClient, createWalletClient, createTestClient,
  http, keccak256, toBytes, defineChain,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { JsonRpcProvider, Wallet } from 'ethers';

const require = createRequire(import.meta.url);
const { cofhejs, Encryptable } = require('cofhejs/node');

const DEPLOYER_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const out = path.join(root, 'contracts', 'out');
const art = (p) => JSON.parse(fs.readFileSync(path.join(out, p), 'utf8'));

const RPC = 'http://localhost:8545';
const chain = defineChain({
  id: 420105, name: 'localfhenix',
  nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: [RPC] } },
});

// Fixed CoFHE mock addresses (from CoFheTest / FHE.sol)
const A = {
  TM: '0xeA30c4B8b44078Bbf8a6ef5b9f1eC1626C7848D9',
  ACL: '0xa6Ea4b5291d044D93b73b3CFf3109A1128663E8B',
  ZK: '0x0000000000000000000000000000000000000100',
  ZKS: '0x0000000000000000000000000000000000000101',
  QD: '0x0000000000000000000000000000000000000200',
  ADMIN: '0x0000000000000000000000000000000000000080',
  SIGNER: '0x6E12D8C87503D4287c294f2Fdef96ACd9DFf6bd2',
};

const tm = art('MockTaskManager.sol/TaskManager.json');
const acl = art('ACL.sol/ACL.json');
const zk = art('MockZkVerifier.sol/MockZkVerifier.json');
const zks = art('MockZkVerifierSigner.sol/MockZkVerifierSigner.json');
const qd = art('MockQueryDecrypter.sol/MockQueryDecrypter.json');
const svn = art('SignalVsNoise.sol/SignalVsNoise.json');

const deployer = privateKeyToAccount(DEPLOYER_KEY);
const pub = createPublicClient({ chain, transport: http(RPC) });
const test = createTestClient({ chain, mode: 'anvil', transport: http(RPC) });
const wallet = createWalletClient({ account: deployer, chain, transport: http(RPC) });
const admin = createWalletClient({ account: A.ADMIN, chain, transport: http(RPC) });

const ok = (r, label) => {
  if (r?.error) throw new Error(`${label}: ${JSON.stringify(r.error?.cause?.message || r.error)}`);
  return r?.data ?? r;
};
const wr = async (w, o) => { const h = await w.writeContract(o); await pub.waitForTransactionReceipt({ hash: h }); };
const svnWrite = (functionName, args) => wr(wallet, { address: SVN, abi: svn.abi, functionName, args });

let SVN;

async function main() {
  console.log('▸ Standing up CoFHE mocks on local Anvil (420105)…');
  await test.setCode({ address: A.TM, bytecode: tm.deployedBytecode.object });
  await test.setCode({ address: A.ACL, bytecode: acl.deployedBytecode.object });
  await test.setCode({ address: A.ZK, bytecode: zk.deployedBytecode.object });
  await test.setCode({ address: A.ZKS, bytecode: zks.deployedBytecode.object });
  await test.setCode({ address: A.QD, bytecode: qd.deployedBytecode.object });

  await test.setBalance({ address: A.ADMIN, value: 10n ** 18n });
  await test.impersonateAccount({ address: A.ADMIN });
  await wr(admin, { address: A.TM, abi: tm.abi, functionName: 'initialize', args: [A.ADMIN] });
  await wr(admin, { address: A.TM, abi: tm.abi, functionName: 'setSecurityZoneMin', args: [0] });
  await wr(admin, { address: A.TM, abi: tm.abi, functionName: 'setSecurityZoneMax', args: [1] });
  // Leave verifierSigner = address(0): the mock then skips input-signature
  // checks ("debug use case"), sidestepping the cofhejs↔mock sig-format skew.
  await wr(admin, { address: A.TM, abi: tm.abi, functionName: 'setACLContract', args: [A.ACL] });
  await test.stopImpersonatingAccount({ address: A.ADMIN });
  await wr(wallet, { address: A.QD, abi: qd.abi, functionName: 'initialize', args: [A.TM, A.ACL] });
  console.log('  ✓ mock coprocessor ready');

  console.log('▸ Deploying SignalVsNoise locally…');
  const dh = await wallet.deployContract({ abi: svn.abi, bytecode: svn.bytecode.object, args: [] });
  SVN = (await pub.waitForTransactionReceipt({ hash: dh })).contractAddress;
  console.log('  ✓', SVN);

  console.log('▸ Initializing cofhejs (MOCK, ethers signer)…');
  const provider = new JsonRpcProvider(RPC, undefined, { staticNetwork: true });
  const ethersSigner = new Wallet(DEPLOYER_KEY, provider);
  ok(await cofhejs.initializeWithEthers({
    ethersProvider: provider, ethersSigner, environment: 'MOCK', generatePermit: true,
    // MOCK encrypt sends an insertPackedCtHashes tx to the mock verifier; give
    // it a funded signer to send it with.
    mockConfig: { zkvSigner: ethersSigner },
  }), 'cofhejs init');
  console.log('  ✓ initialized');

  // Encrypt ALL inputs up front (contiguous cofhejs txs) so its internal nonce
  // manager never interleaves with our viem contract writes below.
  const wordHash = BigInt(keccak256(toBytes('ocean')));
  console.log('▸ Encrypting word, 5 clue flags, and guess via cofhejs…');
  const [secretIn] = ok(await cofhejs.encrypt([Encryptable.uint256(wordHash)]), 'encrypt word');
  const flags = ok(await cofhejs.encrypt(
    [true, false, true, true, false].map((b) => Encryptable.bool(b)),
  ), 'encrypt flags');
  const [guessIn] = ok(await cofhejs.encrypt([Encryptable.uint256(wordHash)]), 'encrypt guess');
  console.log('  ✓ all inputs encrypted');

  const roomId = BigInt(keccak256(toBytes('MOCK-' + Date.now())));
  const players = [
    deployer.address,
    '0x000000000000000000000000000000000000dead',
    '0x00000000000000000000000000000000deadbeef',
    '0x0000000000000000000000000000000000c0ffee',
  ];
  console.log('▸ createGame → startRound → submitClues → submitGuess…');
  await svnWrite('createGame', [roomId, players, [0, 1, 0, 1]]);
  await svnWrite('startRound', [roomId, 0, 2, 1, 3, secretIn]);
  const textHashes = ['wave', 'bridge', 'blue', 'fish', 'desert'].map((w) => keccak256(toBytes(w)));
  await svnWrite('submitClues', [roomId, textHashes, flags]);
  await svnWrite('submitGuess', [roomId, guessIn]);

  console.log('▸ advance time + finalizeRound…');
  await test.increaseTime({ seconds: 12 });
  await test.mine({ blocks: 1 });
  await svnWrite('finalizeRound', [roomId]);

  const g = await pub.readContract({ address: SVN, abi: svn.abi, functionName: 'getGame', args: [roomId] });
  const phases = ['EMPTY', 'LOBBY', 'CLUES', 'GUESS', 'RESOLVING', 'ROUND_END', 'GAME_OVER'];
  console.log('\n── Result ──');
  console.log('phase :', phases[Number(g[0])]);
  console.log('round :', Number(g[1]));
  console.log('score : A', Number(g[2]), '/ B', Number(g[3]));
  if (Number(g[2]) === 1) console.log('\n✅ Encrypted round succeeded — correct guess scored Team A (all inputs encrypted via cofhejs).');
  else throw new Error('unexpected score');
}

main().catch((e) => { console.error('\n❌', e.message || e); process.exit(1); });
