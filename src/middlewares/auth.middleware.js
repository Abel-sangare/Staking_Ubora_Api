// ✅ FIX B06: fichier unique et canonique pour l'authentification.
//    src/core/auth.middleware.js redirige vers ce fichier — ne plus importer depuis core/.
// ✅ FIX B07: suppression de la lecture du token depuis req.query.token et req.body.token.
//    Le token est accepté UNIQUEMENT via le header Authorization: Bearer <token>
//    ou le header legacy x-access-token. Toute autre source expose le token dans les logs.

import jwt from 'jsonwebtoken';

function extractToken(req) {
  // Méthode principale : Authorization: Bearer <token>
  const authHeader = req.headers?.authorization || req.headers?.Authorization;
  if (authHeader) {
    const parts = authHeader.split(' ');
    return parts.length === 2 && parts[0].toLowerCase() === 'bearer'
      ? parts[1]
      : null;
  }

  // Header alternatif legacy (accepté mais déprécié)
  if (req.headers?.['x-access-token']) return req.headers['x-access-token'];

  // ✅ FIX B07: req.query.token et req.body.token SUPPRIMÉS intentionnellement.
  //    Ces sources exposent le JWT dans les logs serveur, l'historique navigateur et les Referer headers.

  return null;
}

export function isAuth(req, res, next) {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({ error: 'Token manquant' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { uuid, role }
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Token invalide ou expiré' });
  }
}

export function isAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Utilisateur non authentifié' });
  }

  const userRole = (req.user.role || '').toLowerCase();
  if (userRole !== 'admin') {
    return res.status(403).json({ error: 'Accès réservé aux administrateurs' });
  }

  next();
}
