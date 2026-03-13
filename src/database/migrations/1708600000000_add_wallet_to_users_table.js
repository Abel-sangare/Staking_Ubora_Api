import { db } from '../../config/database.js';

export async function up() {
  // Adding columns for a single EVM-compatible wallet.
  // We can add more columns later for different non-EVM chains if needed.
  await db.query(`
    ALTER TABLE users
    ADD COLUMN wallet_address VARCHAR(255) NULL,
    ADD COLUMN encrypted_private_key TEXT NULL,
    ADD INDEX idx_wallet_address (wallet_address)
  `);
}

export async function down() {
  await db.query(`
    ALTER TABLE users
    DROP COLUMN wallet_address,
    DROP COLUMN encrypted_private_key
  `);
}
