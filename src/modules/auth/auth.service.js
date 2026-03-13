import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';
import { db } from '../../config/database.js';
import { createUserWallet, encryptPrivateKey } from '../../services/blockchain/wallet.service.js';
import { generateToken } from '../../utils/jwt.js'; // ✅ FIX B02/B03: utiliser l'utilitaire centralisé

// ✅ FIX B02: suppression du fallback hardcodé 'secret123' et de la constante locale JWT_SECRET.
//    La gestion du secret est désormais centralisée dans utils/jwt.js et validée au démarrage dans config/env.js.

// =======================
// REGISTER
// =======================
export async function register({ email, phone, password }) {
  if ((!email && !phone) || !password) {
    throw new Error('Email ou téléphone + mot de passe requis');
  }

  if (email) {
    const [existingEmail] = await db.query(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );
    if (existingEmail.length > 0) {
      throw new Error('Email déjà utilisé');
    }
  }

  if (phone) {
    const [existingPhone] = await db.query(
      'SELECT id FROM users WHERE phone = ?',
      [phone]
    );
    if (existingPhone.length > 0) {
      throw new Error('Téléphone déjà utilisé');
    }
  }

  const newWallet = createUserWallet('bsc');
  const encryptedKey = encryptPrivateKey(newWallet.privateKey);

  const password_hash = await bcrypt.hash(password, 10);
  const user_uuid = uuidv4();

  const sql = `
    INSERT INTO users
      (uuid, email, phone, password_hash, role, is_active, is_verified, wallet_address, encrypted_private_key, created_at, updated_at)
    VALUES (?, ?, ?, ?, 'user', 1, 0, ?, ?, NOW(), NOW())
  `;

  await db.query(sql, [
    user_uuid,
    email || null,
    phone || null,
    password_hash,
    newWallet.address,
    encryptedKey
  ]);

  return {
    uuid: user_uuid,
    email: email || null,
    phone: phone || null,
    role: 'user',
    wallet_address: newWallet.address
  };
}

// =======================
// LOGIN (email OU phone)
// =======================
export async function login({ email, phone, password }) {
  if (!password || (!email && !phone)) {
    throw new Error('Identifiants invalides');
  }

  let rows = [];

  if (email && email.trim() !== '') {
    [rows] = await db.query(
      'SELECT * FROM users WHERE email = ? LIMIT 1',
      [email.toLowerCase().trim()]
    );
  }

  if ((!rows || rows.length === 0) && phone && phone.trim() !== '') {
    const normalizedPhone = phone.replace(/\s+/g, '');
    [rows] = await db.query(
      'SELECT * FROM users WHERE phone = ? LIMIT 1',
      [normalizedPhone]
    );
  }

  if (!rows || rows.length === 0) {
    throw new Error('Identifiants invalides');
  }

  const user = rows[0];

  if (!user.is_active) {
    throw new Error('Compte désactivé');
  }

  const validPassword = await bcrypt.compare(password, user.password_hash);
  if (!validPassword) {
    throw new Error('Identifiants invalides');
  }

  // ✅ FIX B03: utilisation de generateToken() qui lit JWT_EXPIRES_IN depuis process.env
  //    Suppression de jwt.sign() inline avec expiresIn: '7d' hardcodé.
  const token = generateToken({ uuid: user.uuid, role: user.role });

  return {
    token,
    user: {
      uuid: user.uuid,
      email: user.email,
      phone: user.phone,
      role: user.role
    }
  };
}
