import { db } from '../../config/database.js';

export async function up() {
  await db.query(`
    ALTER TABLE user_stakes
    ADD COLUMN interest_accumulated DECIMAL(20, 8) NOT NULL DEFAULT 0;
  `);
}

export async function down() {
  await db.query(`
    ALTER TABLE user_stakes
    DROP COLUMN interest_accumulated;
  `);
}
