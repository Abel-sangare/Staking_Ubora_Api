import { v4 as uuidv4 } from 'uuid';
import { db } from '../../config/database.js';
import * as binanceService from '../../services/blockchain/binance.service.js';
import { createAuditLog } from '../../services/audit/audit.service.js';
import { claimAllUserRewards } from '../staking/staking.service.js';
import { sendPlatformWithdrawal } from '../../services/blockchain/blockchain.service.js';

/**
 * Créer une intention de dépôt (ou enregistrer un dépôt détecté)
 */
export async function createDeposit({ user_uuid, amount, currency, network, tx_hash = null }) {
  const tx_uuid = uuidv4();
  await db.query(
    `INSERT INTO transactions
     (uuid, user_uuid, type, method, amount, currency, status, tx_hash, network, created_at, updated_at)
     VALUES (?, ?, 'deposit', 'binance', ?, ?, 'PENDING', ?, ?, NOW(), NOW())`,
    [tx_uuid, user_uuid, amount, currency, tx_hash, network]
  );
  return { uuid: tx_uuid, status: 'PENDING' };
}

/**
 * Synchronise et confirme les dépôts en interrogeant Binance
 */
export async function syncBinanceDeposits(coin = 'USDT') {
  const history = await binanceService.getBinanceDepositHistory(coin);
  for (const deposit of history) {
    if (deposit.status === 1) { // 1 = Success
      const [existing] = await db.query('SELECT * FROM transactions WHERE tx_hash = ?', [deposit.txId]);
      if (existing.length > 0 && existing[0].status === 'PENDING') {
        await updateTransactionStatus(existing[0].uuid, 'CONFIRMED', deposit.txId);
      }
    }
  }
}

/**
 * Créer un retrait réel via le portefeuille chaud de la plateforme
 */
export async function createWithdrawal({ user_uuid, amount, currency, network, toAddress, actor_role }) {
  if (amount < 0.001) throw new Error('Montant minimal : 0.001');

  // Sécurisé : on réclame les récompenses avant de vérifier le solde de gain
  await claimAllUserRewards(user_uuid);

  const courtesyBalance = await availableGainsBalance(user_uuid);
  if (amount > courtesyBalance) {
    throw new Error(`Solde insuffisant dans le Portefeuille de Courtoisie (${courtesyBalance.toFixed(4)} disponibles).`);
  }

  const tx_uuid = uuidv4();
  await db.query(
    `INSERT INTO transactions
     (uuid, user_uuid, type, method, amount, currency, status, network, to_address, created_at, updated_at)
     VALUES (?, ?, 'withdrawal', 'platform', ?, ?, 'PENDING_ADMIN_APPROVAL', ?, ?, NOW(), NOW())`,
    [tx_uuid, user_uuid, amount, currency, network, toAddress]
  );

  await createAuditLog({
    event_type: 'WITHDRAWAL_REQUESTED',
    actor_uuid: user_uuid,
    actor_role: actor_role,
    entity_type: 'TRANSACTION',
    entity_uuid: tx_uuid,
    metadata: { amount, currency, network, toAddress, status: 'PENDING_ADMIN_APPROVAL' },
  });

  return { uuid: tx_uuid, status: 'PENDING_ADMIN_APPROVAL' };
}

/**
 * Calcul du solde disponible réel (total)
 */
export async function availableUserBalance(user_uuid) {
  const [deposits] = await db.query(
    'SELECT SUM(amount) as total FROM transactions WHERE user_uuid = ? AND type="deposit" AND status="CONFIRMED"',
    [user_uuid]
  );
  const [withdrawals] = await db.query(
    'SELECT SUM(amount) as total FROM transactions WHERE user_uuid = ? AND type="withdrawal" AND method="platform" AND status IN ("PENDING", "PENDING_ADMIN_APPROVAL", "SENT", "CONFIRMED")',
    [user_uuid]
  );
  const [activeStakes] = await db.query(
    `SELECT SUM(us.amount) as totalStaked FROM user_stakes us JOIN users u ON us.user_id = u.id WHERE u.uuid = ? AND us.status = 'active'`,
    [user_uuid]
  );
  const [unclaimedProfit] = await db.query(
    `SELECT SUM(us.interest_accumulated) as totalProfit FROM user_stakes us JOIN users u ON us.user_id = u.id WHERE u.uuid = ? AND us.status = 'active'`,
    [user_uuid]
  );

  return (deposits[0]?.total || 0) + (unclaimedProfit[0]?.totalProfit || 0) - (withdrawals[0]?.total || 0) - (activeStakes[0]?.totalStaked || 0);
}

/**
 * Calcul du solde de GAINS uniquement (Portefeuille de Courtoisie)
 */
export async function availableGainsBalance(user_uuid) {
  const [rewards] = await db.query(
    'SELECT SUM(amount) as total FROM transactions WHERE user_uuid = ? AND type="deposit" AND method="staking_reward" AND status="CONFIRMED"',
    [user_uuid]
  );
  const [unclaimedProfit] = await db.query(
    `SELECT SUM(us.interest_accumulated) as totalProfit FROM user_stakes us JOIN users u ON us.user_id = u.id WHERE u.uuid = ? AND us.status = 'active'`,
    [user_uuid]
  );
  const [withdrawals] = await db.query(
    'SELECT SUM(amount) as total FROM transactions WHERE user_uuid = ? AND type="withdrawal" AND method="platform" AND status IN ("PENDING", "PENDING_ADMIN_APPROVAL", "SENT", "CONFIRMED")',
    [user_uuid]
  );

  const totalRewards = (rewards[0]?.total || 0) + (unclaimedProfit[0]?.totalProfit || 0);
  const balance = totalRewards - (withdrawals[0]?.total || 0);
  return balance > 0 ? balance : 0;
}

/**
 * Mettre à jour le statut d'une transaction
 */
export async function updateTransactionStatus(uuid, status, tx_hash = null, confirmations = null) {
  await db.query(
    'UPDATE transactions SET status = ?, tx_hash = IFNULL(?, tx_hash), confirmations = ?, updated_at = NOW() WHERE uuid = ?',
    [status, tx_hash, confirmations, uuid]
  );
  const [rows] = await db.query('SELECT * FROM transactions WHERE uuid = ?', [uuid]);
  return rows[0];
}

/**
 * Approuve un retrait et envoie les fonds (Sécurisé par Transaction SQL)
 */
export async function adminApproveWithdrawal(withdrawal_uuid, admin_uuid) {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Verrouiller la ligne pour éviter qu'un autre admin n'approuve en même temps
    const [rows] = await connection.query('SELECT * FROM transactions WHERE uuid = ? FOR UPDATE', [withdrawal_uuid]);
    const withdrawal = rows[0];

    if (!withdrawal) throw new Error('Retrait non trouvé.');
    if (withdrawal.type !== 'withdrawal' || withdrawal.status !== 'PENDING_ADMIN_APPROVAL') {
      throw new Error(`Retrait invalide ou déjà traité. Statut : ${withdrawal.status}`);
    }

    // 2. Marquer comme PROCESSING pour éviter les doubles envois blockchain
    await connection.query('UPDATE transactions SET status = "PROCESSING", updated_at = NOW() WHERE uuid = ?', [withdrawal_uuid]);
    await connection.commit(); // On commit le statut PROCESSING avant l'appel blockchain

    // 3. Appel Blockchain (HORS transaction DB pour ne pas bloquer la base)
    try {
      const txHash = await sendPlatformWithdrawal(withdrawal.to_address, withdrawal.amount, withdrawal.currency, withdrawal.network);
      
      // 4. Succès : mise à jour finale
      await updateTransactionStatus(withdrawal_uuid, 'SENT', txHash);
      await createAuditLog({
        event_type: 'APPROVED',
        actor_uuid: admin_uuid,
        actor_role: 'ADMIN',
        entity_type: 'TRANSACTION',
        entity_uuid: withdrawal_uuid,
        metadata: { tx_hash: txHash, amount: withdrawal.amount },
      });
      return { uuid: withdrawal_uuid, status: 'SENT', tx_hash: txHash };
    } catch (error) {
      await updateTransactionStatus(withdrawal_uuid, 'FAILED');
      throw error;
    }
  } catch (error) {
    if (connection) await connection.rollback();
    throw error;
  } finally {
    if (connection) connection.release();
  }
}

export async function getTransactions(user_uuid = null) {
  let query = 'SELECT * FROM transactions';
  const params = [];
  if (user_uuid) {
    query += ' WHERE user_uuid = ?';
    params.push(user_uuid);
  }
  const [rows] = await db.query(query, params);
  return rows;
}

export async function getTransactionById(uuid) {
  const [rows] = await db.query('SELECT * FROM transactions WHERE uuid = ?', [uuid]);
  return rows[0];
}
