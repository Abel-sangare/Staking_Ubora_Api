import express from 'express';
import { createPaymentIntent, verifyPayment, getPaymentsJournal } from './payments.service.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Payments
 *   description: Gestion des paiements cartes et plateformes
 */

/**
 * @swagger
 * /payments/intent:
 *   post:
 *     summary: Créer une intention de paiement
 *     tags: [Payments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - user_uuid
 *               - amount
 *               - currency
 *               - method
 *             properties:
 *               user_uuid:
 *                 type: string
 *               amount:
 *                 type: number
 *               currency:
 *                 type: string
 *               method:
 *                 type: string
 *                 enum: [stripe, paypal, card]
 *     responses:
 *       201:
 *         description: Intention de paiement créée
 */
router.post('/intent', async (req, res) => {
  try {
    const result = await createPaymentIntent(req.body);
    res.status(201).json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * @swagger
 * /payments/{uuid}/verify:
 *   get:
 *     summary: Vérifier le statut d'un paiement
 *     tags: [Payments]
 *     parameters:
 *       - in: path
 *         name: uuid
 *         required: true
 *         schema:
 *           type: string
 *         description: UUID du paiement
 *     responses:
 *       200:
 *         description: Paiement vérifié
 *       404:
 *         description: Paiement non trouvé
 */
router.get('/:uuid/verify', async (req, res) => {
  try {
    const result = await verifyPayment(req.params.uuid);
    res.json(result);
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

/**
 * @swagger
 * /payments/journal:
 *   get:
 *     summary: Récupérer le journal comptable des paiements
 *     tags: [Payments]
 *     responses:
 *       200:
 *         description: Liste des paiements
 */
router.get('/journal', async (req, res) => {
  try {
    const result = await getPaymentsJournal();
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;