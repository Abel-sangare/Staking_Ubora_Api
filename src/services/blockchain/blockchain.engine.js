import { updateTransactionStatus } from './transactions.service.js';
import { providers } from '../../services/blockchain/blockchain.service.js';

/**
 * Confirmation automatique d'un dépôt crypto
 * @param {string} tx_uuid
 * @param {number} requiredConfirmations
 */
export async function confirmDeposit(tx_uuid, requiredConfirmations = 3) {
  let confirmations = 0;

  const interval = setInterval(async () => {
    confirmations += 1;
    console.log(`Transaction ${tx_uuid} confirmations: ${confirmations}`);

    await updateTransactionStatus(tx_uuid, 'PENDING', null, confirmations);

    if (confirmations >= requiredConfirmations) {
      await updateTransactionStatus(tx_uuid, 'CONFIRMED', null, confirmations);
      clearInterval(interval);
      console.log(`Transaction ${tx_uuid} confirmée !`);
    }
  }, 5000); // Simulation : toutes les 5s
}

/**
 * Envoyer un retrait crypto via hot wallet
 * @param {string} tx_uuid
 * @param {string} tx_hash
 */
export async function sendWithdrawal(tx_uuid, tx_hash) {
  await updateTransactionStatus(tx_uuid, 'SENT', tx_hash);
  // Pour un suivi réel : tu peux relancer confirmDeposit pour suivre les confirmations
}