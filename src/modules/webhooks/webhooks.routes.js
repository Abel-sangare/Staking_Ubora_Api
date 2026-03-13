// src/modules/webhooks/webhooks.routes.js
import express from 'express';
import { handleAlchemyDepositWebhook, handleBinancePayWebhook } from './webhooks.controller.js';
import { verifyAlchemySignature, verifyBinancePaySignature } from './webhooks.middleware.js';

const router = express.Router();

/**
 * @swagger
 * /webhooks/alchemy-deposit:
 *   post:
 *     summary: Réception des notifications de dépôt Alchemy
 *     tags: [Webhooks]
 *     responses:
 *       200:
 *         description: Webhook traité
 */
router.post(
  '/alchemy-deposit',
  verifyAlchemySignature,
  handleAlchemyDepositWebhook
);

/**
 * @swagger
 * /webhooks/binance-pay:
 *   post:
 *     summary: Réception des notifications de paiement Binance Pay
 *     tags: [Webhooks]
 *     responses:
 *       200:
 *         description: Webhook traité
 */
router.post(
  '/binance-pay',
  verifyBinancePaySignature,
  handleBinancePayWebhook
);

export default router;
