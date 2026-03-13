import cron from 'node-cron';
import { db } from '../config/database.js';

// ✅ FIX: variable de verrou pour éviter les doubles exécutions si le cycle précédent
//    n'est pas encore terminé (ex: redémarrage serveur, deux instances Render)
let isRunning = false;

cron.schedule('* * * * *', async () => {
  if (isRunning) {
    console.warn('⚠️ [CRON] Cycle précédent toujours en cours, skip.');
    return;
  }
  isRunning = true;

  try {
    const [activeStakes] = await db.query(
      `SELECT us.id, us.amount, sp.rate_by_day
       FROM user_stakes us
       JOIN staking_plans sp ON us.plan_id = sp.id
       WHERE us.status = 'active'`
    );

    if (activeStakes.length === 0) return;

    // ✅ FIX: mise à jour en une seule requête batch au lieu d'une requête par stake
    //    Évite les incohérences si le serveur redémarre en plein milieu du loop
    const cases = activeStakes.map(s => {
      const profit = (s.amount * (s.rate_by_day / 100)) / 1440;
      return `WHEN id = ${db.escape(s.id)} THEN interest_accumulated + ${profit}`;
    }).join(' ');
    const ids = activeStakes.map(s => s.id).join(',');

    await db.query(
      `UPDATE user_stakes
       SET interest_accumulated = CASE ${cases} END
       WHERE id IN (${ids}) AND status = 'active'`
    );

    console.log(`✅ [CRON] Profit mis à jour pour ${activeStakes.length} mises.`);
  } catch (error) {
    console.error('❌ [CRON] Erreur de mise à jour des intérêts:', error);
  } finally {
    isRunning = false;
  }
});
