import { findKycRequestByUserUuid } from '../database/models/kyc_request.model.js';

export async function kycCheckMiddleware(req, res, next) {
  const user_uuid = req.user?.uuid; // Utiliser le chaînage optionnel pour plus de sécurité

  console.log('KYC Check Middleware: Début');
  console.log('  req.user:', req.user);
  console.log('  user_uuid extrait de req.user:', user_uuid);

  if (!user_uuid) {
    console.log('KYC Check Middleware: user_uuid non trouvé dans req.user.');
    return res.status(401).json({ error: 'Utilisateur non authentifié ou UUID manquant.' });
  }

  try {
    const kycRequest = await findKycRequestByUserUuid(user_uuid);

    if (!kycRequest || kycRequest.status?.toLowerCase() !== 'approved') {
      return res.status(403).json({ error: 'Accès refusé : Vérification KYC requise et approuvée pour effectuer des transactions.' });
    }

    next();
  } catch (error) {
    console.error('Erreur lors de la vérification KYC:', error);
    return res.status(500).json({ error: 'Erreur interne du serveur lors de la vérification KYC.' });
  }
}
