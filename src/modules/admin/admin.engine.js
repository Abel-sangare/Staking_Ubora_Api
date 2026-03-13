import { db } from '../../config/database.js';

/**
 * Exposition financière globale
 */
export async function getGlobalExposure() {
  const [rows] = await db.query(`
    SELECT 
      SUM(capital) AS total_capital,
      SUM(interest_accumulated) AS total_interests,
      SUM(fees_accumulated) AS total_fees
    FROM user_stakings
    WHERE status = 'active'
  `);

  const capital = rows[0].total_capital || 0;
  const interests = rows[0].total_interests || 0;
  const fees = rows[0].total_fees || 0;

  return {
    total_capital: capital,
    total_interests: interests,
    total_fees: fees,
    net_exposure: interests - fees
  };
}

/**
 * Simulation d’impact d’un changement de taux
 */
export async function simulateRateChange(newRate) {
  const [rows] = await db.query(`
    SELECT capital, duration_days
    FROM user_stakes
    WHERE status = 'active'
  `);

  let simulatedInterests = 0;

  for (const s of rows) {
    simulatedInterests +=
      s.capital * (newRate / 100) * (s.duration_days / 365);
  }

  return {
    simulated_rate: newRate,
    simulated_total_interests: simulatedInterests
  };
}