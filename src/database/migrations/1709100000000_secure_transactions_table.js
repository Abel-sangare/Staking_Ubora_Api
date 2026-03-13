import { db } from '../../config/database.js';

export async function up() {
  // 1. Ajouter un index UNIQUE sur tx_hash
  // Note: MySQL autorise plusieurs valeurs NULL dans un index UNIQUE, 
  // ce qui est parfait pour les transactions en attente de hash.
  await db.query(`
    ALTER TABLE transactions 
    ADD UNIQUE INDEX idx_unique_tx_hash (tx_hash);
  `);

  // 2. Ajouter un index UNIQUE sur uuid pour plus de sécurité
  await db.query(`
    ALTER TABLE transactions 
    ADD UNIQUE INDEX idx_unique_uuid (uuid);
  `);

  console.log('✅ Index d\'unicité ajoutés à la table transactions.');
}

export async function down() {
  await db.query(`ALTER TABLE transactions DROP INDEX idx_unique_tx_hash;`);
  await db.query(`ALTER TABLE transactions DROP INDEX idx_unique_uuid;`);
}
