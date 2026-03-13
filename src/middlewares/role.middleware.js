// middlewares/role.middleware.js

/**
 * Middleware pour vérifier le rôle de l'utilisateur.
 * @param {Array<string>} allowedRoles - Les rôles autorisés à accéder à la route
 */
export function roleMiddleware(allowedRoles = []) {
  return (req, res, next) => {
    try {
      // req.user doit être défini par authMiddleware
      if (!req.user) {
        return res.status(401).json({ error: 'Non authentifié' });
      }

      // Vérifie si le rôle de l'utilisateur est autorisé
      if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({ error: 'Accès refusé : rôle non autorisé' });
      }

      next(); // tout est OK, on passe à la route
    } catch (err) {
      res.status(500).json({ error: 'Erreur interne du serveur' });
    }
  };
}