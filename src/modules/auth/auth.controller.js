import { register, login } from './auth.service.js';
import { createAuditLog } from '../../services/audit/audit.service.js';

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication endpoints
 */

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               phone:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: User created
 *       400:
 *         description: Bad request
 */
export async function registerUser(req, res) {
  try {
    const result = await register(req.body);
    res.status(201).json({ message: 'User created', user: result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *       400:
 *         description: Invalid credentials
 */
export async function loginUser(req, res) {
  try {
    const { email, phone, password } = req.body || {}; // ← safe

    if ((!email && !phone) || !password) {
      return res.status(400).json({
        error: 'Email ou téléphone + mot de passe requis'
      });
    }

    const result = await login({ email, phone, password });
    const user = result.user ?? result;

    await createAuditLog({
      event_type: 'LOGIN',
      actor_uuid: user.uuid,
      actor_role: 'USER',
      entity_type: 'USER',
      entity_uuid: user.uuid,
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });

    return res.status(200).json(result);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
}

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Logout user (invalidate token/session)
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout successful
 *       401:
 *         description: Unauthorized
 */
export async function logoutUser(req, res) {
  try {
    // Assuming token invalidation or session clearing happens on the client side
    // or through a more sophisticated token blacklisting mechanism on the server.
    // For now, we'll just return a success message.
    // In a real app, you might invalidate the JWT on the server or clear session.
    await createAuditLog({
      event_type: 'LOGOUT',
      actor_uuid: req.user.uuid, // Assuming req.user is populated by auth middleware
      actor_role: 'USER',
      entity_type: 'USER',
      entity_uuid: req.user.uuid,
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });
    res.status(200).json({ message: 'Logout successful' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}