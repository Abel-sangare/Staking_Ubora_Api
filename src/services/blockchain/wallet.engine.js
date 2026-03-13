import { providers } from './blockchain.service.js';
import { getColdWalletAddress } from './wallet.service.js';
import { db } from '../../config/database.js';

/**
 * Vérifie régulièrement les dépôts sur hot wallets
 */
export async function monitorHotWallet(chain, walletAddress) {
  const balance = await providers[chain].getBalance(walletAddress);
  console.log(`[${chain}] Hot wallet balance: ${balance}`);

  // Ici, on peut automatiser le transfert vers cold wallet si trop de fonds
}

/**
 * Protection contre double spending
 */
export async function preventDoubleSpending(user_uuid, amount) {
  const [rows] = await db.query(
    'SELECT SUM(amount) as pending FROM transactions WHERE user_uuid = ? AND status IN ("PENDING","SENT")',
    [user_uuid]
  );
  const pending = rows[0]?.pending || 0;
  if (pending + amount > availableUserBalance(user_uuid)) {
    throw new Error('Transaction bloquée : double spending détecté');
  }
}

/**
 * Retourne le solde disponible réel (hors transactions en cours)
 */
export async function availableUserBalance(user_uuid) {
  const [deposits] = await db.query(
    'SELECT SUM(amount) as total FROM transactions WHERE user_uuid = ? AND type="deposit" AND status="CONFIRMED"',
    [user_uuid]
  );
  const [withdrawals] = await db.query(
    'SELECT SUM(amount) as total FROM transactions WHERE user_uuid = ? AND type="withdrawal" AND status IN ("PENDING","SENT","CONFIRMED")',
    [user_uuid]
  );

  return (deposits[0]?.total || 0) - (withdrawals[0]?.total || 0);
}