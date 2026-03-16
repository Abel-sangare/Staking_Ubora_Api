import { db } from '../../config/database.js';

export async function up() {
  await db.query(`
    ALTER TABLE users
    ADD COLUMN tron_wallet_address VARCHAR(255) NULL,
    ADD COLUMN tron_encrypted_private_key TEXT NULL,
    ADD INDEX idx_tron_wallet_address (tron_wallet_address)
  `);
}

export async function down() {
  await db.query(`
    ALTER TABLE users
    DROP COLUMN tron_wallet_address,
    DROP COLUMN tron_encrypted_private_key
  `);
}
