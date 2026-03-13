import express from 'express';
import * as kycController from '../kyc/kyc.controller.js'; // Import kycController
import { isAuth } from '../../middlewares/auth.middleware.js';
import { isAdmin } from '../../middlewares/admin.middleware.js';

import {
  updatePlan,
  togglePlan,
  getGlobalExposure,
  simulateRateChange,
  getAllUsers,
  getDashboardStats
} from './admin.service.js';

const router = express.Router();

// 🔐 Sécurisation globale : AUTH + ADMIN
router.use(isAuth, isAdmin);

/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Gestion des taux, frais et stratégie financière
 */

// Admin KYC routes (originally from kyc.routes.js)
// These routes will be mounted under /admin/kyc
/**
 * @swagger
 * /admin/kyc:
 *   get:
 *     summary: Lister toutes les requêtes KYC (Admin)
 *     tags: [KYC]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste de toutes les requêtes KYC.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/KYCRequest'
 *       401:
 *         description: Non authentifié.
 *       403:
 *         description: Non autorisé (seuls les administrateurs).
 *       500:
 *         description: Erreur serveur.
 */
router.get('/kyc', kycController.getAllKyc);

/**
 * @swagger
 * /admin/kyc/{userUuid}:
 *   get:
 *     summary: Obtenir les détails de la dernière requête KYC d'un utilisateur spécifique (Admin)
 *     tags: [KYC]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userUuid
 *         required: true
 *         schema:
 *           type: string
 *         description: UUID de l'utilisateur pour lequel récupérer la requête KYC
 *     responses:
 *       200:
 *         description: Détails de la dernière requête KYC de l'utilisateur.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/KYCRequest'
 *       401:
 *         description: Non authentifié.
 *       403:
 *         description: Non autorisé (seuls les administrateurs).
 *       404:
 *         description: Requête KYC non trouvée pour cet utilisateur.
 *       500:
 *         description: Erreur serveur.
 */
router.get('/kyc/:userUuid', kycController.getKycDetails);

/**
 * @swagger
 * /admin/kyc/{userUuid}/approve:
 *   put:
 *     summary: Approuver la dernière requête KYC en attente d'un utilisateur (Admin)
 *     tags: [KYC]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userUuid
 *         required: true
 *         schema:
 *           type: string
 *         description: UUID de l'utilisateur dont la requête KYC doit être approuvée
 *     responses:
 *       200:
 *         description: Requête KYC de l'utilisateur approuvée avec succès.
 *       400:
 *         description: Requête invalide, aucune requête en attente pour cet utilisateur, ou administrateur non trouvé.
 *       401:
 *         description: Non authentifié.
 *       403:
 *         description: Non autorisé (seuls les administrateurs).
 */
router.put('/kyc/:userUuid/approve', kycController.approveKyc);

/**
 * @swagger
 * /admin/kyc/{userUuid}/reject:
 *   put:
 *     summary: Rejeter la dernière requête KYC en attente d'un utilisateur (Admin)
 *     tags: [KYC]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userUuid
 *         required: true
 *         schema:
 *           type: string
 *         description: UUID de l'utilisateur dont la requête KYC doit être rejetée
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - review_comment
 *             properties:
 *               review_comment:
 *                 type: string
 *                 example: Document illisible ou information manquante.
 *     responses:
 *       200:
 *         description: Requête KYC de l'utilisateur rejetée avec succès.
 *       400:
 *         description: Requête invalide, aucune requête en attente pour cet utilisateur, administrateur non trouvé, ou commentaire de rejet manquant.
 *       401:
 *         description: Non authentifié.
 *       403:
 *         description: Non autorisé (seuls les administrateurs).
 */
router.put('/kyc/:userUuid/reject', kycController.rejectKyc);


/**
 * @swagger
 * /admin/plans/{uuid}:
 *   put:
 *     summary: Modifier les paramètres d'un plan de staking
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: uuid
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               min_amount:
 *                 type: number
 *                 example: 10
 *               max_amount:
 *                 type: number
 *                 example: 1000
 *               USDT_rate_by_day:
 *                 type: number
 *                 example: 0.05
 *     responses:
 *       200:
 *         description: Plan mis à jour
 */
router.put('/plans/:uuid', async (req, res) => {
  try {
    const { min_amount, max_amount, USDT_rate_by_day } = req.body;

    if (min_amount === undefined && max_amount === undefined && USDT_rate_by_day === undefined) {
      return res.status(400).json({ error: 'Aucune donnée à mettre à jour' });
    }

    await updatePlan(req.params.uuid, { min_amount, max_amount, USDT_rate_by_day });
    res.json({ message: 'Plan mis à jour avec succès' });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

/**
 * @swagger
 * /admin/plans/{uuid}/status:
 *   put:
 *     summary: Activer ou désactiver un plan de staking
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: uuid
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               is_active:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       200:
 *         description: Statut modifié
 */
router.put('/plans/:uuid/status', async (req, res) => {
  try {
    const { is_active } = req.body;

    if (typeof is_active !== 'boolean') {
      return res.status(400).json({ error: 'is_active doit être un booléen' });
    }

    await togglePlan(req.params.uuid, is_active);
    res.json({ message: 'Statut du plan modifié' });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

/**
 * @swagger
 * /admin/exposure:
 *   get:
 *     summary: Voir l’exposition financière globale de la plateforme
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Exposition globale
 */
router.get('/exposure', async (req, res) => {
  try {
    const exposure = await getGlobalExposure();
    res.json(exposure);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

/**
 * @swagger
 * /admin/simulate:
 *   post:
 *     summary: Simuler l’impact d’un changement de taux d’intérêt
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               new_rate:
 *                 type: number
 *                 example: 18
 *     responses:
 *       200:
 *         description: Résultat de la simulation
 */
router.post('/simulate', async (req, res) => {
  try {
    const { new_rate } = req.body;

    if (typeof new_rate !== 'number') {
      return res.status(400).json({ error: 'new_rate doit être un nombre' });
    }

    const result = await simulateRateChange(new_rate);
    res.json(result);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

/**
 * @swagger
 * /admin/users:
 *   get:
 *     summary: Lister tous les utilisateurs (ADMIN)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste des utilisateurs
 */
router.get('/users', async (req, res) => {
  try {
    const users = await getAllUsers();
    res.json(users);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

/**
 * @swagger
 * /admin/dashboard:
 *   get:
 *     summary: Obtenir les statistiques du dashboard (ADMIN)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statistiques du dashboard
 */
router.get('/dashboard', async (req, res) => {
  try {
    const stats = await getDashboardStats();
    res.json(stats);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

export default router;