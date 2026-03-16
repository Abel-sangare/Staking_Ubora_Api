import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from '../config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigrations() {
  const migrationsDir = path.join(__dirname, 'migrations');
  const files = fs.readdirSync(migrationsDir).sort();

  console.log('--- Démarrage des migrations ---');

  for (const file of files) {
    if (file.endsWith('.js')) {
      console.log(`Exécution de la migration : ${file}`);
      const migrationPath = path.join(migrationsDir, file);
      const migration = await import(`file://${migrationPath}`);
      
      try {
        await migration.up();
        console.log(`✅ Migration ${file} réussie.`);
      } catch (err) {
        if (err.code === 'ER_DUP_FIELDNAME' || err.code === 'ER_TABLE_EXISTS_ERROR') {
          console.log(`ℹ️ La migration ${file} semble déjà avoir été appliquée (colonne/table déjà existante).`);
        } else {
          console.error(`❌ Erreur lors de la migration ${file}:`, err.message);
        }
      }
    }
  }

  console.log('--- Migrations terminées ---');
  process.exit(0);
}

runMigrations().catch(err => {
  console.error('Erreur fatale lors des migrations:', err);
  process.exit(1);
});
