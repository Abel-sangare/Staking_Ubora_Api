export async function up(db) {
  // Ajouter les colonnes nécessaires pour le suivi réel des transactions Binance
  await db.query(`
    ALTER TABLE transactions 
    ADD COLUMN IF NOT EXISTS external_id VARCHAR(255) DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS network VARCHAR(50) DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS to_address VARCHAR(255) DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS tx_hash VARCHAR(255) DEFAULT NULL;
  `);
}

export async function down(db) {
  await db.query(`
    ALTER TABLE transactions 
    DROP COLUMN IF EXISTS external_id,
    DROP COLUMN IF EXISTS network,
    DROP COLUMN IF EXISTS to_address,
    DROP COLUMN IF EXISTS tx_hash;
  `);
}
