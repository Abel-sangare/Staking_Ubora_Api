import { db } from '../../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import { createAuditLog } from '../../services/audit/audit.service.js';

/**
 * Traite un dépôt détecté (via Webhook ou Scanner)
 * @param {Object} depositData { user_uuid, amount, currency, network, tx_hash, method }
 */
export async function processIncomingDeposit({ toAddress, amount, currency, network, tx_hash, method }) {
  try {
    // 1. Normalisation de l'adresse pour la recherche
    const searchAddress = toAddress.toLowerCase();
    
    // 2. Trouver l'utilisateur (recherche sur les deux types de wallets)
    // Utilisation de LOWER() pour éviter les problèmes de casse en DB
    const [users] = await db.query(
      'SELECT uuid FROM users WHERE LOWER(wallet_address) = ? OR LOWER(tron_wallet_address) = ?',
      [searchAddress, searchAddress]
    );

    if (users.length === 0) {
      console.warn(`[Deposit] Aucun utilisateur trouvé pour l'adresse ${toAddress}`);
      return { success: false, reason: 'USER_NOT_FOUND' };
    }

    const user_uuid = users[0].uuid;

    // 3. Protection contre le double-crédit (Vérification du hash de transaction)
    const [existing] = await db.query('SELECT uuid FROM transactions WHERE tx_hash = ?', [tx_hash]);
    if (existing.length > 0) {
      console.log(`[Deposit] Transaction ${tx_hash} déjà traitée.`);
      return { success: false, reason: 'ALREADY_PROCESSED' };
    }

    // 4. Enregistrement de la transaction
    const tx_uuid = uuidv4();
    await db.query(
      `INSERT INTO transactions 
       (uuid, user_uuid, type, method, amount, currency, status, tx_hash, network, created_at, updated_at)
       VALUES (?, ?, 'deposit', ?, ?, ?, 'CONFIRMED', ?, ?, NOW(), NOW())`,
      [tx_uuid, user_uuid, method, amount, currency, tx_hash, network]
    );

    // 5. Audit Log
    await createAuditLog({
      event_type: 'DEPOSIT_CONFIRMED',
      actor_uuid: user_uuid,
      actor_role: 'system',
      entity_type: 'TRANSACTION',
      entity_uuid: tx_uuid,
      metadata: { amount, currency, network, tx_hash, method }
    });

    console.log(`[Deposit] ✅ Compte crédité: ${amount} ${currency} pour l'utilisateur ${user_uuid}`);
    return { success: true, tx_uuid };

  } catch (error) {
    console.error('[Deposit] Erreur lors du traitement du dépôt:', error);
    throw error;
  }
}
