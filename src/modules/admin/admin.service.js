import { db } from '../../config/database.js';
import { getGlobalExposure, simulateRateChange } from './admin.engine.js';
import { updatePlan as updateStakingPlan, getPlanById as getStakingPlanById } from '../../modules/staking/staking.service.js';

/**
 * Modifier taux & frais d’un plan
 */
export async function updatePlan(plan_id, data) {
  // admin.routes.js passe un UUID. Nous avons besoin de l'ID entier pour updateStakingPlan
  const plan = await getStakingPlanById(plan_id);
  if (!plan) throw new Error('Plan de staking non trouvé');
  
  return updateStakingPlan(plan.id, data);
}

/**
 * Activer / désactiver un plan
 */
export async function togglePlan(plan_id, is_active) {
  // admin.routes.js passe un UUID. Nous avons besoin de l'ID entier pour updateStakingPlan
  const plan = await getStakingPlanById(plan_id);
  if (!plan) throw new Error('Plan de staking non trouvé');
  
  return updateStakingPlan(plan.id, { is_active: is_active ? 1 : 0 });
}

/**
 * Récupérer la liste de tous les utilisateurs
 */
export async function getAllUsers() {
  const [users] = await db.query(
    `SELECT uuid, email, phone, role, is_active, created_at 
     FROM users ORDER BY created_at DESC`
  );
  return users;
}

/**
 * Récupérer les statistiques du dashboard
 */
export async function getDashboardStats() {
  // Total utilisateurs
  const [userCount] = await db.query('SELECT COUNT(*) as count FROM users');
  
  // Total transactions
  const [txCount] = await db.query('SELECT COUNT(*) as count FROM transactions');
  
  // Total volume transactionné
  const [txVolume] = await db.query(
    'SELECT SUM(amount) as total FROM transactions WHERE status="CONFIRMED"'
  );
  
  // Plans actifs
  const [planCount] = await db.query('SELECT COUNT(*) as count FROM staking_plans WHERE is_active = 1');
  
  // // Total paiements
  // const [paymentStats] = await db.query(
  //   'SELECT COUNT(*) as count, SUM(amount) as total FROM payments WHERE status="PAID"'
  // );

  return {
    total_users: userCount[0]?.count || 0,
    total_transactions: txCount[0]?.count || 0,
    transaction_volume: txVolume[0]?.total || 0,
    active_plans: planCount[0]?.count || 0,
    total_payments: paymentStats[0]?.count || 0,
    total_payments_amount: paymentStats[0]?.total || 0
  };
}

export {
  getGlobalExposure,
  simulateRateChange
};