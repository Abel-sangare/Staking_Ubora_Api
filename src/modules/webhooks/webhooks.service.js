import { processIncomingDeposit } from '../transactions/deposit.service.js';
import crypto from 'crypto';

/**
 * Vérifie la signature HMAC des webhooks Alchemy pour empêcher les attaques.
 * @param {string} rawBody - Le corps brut de la requête (nécessaire pour HMAC)
 * @param {string} signature - La signature passée dans le header x-alchemy-signature
 */
export function verifyAlchemySignature(rawBody, signature) {
  const token = process.env.ALCHEMY_AUTH_TOKEN;
  if (!token) {
    console.warn('[Webhook] ALCHEMY_AUTH_TOKEN manquant. Sécurité désactivée !');
    return true; // Mode développement (à changer en production)
  }
  const hmac = crypto.createHmac('sha256', token);
  hmac.update(rawBody);
  const digest = hmac.digest('hex');
  return digest === signature;
}

// ── Alchemy ───────────────────────────────────────────────────────────────────

export async function processAlchemyWebhookEvent(payload) {
  try {
    const activities = payload?.event?.activity || payload?.activity || [];

    if (!Array.isArray(activities) || activities.length === 0) {
      return;
    }

    for (const activity of activities) {
      let toAddress, amount, currency, tx_hash, network;

      // Détection du type d'événement Alchemy (Address Activity)
      if (activity.assetChanges && activity.assetChanges.length > 0) {
        const receiveChange = activity.assetChanges.find(c => c.type === 'receive' && c.to);
        if (receiveChange) {
          toAddress = receiveChange.to;
          amount    = parseFloat(receiveChange.amount);
          currency  = receiveChange.asset;
          tx_hash   = activity.hash;
          network   = activity.network || activity.chain;
        }
      } else if (activity.toAddress && activity.value > 0) {
        toAddress = activity.toAddress;
        amount    = activity.value;
        currency  = activity.asset;
        tx_hash   = activity.hash;
        network   = activity.network || activity.chain;
      }

      if (!toAddress || !amount || isNaN(amount) || !tx_hash) continue;

      // Normalisation des réseaux
      if (network) {
        network = network.toUpperCase();
        if (network === 'BSC')  network = 'BEP20';
        if (network === 'TRON') network = 'TRC20';
      }

      // Normalisation des monnaies
      if (currency) {
        currency = currency.toUpperCase();
        if (currency === 'BNB' && network !== 'BEP20') network = 'BNB';
        if (currency === 'TRX' && network !== 'TRC20') network = 'TRX';
      }

      // Appeler le service centralisé pour le crédit
      await processIncomingDeposit({
        toAddress,
        amount,
        currency,
        network,
        tx_hash,
        method: 'alchemy_webhook'
      });
    }
  } catch (error) {
    console.error('[Alchemy] Erreur traitement webhook:', error);
  }
}

// ── Binance Pay ───────────────────────────────────────────────────────────────
//
// Binance Pay envoie plusieurs types d'événements (bizType) :
//   PAY            — paiement reçu
//   PAY_REFUND     — remboursement
//   TRANSFER_IN    — transfert entrant
//
// Ref: https://developers.binance.com/docs/binance-pay/notification-orders

export async function processBinancePayWebhookEvent(payload) {
  try {
    const bizType     = payload.bizType;
    const bizStatus   = payload.bizStatus;   // PAY_SUCCESS, PAY_CLOSED, etc.
    const bizIdStr    = payload.bizIdStr;    // ID de la commande Binance
    const data        = typeof payload.data === 'string'
      ? JSON.parse(payload.data)
      : payload.data;

    console.log(`[Binance Pay] bizType=${bizType} bizStatus=${bizStatus} bizId=${bizIdStr}`);

    // On ne traite que les paiements réussis
    if (bizType !== 'PAY' || bizStatus !== 'PAY_SUCCESS') {
      console.log(`[Binance Pay] Événement ignoré (bizType=${bizType} bizStatus=${bizStatus})`);
      return;
    }

    // merchantTradeNo = notre payment_uuid stocké lors de la création de l'ordre
    const payment_uuid = data?.merchantTradeNo || null;
    if (!payment_uuid) {
      console.warn('[Binance Pay] merchantTradeNo manquant dans le payload');
      return;
    }

    const amount   = parseFloat(data?.orderAmount || 0);
    const currency = data?.currency || 'USDT';

    // Vérifier que le paiement existe et est encore PENDING
    const [rows] = await db.query(
      'SELECT * FROM payments WHERE uuid = ? AND status = ?',
      [payment_uuid, 'PENDING']
    );

    if (rows.length === 0) {
      console.warn(`[Binance Pay] Paiement ${payment_uuid} introuvable ou déjà traité.`);
      return;
    }

    const payment = rows[0];

    // Vérification du montant (tolérance 0.01 pour les arrondis)
    if (Math.abs(payment.amount - amount) > 0.01) {
      console.error(
        `[Binance Pay] Montant incohérent pour ${payment_uuid}: ` +
        `attendu ${payment.amount}, reçu ${amount}`
      );
      await createAuditLog({
        event_type: 'BINANCE_PAY_AMOUNT_MISMATCH',
        actor_uuid: payment.user_uuid, actor_role: 'system',
        entity_type: 'PAYMENT', entity_uuid: payment_uuid,
        metadata: { expected: payment.amount, received: amount, currency, bizIdStr }
      });
      return;
    }

    // Confirmer le paiement
    await confirmPaymentFromWebhook(payment_uuid);

    // Créer la transaction de dépôt correspondante
    await db.query(
      `INSERT INTO transactions
       (uuid, user_uuid, type, method, amount, currency, status, tx_hash, network, created_at, updated_at)
       VALUES (UUID(), ?, 'deposit', 'binance_pay', ?, ?, 'CONFIRMED', ?, 'binance_pay', NOW(), NOW())`,
      [payment.user_uuid, amount, currency, bizIdStr]
    );

    await createAuditLog({
      event_type: 'BINANCE_PAY_DEPOSIT_CONFIRMED',
      actor_uuid: payment.user_uuid, actor_role: 'system',
      entity_type: 'PAYMENT', entity_uuid: payment_uuid,
      metadata: { amount, currency, bizIdStr }
    });

    console.log(`[Binance Pay] ✅ Paiement ${payment_uuid} confirmé — ${amount} ${currency}`);

  } catch (error) {
    console.error('[Binance Pay] Erreur traitement webhook:', error);
  }
}
