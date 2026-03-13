import { db } from '../../config/database.js';

export async function up() {
  await db.query(`
    CREATE TABLE staking_history (
      id INT AUTO_INCREMENT PRIMARY KEY,
      stake_id INT NOT NULL,
      date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      capital DECIMAL(20, 8) NOT NULL,
      interest DECIMAL(20, 8) NOT NULL,
      fee DECIMAL(20, 8) NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (stake_id) REFERENCES user_stakes(id)
    )
  `);
}

export async function down() {
  await db.query(`
    DROP TABLE IF EXISTS staking_history
  `);
}
