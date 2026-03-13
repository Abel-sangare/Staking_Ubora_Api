// src/jobs/transaction-monitor.js
// Surveillance des transactions SENT sur BSC et TRON

import cron from 'node-cron';
import { db } from '../config/database.js';
import { providers } from '../services/blockchain/blockchain.service.js';
import { updateTransactionStatus } from '../modules/transactions/transactions.service.js';
import { getTronTransactionStatus } from '../services/blockchain/tron.service.js';

cron.schedule('*/1 * * * *', async () => {
  console.log('🔍 Surveillance des transactions SENT (BSC + TRON)...');
  try {
    const [sentTxs] = await db.query(
      `SELECT uuid, tx_hash, network
       FROM transactions
       WHERE status = 'SENT' AND tx_hash IS NOT NULL
         AND type IN ('withdrawal', 'sweep')`
    );

    if (sentTxs.length === 0) {
      console.log('Aucune transaction SENT à surveiller.');
      return;
    }

    console.log(`Traitement de ${sentTxs.length} transactions SENT...`);

    for (const tx of sentTxs) {
      const { uuid, tx_hash, network } = tx;
      try {

        // ── TRON ────────────────────────────────────────────────────────────
        if (network === 'tron') {
          const { confirmed, success, blockNumber } = await getTronTransactionStatus(tx_hash);
          if (confirmed) {
            if (success) {
              console.log(`✅ TRON tx ${uuid} CONFIRMÉE`);
              await updateTransactionStatus(uuid, 'CONFIRMED', tx_hash, blockNumber);
            } else {
              console.error(`❌ TRON tx ${uuid} ÉCHOUÉE`);
              await updateTransactionStatus(uuid, 'FAILED', tx_hash, blockNumber);
            }
          } else {
            console.log(`⏳ TRON tx ${uuid} en attente...`);
          }
          continue;
        }

        // ── BSC / ETH ────────────────────────────────────────────────────────
        const provider = providers[network];
        if (!provider) {
          console.warn(`Provider non trouvé pour le réseau "${network}" (tx ${uuid})`);
          continue;
        }

        const receipt = await provider.getTransactionReceipt(tx_hash);
        if (receipt) {
          if (receipt.status === 1) {
            console.log(`✅ BSC tx ${uuid} CONFIRMÉE`);
            await updateTransactionStatus(uuid, 'CONFIRMED', tx_hash, receipt.blockNumber);
          } else {
            console.error(`❌ BSC tx ${uuid} ÉCHOUÉE`);
            await updateTransactionStatus(uuid, 'FAILED', tx_hash, receipt.blockNumber);
          }
        } else {
          console.log(`⏳ BSC tx ${uuid} pas encore minée.`);
        }

      } catch (err) {
        console.error(`Erreur vérification tx ${uuid} (${tx_hash}):`, err.message);
      }
    }

    console.log('✅ Surveillance des transactions terminée.');
  } catch (error) {
    console.error('❌ Erreur critique moniteur de transactions:', error.message);
  }
});

console.log('Moniteur de transactions BSC + TRON démarré...');
