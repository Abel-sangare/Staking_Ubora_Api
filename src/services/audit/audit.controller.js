import express from 'express';
import { isAuth } from '../../middlewares/auth.middleware.js';
import { isAdmin } from '../../middlewares/admin.middleware.js';
import { exportAuditLogs, getAuditLogs } from './audit.service.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Audit
 *   description: Traçabilité & conformité réglementaire
 */

/**
 * @swagger
 * /audit/logs:
 *   get:
 *     summary: Liste des logs d’audit
 *     tags: [Audit]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: event_type
 *         schema:
 *           type: string
 *       - in: query
 *         name: actor_uuid
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Logs d’audit
 */
router.get('/logs', isAuth, isAdmin, async (req, res) => {
  res.json(await getAuditLogs(req.query));
});

/**
 * @swagger
 * /audit/export:
 *   get:
 *     summary: Exporter les logs pour audit externe
 *     tags: [Audit]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [json, csv]
 */
router.get('/export', isAuth, isAdmin, async (req, res) => {
  const file = await exportAuditLogs(req.query.format || 'json');
  res.download(file);
});

export default router;