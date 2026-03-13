// src/modules/webhooks/webhooks.controller.js
import * as webhooksService from './webhooks.service.js';
import { verifyAlchemySignature } from './webhooks.middleware.js';

// ── Alchemy ───────────────────────────────────────────────────────────────────

export async function handleAlchemyDepositWebhook(req, res) {
  try {
    const event = Buffer.isBuffer(req.body) ? JSON.parse(req.body.toString('utf8')) : req.body;
    console.log('🔥 Webhook Alchemy reçu :', event.id || 'N/A');

    // Répondre immédiatement pour éviter le timeout
    res.status(200).json({ success: true, message: 'Webhook reçu et en cours de traitement' });

    webhooksService.processAlchemyWebhookEvent(event)
      .then(() => console.log(`✅ Webhook Alchemy ${event.id || ''} traité.`))
      .catch(err => console.error(`❌ Erreur webhook Alchemy ${event.id || ''}:`, err));

  } catch (error) {
    console.error('Erreur parsing webhook Alchemy:', error);
    return res.status(200).json({ success: false, error: 'Format invalide' });
  }
}

// ── Binance Pay ───────────────────────────────────────────────────────────────

export async function handleBinancePayWebhook(req, res) {
  try {
    const payload = Buffer.isBuffer(req.body) ? JSON.parse(req.body.toString('utf8')) : req.body;
    console.log('🔥 Webhook Binance Pay reçu :', payload.bizType || 'N/A');

    // Répondre immédiatement à Binance (obligatoire sous 3s)
    res.status(200).json({ returnCode: 'SUCCESS', returnMessage: null });

    webhooksService.processBinancePayWebhookEvent(payload)
      .then(() => console.log(`✅ Webhook Binance Pay traité: ${payload.bizIdStr || ''}`))
      .catch(err => console.error(`❌ Erreur webhook Binance Pay:`, err));

  } catch (error) {
    console.error('Erreur parsing webhook Binance Pay:', error);
    return res.status(200).json({ returnCode: 'SUCCESS', returnMessage: null });
  }
}
