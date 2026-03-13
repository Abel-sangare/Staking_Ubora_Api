import { db } from '../../config/database.js';

export async function createUser(user) {
  const sql = `
    INSERT INTO users (uuid, email, phone, password_hash)
    VALUES (?, ?, ?, ?)
  `;
  const [result] = await db.execute(sql, [
    user.uuid,
    user.email,
    user.phone,
    user.password_hash
  ]);
  return result.insertId;
}

export async function findUserByEmail(email) {
  const sql = `SELECT * FROM users WHERE email = ? LIMIT 1`;
  const [rows] = await db.execute(sql, [email]);
  return rows[0];
}

export async function findUserById(id) {
  const sql = `SELECT * FROM users WHERE id = ?`;
  const [rows] = await db.execute(sql, [id]);
  return rows[0];
}