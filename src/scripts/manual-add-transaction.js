// src/scripts/manual-add-transaction.js
import { db } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Ce script permet d'ajouter manuellement une transaction de dépôt qui aurait été manquée par le webhook.
 * MODIFIEZ LES CONSTANTES CI-DESSOUS AVANT DE LANCER LE SCRIPT.
 */

// --- DÉTAILS DE LA TRANSACTION À AJOUTER ---
const TX_HASH = '0xb0de130cedfb5c69a55aa4323cdecb3a609871ac6daed7645f120bdf2169e1f5';
const WALLET_ADDRESS = '0x3B220bD981778eF7A367CC5672a84D5c81EF6252';
const AMOUNT = 10.80;
const CURRENCY = 'USDT';
const NETWORK = 'BEP20';
// -----------------------------------------

async function addTransaction() {
  console.log(`🔍 Lancement du script d'ajout manuel pour le hash : ${TX_HASH}`);

  try {
    // 1. Vérifier si la transaction existe déjà
    const [existingTx] = await db.query('SELECT uuid FROM transactions WHERE tx_hash = ?', [TX_HASH]);
    if (existingTx.length > 0) {
      console.warn(`⚠️ La transaction avec le hash ${TX_HASH} existe déjà dans la base de données (UUID: ${existingTx[0].uuid}). Annulation.`);
      return;
    }

    // 2. Trouver l'utilisateur correspondant à l'adresse du portefeuille
    const [users] = await db.query('SELECT uuid FROM users WHERE wallet_address = ?', [WALLET_ADDRESS]);
    if (users.length === 0) {
      console.error(`❌ Aucun utilisateur trouvé pour l'adresse de portefeuille : ${WALLET_ADDRESS}. Annulation.`);
      return;
    }
    const user_uuid = users[0].uuid;
    console.log(`👤 Utilisateur trouvé : ${user_uuid}`);

    // 3. Insérer la nouvelle transaction avec le statut 'CONFIRMED'
    const tx_uuid = uuidv4();
    await db.query(
      `INSERT INTO transactions 
       (uuid, user_uuid, type, method, amount, currency, status, tx_hash, network, created_at, updated_at)
       VALUES (?, ?, 'deposit', 'manual_add', ?, ?, 'CONFIRMED', ?, ?, NOW(), NOW())`,
      [tx_uuid, user_uuid, AMOUNT, CURRENCY, TX_HASH, NETWORK]
    );

    console.log(`✅ Succès ! La transaction a été ajoutée manuellement avec l'UUID : ${tx_uuid}`);
    console.log(`L'utilisateur ${user_uuid} a été crédité de ${AMOUNT} ${CURRENCY}.`);

  } catch (error) {
    console.error("❌ Une erreur est survenue lors de l'exécution du script :", error);
  } finally {
    // Fermer le pool de connexion pour que le script se termine proprement
    await db.end();
  }
}

// Lancer le script
addTransaction();
