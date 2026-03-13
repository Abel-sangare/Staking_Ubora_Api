import cron from 'node-cron';
import { db } from '../config/database.js';
import { providers } from '../services/blockchain/blockchain.service.js';
import { ethers } from 'ethers';
import { platformHotWallet } from '../services/blockchain/blockchain.service.js';
// Hot Wallet BSC : 0x98ac56c6689008952e5eDecaF883e954F10281d4
// Doit être initialisé avec BSC_HOT_WALLET_PRIVATE_KEY dans .env
import { createAuditLog } from '../services/audit/audit.service.js';

const GAS_STATION_INTERVAL_MINUTES = 5;
const USDT_CONTRACT_ADDRESS = '0x55d398326f99059ff775485246999027b3197955';
const MIN_USDT_BALANCE_TO_FUND = 0.1;
const BNB_AMOUNT_TO_SEND = '0.0005';
const MIN_BNB_THRESHOLD = '0.0004';

// ✅ FIX: seuil de sécurité minimum du hot wallet
//    Si le hot wallet descend en dessous, la gas station s'arrête pour protéger les fonds
const HOT_WALLET_MIN_RESERVE_BNB = '0.05';

const USDT_ABI = ["function balanceOf(address owner) view returns (uint256)"];

// ✅ FIX: verrou global
let isRunning = false;

cron.schedule(`*/${GAS_STATION_INTERVAL_MINUTES} * * * *`, async () => {
  if (isRunning) {
    console.warn('⚠️ [Gas Station] Cycle précédent toujours en cours, skip.');
    return;
  }
  isRunning = true;

  if (!platformHotWallet) {
    console.error('[Gas Station] Hot wallet non configuré. Tâche annulée.');
    isRunning = false;
    return;
  }

  const provider = providers.bsc;
  if (!provider) {
    console.error('[Gas Station] Provider BSC non disponible.');
    isRunning = false;
    return;
  }

  try {
    // ✅ FIX: vérifier le solde du hot wallet AVANT de traiter les utilisateurs
    const hotWalletBalance = await provider.getBalance(platformHotWallet.address);
    const minReserveWei = ethers.parseEther(HOT_WALLET_MIN_RESERVE_BNB);

    if (hotWalletBalance < minReserveWei) {
      console.error(
        `❌ [Gas Station] Solde hot wallet insuffisant (${ethers.formatEther(hotWalletBalance)} BNB). ` +
        `Minimum requis : ${HOT_WALLET_MIN_RESERVE_BNB} BNB. Tâche annulée.`
      );
      await createAuditLog({
        event_type: 'GAS_STATION_LOW_RESERVE',
        actor_uuid: 'system',
        actor_role: 'system',
        entity_type: 'SYSTEM',
        metadata: {
          hotWalletBalance: ethers.formatEther(hotWalletBalance),
          minReserve: HOT_WALLET_MIN_RESERVE_BNB
        }
      });
      isRunning = false;
      return;
    }

    const [users] = await db.query(
      `SELECT uuid, wallet_address FROM users
       WHERE wallet_address IS NOT NULL AND encrypted_private_key IS NOT NULL`
    );

    const bnbToSendWei = ethers.parseEther(BNB_AMOUNT_TO_SEND);
    const minBnbThresholdWei = ethers.parseEther(MIN_BNB_THRESHOLD);
    const usdtContract = new ethers.Contract(USDT_CONTRACT_ADDRESS, USDT_ABI, provider);

    for (const user of users) {
      if (!user.wallet_address) continue;

      const userAddress = user.wallet_address;

      try {
        // ✅ FIX: re-vérifier le solde hot wallet à chaque itération
        const currentHotBalance = await provider.getBalance(platformHotWallet.address);
        if (currentHotBalance < minReserveWei + bnbToSendWei) {
          console.error('[Gas Station] Réserve hot wallet épuisée en cours de cycle. Arrêt.');
          break;
        }

        const bnbBalanceWei = await provider.getBalance(userAddress);
        if (bnbBalanceWei >= minBnbThresholdWei) continue;

        const usdtBalance = await usdtContract.balanceOf(userAddress);
        const usdtAmount = parseFloat(ethers.formatUnits(usdtBalance, 18));

        if (usdtAmount >= MIN_USDT_BALANCE_TO_FUND) {
          const tx = await platformHotWallet.sendTransaction({
            to: userAddress,
            value: bnbToSendWei
          });

          await createAuditLog({
            event_type: 'GAS_TOPUP_SENT',
            actor_uuid: 'system',
            actor_role: 'system',
            entity_type: 'USER_WALLET',
            entity_uuid: user.uuid,
            new_value: { tx_hash: tx.hash, to: userAddress, amount: BNB_AMOUNT_TO_SEND, currency: 'BNB' }
          });
        }
      } catch (userError) {
        console.error(`[Gas Station] Erreur pour ${userAddress}:`, userError.message);
      }
    }
    console.log('⛽ Gas Station terminée.');
  } catch (error) {
    console.error('❌ Erreur critique Gas Station:', error.message);
  } finally {
    isRunning = false;
  }
});
