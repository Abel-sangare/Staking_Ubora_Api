import { db } from '../../config/database.js';

export const up = async () => {
  await db.query(`
    ALTER TABLE user_stakes
    MODIFY COLUMN duration_days INT NOT NULL DEFAULT 0;
  `);
};

export const down = async () => {
  await db.query(`
    ALTER TABLE user_stakes
    DROP COLUMN duration_days;
  `);
};
