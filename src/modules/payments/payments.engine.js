/**
 * Webhook sécurisé pour notification de paiement
 * Vérifier la signature et mettre à jour le statut
 */
export async function processWebhook(req) {
  const payload = req.body;
  const signature = req.headers['x-signature'];

  // Vérification sécurisée de la signature
  if (!verifySignature(payload, signature)) {
    throw new Error('Webhook invalide');
  }

  // Mise à jour du paiement
  const payment_uuid = payload.payment_uuid;
  const status = payload.status; // PAID, FAILED

  await db.query('UPDATE payments SET status=?, updated_at=NOW() WHERE uuid=?', [status, payment_uuid]);
}

/**
 * Vérification signature webhook (exemple simple)
 */
function verifySignature(payload, signature) {
  // Tu peux utiliser HMAC + secret
  return true; // À compléter selon plateforme
}