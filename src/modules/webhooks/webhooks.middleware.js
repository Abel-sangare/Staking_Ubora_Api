// src/modules/webhooks/webhooks.middleware.js
import crypto from 'crypto';
import { ALCHEMY_WEBHOOK_SECRET } from '../../config/env.js';

// ── Alchemy ───────────────────────────────────────────────────────────────────

export function verifyAlchemySignature(req, res, next) {
  if (!ALCHEMY_WEBHOOK_SECRET) {
    console.warn('[Webhook Middleware] ALCHEMY_WEBHOOK_SECRET non défini, bypass de la signature.');
    return next();
  }

  const signature = req.headers['x-alchemy-signature'];
  if (!signature) {
    return res.status(400).json({ message: 'Signature manquante' });
  }

  const secret  = ALCHEMY_WEBHOOK_SECRET.trim();
  const rawBody = req.body;

  if (!rawBody || (Buffer.isBuffer(rawBody) && rawBody.length === 0)) {
    return res.status(400).json({ message: 'Body manquant pour la signature' });
  }

  const digest    = crypto.createHmac('sha256', secret).update(rawBody).digest('hex').toLowerCase();
  const provided  = signature.toLowerCase();

  if (digest === provided) {
    next();
  } else {
    console.error(`[Alchemy] Signature invalide. Calculé: ${digest} | Reçu: ${provided}`);
    return res.status(403).json({ message: 'Signature invalide' });
  }
}

// ── Binance Pay ───────────────────────────────────────────────────────────────
//
// Binance Pay signe ses webhooks avec RSA-SHA256.
// La clé publique Binance est disponible sur :
// https://developers.binance.com/docs/binance-pay/webhook
//
// Headers envoyés par Binance :
//   BinancePay-Timestamp   — timestamp epoch ms
//   BinancePay-Nonce       — nonce aléatoire
//   BinancePay-Signature   — signature base64 RSA-SHA256
//
// Payload signé = "<timestamp>\n<nonce>\n<body>\n"

const BINANCE_PAY_PUBLIC_KEY = process.env.BINANCE_PAY_PUBLIC_KEY || null;

export function verifyBinancePaySignature(req, res, next) {
  if (!BINANCE_PAY_PUBLIC_KEY) {
    console.warn('[Binance Pay] BINANCE_PAY_PUBLIC_KEY non défini — vérification désactivée.');
    return next();
  }

  const timestamp = req.headers['binancepay-timestamp'];
  const nonce     = req.headers['binancepay-nonce'];
  const signature = req.headers['binancepay-signature'];

  if (!timestamp || !nonce || !signature) {
    return res.status(400).json({ message: 'Headers Binance Pay manquants' });
  }

  // Rejeter les webhooks trop anciens (5 min)
  const age = Date.now() - parseInt(timestamp, 10);
  if (age > 5 * 60 * 1000) {
    return res.status(400).json({ message: 'Webhook Binance Pay expiré' });
  }

  const rawBody = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : JSON.stringify(req.body);
  const payload = `${timestamp}\n${nonce}\n${rawBody}\n`;

  try {
    const verify = crypto.createVerify('RSA-SHA256');
    verify.update(payload);
    const isValid = verify.verify(
      `-----BEGIN PUBLIC KEY-----\n${BINANCE_PAY_PUBLIC_KEY}\n-----END PUBLIC KEY-----`,
      signature,
      'base64'
    );

    if (isValid) {
      next();
    } else {
      console.error('[Binance Pay] Signature invalide');
      return res.status(403).json({ message: 'Signature Binance Pay invalide' });
    }
  } catch (err) {
    console.error('[Binance Pay] Erreur vérification signature:', err.message);
    return res.status(500).json({ message: 'Erreur vérification signature' });
  }
}
