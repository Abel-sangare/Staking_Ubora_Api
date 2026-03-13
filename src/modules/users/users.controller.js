/**
 * Documentation et contrôleurs pour les endpoints Users
 * Les routes sont définies dans `src/modules/users/users.routes.js`.
 */

import { getUserWalletBalance } from './users.service.js';
import { getStakesForUser } from '../staking/staking.service.js';

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: Gestion du profil utilisateur
 */

/**
 * @swagger
 * /users/me:
 *   get:
 *     summary: Récupérer le profil de l'utilisateur connecté
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profil utilisateur
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 uuid:
 *                   type: string
 *                 email:
 *                   type: string
 *                 phone:
 *                   type: string
 *                 role:
 *                   type: string
 *                 is_active:
 *                   type: boolean
 *       401:
 *         description: Non authentifié
 *       404:
 *         description: Utilisateur non trouvé
 */

/**
 * @swagger
 * /users/me:
 *   put:
 *     summary: Mettre à jour le profil utilisateur
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
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
 *             responses:
 *               200:
 *                 description: Profil mis à jour
 *               400:
 *                 description: Erreur de validation
 *               401:
 *                 description: Non authentifié
 */

/**
 * @swagger
 * /users/wallet:
 *   get:
 *     summary: Récupérer le solde du wallet de l'utilisateur
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Solde du wallet
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user_uuid:
 *                   type: string
 *                 total_deposits:
 *                   type: number
 *                 total_withdrawals:
 *                   type: number
 *                 balance:
 *                   type: number
 *                 currency:
 *                   type: string
 *       401:
 *         description: Non authentifié
 */
export async function getWallet(req, res) {
	try {
		const user_uuid = req.user?.uuid;
		if (!user_uuid) return res.status(401).json({ error: 'Non authentifié' });

		const wallet = await getUserWalletBalance(user_uuid);
		return res.json(wallet);
	} catch (err) {
		return res.status(400).json({ error: err.message });
	}
}

/**
 * @swagger
 * /users/stakes:
 *   get:
 *     summary: Récupère la liste de toutes les souscriptions (mises) de l'utilisateur
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Une liste des mises de l'utilisateur
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   stake_id:
 *                     type: integer
 *                   amount:
 *                     type: number
 *                   status:
 *                     type: string
 *                   duration_days:
 *                     type: integer
 *                   subscription_date:
 *                     type: string
 *                     format: date-time
 *                   plan_name:
 *                     type: string
 *                   rate_by_day:
 *                     type: number
 *       401:
 *         description: Non authentifié
 */
export async function getUserStakesController(req, res) { // RENOMMAGE ET NOUVELLE LOGIQUE
    try {
        const user_uuid = req.user.uuid;
        const stakes = await getStakesForUser(user_uuid);
        res.status(200).json(stakes);
    } catch (err) {
        console.error('Error fetching stakes for user', { user_uuid: req.user.uuid, err });
        res.status(400).json({ error: err.message });
    }
}

export default {};

