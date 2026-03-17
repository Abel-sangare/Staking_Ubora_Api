import dotenv from 'dotenv';

dotenv.config();

// ✅ FIX B02: guard de démarrage — le serveur refuse de lancer si les secrets critiques
//    sont absents ou contiennent une valeur par défaut connue.
const FORBIDDEN_SECRETS = [
  'super_secret_key_change_me',
  'secret123',
  'secret',
  'changeme',
  'your_jwt_secret',
];

function requireSecret(name, value) {
  if (!value || value.trim() === '') {
    console.error(`❌ ERREUR CRITIQUE : la variable d'environnement ${name} est manquante.`);
    process.exit(1);
  }
  if (FORBIDDEN_SECRETS.includes(value.trim().toLowerCase())) {
    console.error(`❌ ERREUR CRITIQUE : ${name} contient une valeur par défaut non sécurisée.`);
    console.error(`   Générez une valeur sécurisée : node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`);
    process.exit(1);
  }
}

requireSecret('JWT_SECRET', process.env.JWT_SECRET);

export const PORT = process.env.PORT || 3000;
export const NODE_ENV = process.env.NODE_ENV || 'development';
export const DATABASE_URL = process.env.DATABASE_URL;
export const JWT_SECRET = process.env.JWT_SECRET;
export const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
export const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY;
export const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET;
export const PLATFORM_HOT_WALLET_PRIVATE_KEY = process.env.PLATFORM_HOT_WALLET_PRIVATE_KEY;
export const BSC_RPC_URL = process.env.BSC_RPC_URL;
export const ALCHEMY_WEBHOOK_SECRET = process.env.ALCHEMY_WEBHOOK_SECRET;
export const ALCHEMY_AUTH_TOKEN = process.env.ALCHEMY_AUTH_TOKEN;
export const PLATFORM_COLLECTOR_ADDRESS = process.env.PLATFORM_COLLECTOR_ADDRESS;
