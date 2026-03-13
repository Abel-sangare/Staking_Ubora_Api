import { db } from '../../config/database.js';
import { availableGainsBalance } from '../transactions/transactions.service.js';

/**
 * Récupérer le profil complet d'un utilisateur
 */
export async function getUserProfile(user_uuid) {
  const [rows] = await db.query(
    `SELECT uuid, email, phone, role, is_active, created_at, updated_at, wallet_address 
     FROM users WHERE uuid = ?`,
    [user_uuid]
  );
  return rows[0] || null;
}

/**
 * Récupérer l'ID entier d'un utilisateur par son UUID
 */
export async function getUserIdByUuid(user_uuid) {
  if (!user_uuid) {
    console.warn('getUserIdByUuid called with null or undefined user_uuid');
    return null;
  }
  const [rows] = await db.query(
    `SELECT id FROM users WHERE uuid = ?`,
    [user_uuid]
  );
  const userId = rows[0] ? rows[0].id : null;
  console.log(`getUserIdByUuid for ${user_uuid} returned: ${userId}`);
  return userId;
}




/**
 * Mettre à jour le profil utilisateur
 */
export async function updateUserProfile(user_uuid, { email, phone }) {
  const fields = [];
  const values = [];

  if (email !== undefined) {
    // Vérifier unicité
    const [existing] = await db.query('SELECT id FROM users WHERE email = ? AND uuid != ?', [email, user_uuid]);
    if (existing.length > 0) throw new Error('Email déjà utilisé');
    fields.push('email = ?');
    values.push(email);
  }

  if (phone !== undefined) {
    // Vérifier unicité
    const [existing] = await db.query('SELECT id FROM users WHERE phone = ? AND uuid != ?', [phone, user_uuid]);
    if (existing.length > 0) throw new Error('Téléphone déjà utilisé');
    fields.push('phone = ?');
    values.push(phone);
  }

  if (fields.length === 0) return getUserProfile(user_uuid);

  fields.push('updated_at = NOW()');
  values.push(user_uuid);

  const sql = `UPDATE users SET ${fields.join(', ')} WHERE uuid = ?`;
  await db.query(sql, values);

  return getUserProfile(user_uuid);
}

/**
 * Récupérer toutes les mises de staking d'un utilisateur
 */
export async function getUserStakes(user_uuid) {
  const [stakes] = await db.query(
    `SELECT
      us.id, us.user_id, us.plan_id, us.amount, us.status, us.duration_days,
      sp.name as plan_name, sp.rate_by_day as interest_rate
     FROM user_stakes us
     LEFT JOIN staking_plans sp ON us.plan_id = sp.id
     WHERE us.user_id = (SELECT id FROM users WHERE uuid = ?)`,
    [user_uuid]
  );
  return stakes;
}
/**
 * Récupérer une mise spécifique
 */
export async function getUserStakeById(user_uuid, stake_id) {
  const [stakes] = await db.query(
    `SELECT us.*, sp.name as plan_name, sp.interest_rate, sp.management_fee_rate
     FROM user_stakes us
     LEFT JOIN staking_plans sp ON us.plan_id = sp.id
     WHERE us.id = ? AND us.user_id = (SELECT id FROM users WHERE uuid = ?)`,
    [stake_id, user_uuid]
  );
  return stakes[0] || null;
}

/**
 * Récupérer le solde du wallet de l'utilisateur
 */
export async function getUserWalletBalance(user_uuid) {
  console.log(`[User Service] Calculating wallet balance for user UUID: ${user_uuid}`);
  // Récupérer tous les dépôts confirmés
  const [deposits] = await db.query(
    `SELECT SUM(amount) as total FROM transactions 
     WHERE user_uuid = ? AND type = "deposit" AND status = "CONFIRMED"`,
    [user_uuid]
  );
  
  // Récupérer tous les retraits (en attente, envoyés ou confirmés)
  const [withdrawals] = await db.query(
    `SELECT SUM(amount) as total FROM transactions 
     WHERE user_uuid = ? AND type = "withdrawal" AND status IN ("PENDING", "SENT", "CONFIRMED")`,
    [user_uuid]
  );
  
  const totalDeposits = deposits[0]?.total || 0;
  const totalWithdrawals = withdrawals[0]?.total || 0;
  const balance = totalDeposits - totalWithdrawals;

  // Calculer les gains retirables
  const withdrawableGains = await availableGainsBalance(user_uuid);
  
  console.log(`[User Service] Calculated balance for ${user_uuid}:`, balance);
  
  return {
    user_uuid,
    total_deposits: totalDeposits,
    total_withdrawals: totalWithdrawals,
    balance: balance,
    withdrawable_gains: withdrawableGains,
    currency: 'USD'
  };
}