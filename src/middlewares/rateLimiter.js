import rateLimit from 'express-rate-limit';

// ✅ FIX B08: les limiters sont désormais importés ET appliqués dans server.js.
//    Ce fichier existait mais n'était jamais utilisé.

// Limiter global : 100 requêtes / 15 min
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de requêtes, veuillez réessayer dans 15 minutes.' }
});

// Limiter renforcé pour les endpoints d'authentification : 10 tentatives / 15 min
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de tentatives de connexion, veuillez réessayer dans 15 minutes.' }
});

// Limiter pour les opérations financières sensibles (staking, retraits)
export const financialLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop d\'opérations financières, veuillez patienter.' }
});
