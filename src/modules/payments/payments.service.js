import { v4 as uuidv4 } from 'uuid';
import { db } from '../../config/database.js';
import axios from 'axios';

export async function createPaymentIntent({ user_uuid, amount, currency, method }) {
  const payment_uuid = uuidv4();

  await db.query(
    `INSERT INTO payments
     (uuid, user_uuid, amount, currency, method, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 'PENDING', NOW(), NOW())`,
    [payment_uuid, user_uuid, amount, currency, method]
  );

  let platformResponse = {};
  if (method === 'stripe') {
    // TODO: appel Stripe API pour créer paymentIntent
    // platformResponse = await stripe.paymentIntents.create({...})
  }

  return { uuid: payment_uuid, user_uuid, amount, currency, method, status: 'PENDING', platformResponse };
}

// ✅ FIX B04: suppression de `const isPaid = true` qui marquait tout paiement comme PAID
//    sans vérification réelle. Cette fonction ne doit être appelée QUE depuis un webhook
//    signé (Alchemy, Stripe, etc.) ou après une vérification API externe réelle.
//    En l'absence d'intégration de paiement complète, cet endpoint est désactivé en prod.
export async function verifyPayment(payment_uuid) {
  const [rows] = await db.query('SELECT * FROM payments WHERE uuid = ?', [payment_uuid]);
  if (rows.length === 0) throw new Error('Paiement non trouvé');

  const payment = rows[0];

  // ✅ FIX B04: vérification réelle à implémenter selon la méthode de paiement.
  //    Ne JAMAIS valider un paiement côté serveur sans confirmation de la passerelle de paiement.
  //    Exemple Stripe :
  //      const intent = await stripe.paymentIntents.retrieve(payment.platform_ref);
  //      const isPaid = intent.status === 'succeeded';
  //    Exemple webhook : laisser le webhook signé appeler confirmPayment() directement.

  throw new Error(
    'verifyPayment() requiert une intégration de passerelle de paiement réelle. ' +
    'Utilisez les webhooks signés pour confirmer les paiements.'
  );
}

// ✅ Nouvelle fonction appelée exclusivement depuis un webhook signé et vérifié
export async function confirmPaymentFromWebhook(payment_uuid) {
  const [rows] = await db.query('SELECT * FROM payments WHERE uuid = ?', [payment_uuid]);
  if (rows.length === 0) throw new Error('Paiement non trouvé');

  await db.query('UPDATE payments SET status="PAID", updated_at=NOW() WHERE uuid=?', [payment_uuid]);

  return { ...rows[0], status: 'PAID' };
}

export async function getPaymentsJournal() {
  const [rows] = await db.query('SELECT * FROM payments ORDER BY created_at DESC');
  return rows;
}
