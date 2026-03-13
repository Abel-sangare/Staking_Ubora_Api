export async function up(db) {
  await db.query(`
    ALTER TABLE transactions
    RENAME COLUMN uuid_user TO user_uuid,
    RENAME COLUMN statut TO status;
  `);

  await db.query(`
    ALTER TABLE transactions
    ADD COLUMN IF NOT EXISTS external_id VARCHAR(255) DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS network VARCHAR(50) DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS to_address VARCHAR(255) DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;
  `);
}

export async function down(db) {
  await db.query(`
    ALTER TABLE transactions
    RENAME COLUMN user_uuid TO uuid_user,
    RENAME COLUMN status TO statut;
  `);

  await db.query(`
    ALTER TABLE transactions
    DROP COLUMN IF EXISTS external_id,
    DROP COLUMN IF EXISTS network,
    DROP COLUMN IF EXISTS to_address,
    DROP COLUMN IF EXISTS updated_at;
  `);
}
