// src/modules/transactions/transactions.engine.js
import { db } from '../../config/database.js';

/**
 * Met à jour le statut d'une transaction
 * @param {string} tx_uuid
 * @param {string} status
 * @param {string|null} tx_hash
 * @param {number|null} confirmations
 */
export async function updateTransactionStatus(tx_uuid, status, tx_hash = null, confirmations = null) {
  await db.query(
    `UPDATE transactions 
     SET status = ?, tx_hash = COALESCE(?, tx_hash), confirmations = COALESCE(?, confirmations), updated_at = NOW() 
     WHERE uuid = ?`,
    [status, tx_hash, confirmations, tx_uuid]
  );
  return { uuid: tx_uuid, status, tx_hash, confirmations };
}

/**
 * Simuler la confirmation blockchain pour les dépôts crypto
 * @param {string} tx_uuid
 * @param {number} requiredConfirmations
 */
export async function confirmDeposit(tx_uuid, requiredConfirmations = 3) {
  let confirmations = 0;

  // Simulation : incrément confirmations toutes les 5 secondes
  const interval = setInterval(async () => {
    confirmations += 1;
    console.log(`Transaction ${tx_uuid} confirmations: ${confirmations}`);

    await updateTransactionStatus(tx_uuid, 'PENDING', null, confirmations);

    if (confirmations >= requiredConfirmations) {
      await updateTransactionStatus(tx_uuid, 'CONFIRMED', null, confirmations);
      clearInterval(interval);
      console.log(`Transaction ${tx_uuid} confirmée !`);
    }
  }, 5000);
}

/**
 * Simuler l’envoi de crypto pour un retrait
 * @param {string} tx_uuid
 * @param {string} tx_hash
 */
export async function sendWithdrawal(tx_uuid, tx_hash) {
  await updateTransactionStatus(tx_uuid, 'SENT', tx_hash);
  // Tu peux ici lancer confirmDeposit si tu veux suivre les confirmations blockchain
}