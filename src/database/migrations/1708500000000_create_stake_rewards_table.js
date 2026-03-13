import { db } from '../../config/database.js';

export async function up() {
  await db.query(`
    CREATE TABLE stake_rewards (
      id INT AUTO_INCREMENT PRIMARY KEY,
      stake_id INT NOT NULL,
      reward_amount DECIMAL(20, 8) NOT NULL,
      reward_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (stake_id) REFERENCES user_stakes(id)
    )
  `);
}

export async function down() {
  await db.query(`
    DROP TABLE IF EXISTS stake_rewards
  `);
}
