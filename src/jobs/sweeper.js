import cron from 'node-cron';
import { db } from '../config/database.js';
import { decryptPrivateKey } from '../services/blockchain/wallet.service.js';
import { providers } from '../services/blockchain/blockchain.service.js';
import { ethers } from 'ethers';
import { PLATFORM_COLLECTOR_ADDRESS as _COLLECTOR } from '../config/env.js';
const PLATFORM_COLLECTOR_ADDRESS = _COLLECTOR || '0xE69F1391454353A8Ff915eB153Ba8d901cF0Afdf'; // Ubora Collector Wallet BSC
import { createAuditLog } from '../services/audit/audit.service.js';
import { v4 as uuidv4 } from 'uuid';

const USDT_CONTRACT_ADDRESS = '0x55d398326f99059ff775485246999027b3197955';
const USDT_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)"
];

const SWEEP_INTERVAL_HOURS = 1;
const MIN_BNB_FOR_GAS_GWEI = 5;
const MIN_SWEEP_AMOUNT_USDT = 0.5;
const TX_TIMEOUT_MS = 60_000; // ✅ FIX: timeout de 60s par transaction blockchain

// ✅ FIX: verrou global pour éviter les doubles exécutions
let isRunning = false;

// ✅ FIX: wrapper avec timeout pour ne jamais bloquer sur tx.wait()
function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`Timeout après ${ms}ms`)), ms))
  ]);
}

cron.schedule(`0 */${SWEEP_INTERVAL_HOURS} * * *`, async () => {
  if (isRunning) {
    console.warn('⚠️ [Sweeper] Cycle précédent toujours en cours, skip.');
    return;
  }
  isRunning = true;
  console.log('🧹 Démarrage du sweeper...');

  if (!PLATFORM_COLLECTOR_ADDRESS || !ethers.isAddress(PLATFORM_COLLECTOR_ADDRESS)) {
    console.error('PLATFORM_COLLECTOR_ADDRESS invalide ou manquant.');
    isRunning = false;
    return;
  }

  const provider = providers.bsc;
  if (!provider) {
    console.error('Provider BSC non disponible.');
    isRunning = false;
    return;
  }

  try {
    const [users] = await db.query(
      `SELECT uuid, wallet_address, encrypted_private_key FROM users
       WHERE wallet_address IS NOT NULL AND encrypted_private_key IS NOT NULL`
    );

    for (const user of users) {
      if (!user.wallet_address || !user.encrypted_private_key) continue;

      const user_uuid = user.uuid;
      const userAddress = user.wallet_address;

      try {
        const privateKey = decryptPrivateKey(user.encrypted_private_key);
        const userWallet = new ethers.Wallet(privateKey, provider);
        const gasPrice = (await provider.getFeeData()).gasPrice;
        if (!gasPrice) continue;

        // Sweep BNB natif
        const bnbBalance = await provider.getBalance(userWallet.address);
        const estimatedBnbGas = gasPrice * BigInt(21000);
        const minBnbToSend = ethers.parseUnits(MIN_BNB_FOR_GAS_GWEI.toString(), 'gwei');

        if (bnbBalance > estimatedBnbGas + minBnbToSend) {
          const amountToSend = bnbBalance - estimatedBnbGas;
          if (amountToSend > 0) {
            const tx = await userWallet.sendTransaction({
              to: PLATFORM_COLLECTOR_ADDRESS,
              value: amountToSend,
              gasPrice
            });
            // ✅ FIX: timeout sur tx.wait() — ne bloque plus le sweep entier
            await withTimeout(tx.wait(), TX_TIMEOUT_MS);
            await createSweepTransactionRecord(user_uuid, userAddress, tx.hash, amountToSend.toString(), 'BNB');
          }
        }

        // Sweep USDT BEP-20
        const usdtContract = new ethers.Contract(USDT_CONTRACT_ADDRESS, USDT_ABI, userWallet);
        const usdtBalance = await usdtContract.balanceOf(userAddress);
        const usdtAmount = parseFloat(ethers.formatUnits(usdtBalance, 18));

        if (usdtAmount >= MIN_SWEEP_AMOUNT_USDT) {
          const estimatedUsdtGasCost = gasPrice * BigInt(60000);
          const currentBnbBalance = await provider.getBalance(userWallet.address);
          if (currentBnbBalance < estimatedUsdtGasCost) continue;

          const tx = await usdtContract.transfer(PLATFORM_COLLECTOR_ADDRESS, usdtBalance);
          // ✅ FIX: timeout sur tx.wait()
          await withTimeout(tx.wait(), TX_TIMEOUT_MS);
          await createSweepTransactionRecord(user_uuid, userAddress, tx.hash, usdtBalance.toString(), 'USDT');
        }

      } catch (userError) {
        // ✅ FIX: erreur isolée par utilisateur — les autres continuent
        console.error(`[Sweeper] Erreur pour ${user_uuid}:`, userError.message);
        await createAuditLog({
          event_type: 'SWEEP_FAILED',
          actor_uuid: 'system',
          actor_role: 'system',
          entity_type: 'USER',
          entity_uuid: user_uuid,
          metadata: { userAddress, error: userError.message },
        });
      }
    }
    console.log('🧹 Sweeper terminé.');
  } catch (error) {
    console.error('❌ Erreur critique sweeper:', error.message);
  } finally {
    isRunning = false;
  }
});

async function createSweepTransactionRecord(user_uuid, fromAddress, tx_hash, amount_raw, currency) {
  const tx_uuid = uuidv4();
  const amount = currency === 'BNB'
    ? ethers.formatEther(amount_raw)
    : ethers.formatUnits(amount_raw, 18);

  await db.query(
    `INSERT INTO transactions (uuid, user_uuid, type, method, amount, currency, status, tx_hash, network, created_at, updated_at)
     VALUES (?, ?, 'sweep', 'blockchain', ?, ?, 'CONFIRMED', ?, 'bsc', NOW(), NOW())`,
    [tx_uuid, user_uuid, amount, currency, tx_hash]
  );
}
