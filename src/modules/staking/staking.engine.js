import { db } from '../../config/database.js';

// Calcul des intérêts et frais
export async function calculateInterest(staking) {
  const { amount, id, plan_id } = staking; // 'id' refers to user_stakes.id

  // Récupérer le plan
  const [plans] = await db.query('SELECT * FROM staking_plans WHERE id = ?', [plan_id]);
  const plan = plans[0];
  if (!plan) throw new Error('Plan non trouvé');

  // Calcul exact du taux journalier
  const dailyRate = plan.rate_by_day / 100; // Convertir le pourcentage en décimal
  const interest = amount * dailyRate;
  const fee = 0; // Assuming no fee for now, as per previous "No fees" comment
  const netInterest = interest - fee;

  // Historiser
  // Using staking_uuid as per provided schema, mapping to user_stakes.id
  await db.query(
    `INSERT INTO staking_history (staking_uuid, date, capital, interest, fee, created_at)
     VALUES (?, NOW(), ?, ?, ?, NOW())`,
    [id, amount, interest, fee] // Pass original interest and calculated fee
  );

  // Mettre à jour user_stakes
  await db.query(
    `UPDATE user_stakes
      SET interest_accumulated = interest_accumulated + ?
      WHERE id = ?`,
    [netInterest, id]
  );

  return { interest: netInterest };
}