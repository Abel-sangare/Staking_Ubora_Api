import { db } from '../../config/database.js';
import { calculateInterest } from './staking.engine.js';
import { v4 as uuidv4 } from 'uuid';
import { availableUserBalance } from '../transactions/transactions.service.js';
import { createAuditLog } from '../../services/audit/audit.service.js';

// ==================== CREATE PLAN ====================
export async function createPlan({ name, min_amount, max_amount, rate_by_day }) {
  const result = await db.query(
    `INSERT INTO staking_plans 
      (name, min_amount, max_amount, rate_by_day, created_at)
     VALUES (?, ?, ?, ?, NOW())`,
    [name, min_amount, max_amount, rate_by_day]
  );

  return { 
    id: result.insertId, 
    name, 
    min_amount,
    max_amount,
    rate_by_day,
    is_active: 1,
    created_at: new Date()
  };
}

// ==================== GET ALL PLANS ====================
export async function getPlans() {
  const [plans] = await db.query('SELECT * FROM staking_plans WHERE is_active = 1');
  return plans;
}

// ==================== GET PLAN BY ID ====================
export async function getPlanById(id) {
  const [plans] = await db.query('SELECT * FROM staking_plans WHERE id = ?', [id]);
  return plans[0];
}

// ==================== UPDATE PLAN ====================
export async function updatePlan(id, data) {
  const fields = [];
  const values = [];

  ['name', 'min_amount', 'max_amount', 'rate_by_day'].forEach(key => {
    if (data[key] !== undefined) {
      fields.push(`${key} = ?`);
      values.push(data[key]);
    }
  });

  if (fields.length === 0) throw new Error('Aucune donnée à mettre à jour');

  values.push(id);

  const sql = `UPDATE staking_plans SET ${fields.join(', ')} WHERE id = ?`;
  await db.query(sql, values);

  return getPlanById(id);
}

// ==================== DELETE PLAN ====================
export async function deletePlan(id, hard = false) {
  if (hard) {
    const [result] = await db.query('DELETE FROM staking_plans WHERE id = ?', [id]);
    return result;
  }
  const [result] = await db.query('UPDATE staking_plans SET is_active = 0 WHERE id = ?', [id]);
  return result;
}

// ==================== SUBSCRIBE USER ====================
export async function subscribeUser({ user_uuid, plan_id, amount, duration_days, currency = 'USDT' }) {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // 1️⃣ Récupérer et verrouiller l'utilisateur pour éviter les race conditions sur le solde
    const [users] = await connection.query('SELECT id FROM users WHERE uuid = ? FOR UPDATE', [user_uuid]);
    if (users.length === 0) throw new Error('Utilisateur non trouvé');
    const user_id = users[0].id;

    // 2️⃣ Récupérer le plan
    const [plans] = await connection.query('SELECT * FROM staking_plans WHERE id = ?', [plan_id]);
    if (plans.length === 0 || !plans[0].is_active) throw new Error('Plan non trouvé ou inactif');
    const { min_amount, max_amount } = plans[0];

    // 3️⃣ Valider le montant
    if (amount < min_amount || amount > max_amount) {
      throw new Error(`Le montant (${amount}) est hors limites (${min_amount} - ${max_amount}).`);
    }

    // 4️⃣ Vérifier le solde disponible
    const currentBalance = await availableUserBalance(user_uuid);
    if (amount > currentBalance) throw new Error('Solde insuffisant pour la mise');

    // 5️⃣ Créer une transaction de blocage (débit virtuel)
    const lock_tx_uuid = uuidv4();
    await connection.query(
      `INSERT INTO transactions (uuid, user_uuid, type, method, amount, currency, status, created_at, updated_at)
       VALUES (?, ?, 'withdrawal', 'lock', ?, ?, 'CONFIRMED', NOW(), NOW())`,
      [lock_tx_uuid, user_uuid, amount, currency]
    );

    // 6️⃣ Insertion de la mise
    const [result] = await connection.query(
      `INSERT INTO user_stakes (user_id, plan_id, amount, status, lock_transaction_uuid, duration_days)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [user_id, plan_id, amount, 'active', lock_tx_uuid, duration_days]
    );

    await createAuditLog({
      event_type: 'STAKING_LOCK',
      actor_uuid: user_uuid,
      actor_role: 'USER',
      entity_type: 'TRANSACTION',
      entity_uuid: lock_tx_uuid,
      metadata: { plan_id, amount, currency },
    });

    await connection.commit();
    return { id: result.insertId, user_uuid, plan_id, amount, status: 'active', lock_transaction_uuid: lock_tx_uuid, duration_days };

  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

// ==================== GET TOTAL STAKED AMOUNT ====================
export async function getTotalStakedAmount(user_uuid) {
  const [result] = await db.query(
    `SELECT SUM(us.amount) AS totalStaked 
     FROM user_stakes us 
     JOIN users u ON us.user_id = u.id 
     WHERE u.uuid = ? AND us.status = "active"`,
    [user_uuid]
  );
  return result[0].totalStaked || 0;
}

// ==================== GET PROFIT ====================
export async function getProfit(user_uuid) {
  const [rows] = await db.query(
    `SELECT SUM(us.interest_accumulated) as totalProfit
     FROM user_stakes us
     JOIN users u ON us.user_id = u.id
     WHERE u.uuid = ? AND us.status = "active"`,
    [user_uuid]
  );
  return rows[0]?.totalProfit || 0;
}

// ==================== GET STAKES FOR USER ====================
export async function getStakesForUser(user_uuid) {
  const [stakes] = await db.query(
    `SELECT us.id as stake_id, us.amount, us.status, us.duration_days, us.created_at as subscription_date, sp.name as plan_name, sp.rate_by_day
     FROM user_stakes us
     JOIN staking_plans sp ON us.plan_id = sp.id
     JOIN users u ON us.user_id = u.id
     WHERE u.uuid = ?
     ORDER BY us.created_at DESC`,
    [user_uuid]
  );
  return stakes;
}

// ==================== CLAIM REWARDS ====================
export async function claimRewards({ user_uuid, stake_id }) {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const [stakes] = await connection.query(
      `SELECT us.* FROM user_stakes us 
       JOIN users u ON us.user_id = u.id 
       WHERE us.id = ? AND u.uuid = ? FOR UPDATE`,
      [stake_id, user_uuid]
    );

    if (stakes.length === 0) throw new Error('Mise non trouvée');
    const stake = stakes[0];
    const rewardAmount = stake.interest_accumulated || 0;

    if (rewardAmount <= 0) {
      await connection.rollback();
      return { message: 'Aucun intérêt à réclamer', amount: 0 };
    }

    await connection.query('INSERT INTO stake_rewards (stake_id, reward_amount, reward_date) VALUES (?, ?, NOW())', [stake_id, rewardAmount]);

    const tx_uuid = uuidv4();
    await connection.query(
      `INSERT INTO transactions (uuid, user_uuid, type, method, amount, currency, status, created_at, updated_at)
       VALUES (?, ?, 'deposit', 'staking_reward', ?, ?, 'CONFIRMED', NOW(), NOW())`,
      [tx_uuid, user_uuid, rewardAmount, stake.currency || 'USDT']
    );

    await connection.query('UPDATE user_stakes SET interest_accumulated = 0 WHERE id = ?', [stake_id]);

    await connection.commit();
    return { message: 'Intérêts réclamés avec succès', amount: rewardAmount, transaction_uuid: tx_uuid };

  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

// ==================== CLAIM ALL USER REWARDS ====================
export async function claimAllUserRewards(user_uuid) {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const profitToClaim = await getProfit(user_uuid);
    if (profitToClaim <= 0.00000001) {
      await connection.rollback();
      return 0;
    }

    const [stakes] = await connection.query(
      `SELECT us.id, us.interest_accumulated 
       FROM user_stakes us 
       JOIN users u ON us.user_id = u.id 
       WHERE u.uuid = ? AND us.status = 'active' FOR UPDATE`,
      [user_uuid]
    );

    for (const stake of stakes) {
      if (stake.interest_accumulated > 0.00000001) {
        await connection.query('INSERT INTO stake_rewards (stake_id, reward_amount, reward_date) VALUES (?, ?, NOW())', [stake.id, stake.interest_accumulated]);
        await connection.query('UPDATE user_stakes SET interest_accumulated = 0 WHERE id = ?', [stake.id]);
      }
    }

    const tx_uuid = uuidv4();
    await connection.query(
      `INSERT INTO transactions (uuid, user_uuid, type, method, amount, currency, status, created_at, updated_at)
       VALUES (?, ?, 'deposit', 'staking_reward', ?, 'USDT', 'CONFIRMED', NOW(), NOW())`,
      [tx_uuid, user_uuid, profitToClaim]
    );

    await connection.commit();
    return profitToClaim;

  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

// ==================== UNSTAKE USER ====================
export async function unstakeUser({ user_uuid, stake_id, isAdmin = false }) {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const [stakes] = await connection.query(
      'SELECT us.*, u.uuid as user_uuid FROM user_stakes us JOIN users u ON us.user_id = u.id WHERE us.id = ? FOR UPDATE',
      [stake_id]
    );

    if (stakes.length === 0) throw new Error('Mise non trouvée');
    const stake = stakes[0];

    if (stake.user_uuid !== user_uuid && !isAdmin) throw new Error('Accès refusé.');
    if (stake.status !== 'active') throw new Error('Déjà désinvesti.');

    if (!isAdmin) {
      const endDate = new Date(stake.created_at);
      endDate.setDate(endDate.getDate() + (stake.duration_days || 0));
      if (new Date() < endDate) throw new Error('Mise verrouillée.');
    }

    // Réclamer auto avant retrait principal
    if (stake.interest_accumulated > 0) {
      await connection.query('INSERT INTO stake_rewards (stake_id, reward_amount, reward_date) VALUES (?, ?, NOW())', [stake_id, stake.interest_accumulated]);
      await connection.query(
        `INSERT INTO transactions (uuid, user_uuid, type, method, amount, currency, status, created_at, updated_at)
         VALUES (?, ?, 'deposit', 'staking_reward', ?, ?, 'CONFIRMED', NOW(), NOW())`,
        [uuidv4(), user_uuid, stake.interest_accumulated, stake.currency || 'USDT']
      );
    }

    const principal_tx_uuid = uuidv4();
    await connection.query(
      `INSERT INTO transactions (uuid, user_uuid, type, method, amount, currency, status, created_at, updated_at)
       VALUES (?, ?, 'deposit', 'staking_principal_return', ?, ?, 'CONFIRMED', NOW(), NOW())`,
      [principal_tx_uuid, stake.user_uuid, stake.amount, stake.currency || 'USDT']
    );

    await connection.query('UPDATE user_stakes SET status = "unstaked", interest_accumulated = 0, principal_return_transaction_uuid = ?, updated_at = NOW() WHERE id = ?', [principal_tx_uuid, stake_id]);
    
    if (stake.lock_transaction_uuid) {
      await connection.query(`UPDATE transactions SET status = 'RELEASED', updated_at = NOW() WHERE uuid = ?`, [stake.lock_transaction_uuid]);
    }

    await connection.commit();
    return { message: 'Désinvestissement réussi', returned_amount: stake.amount };

  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
