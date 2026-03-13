// ✅ FIX B06: ce fichier ne contient plus de logique dupliquée.
//    Il réexporte depuis le middleware canonique src/middlewares/auth.middleware.js
//    pour maintenir la compatibilité avec les imports existants dans d'autres modules.
//    À terme, migrer tous les imports vers ../../middlewares/auth.middleware.js directement.

export { isAuth as authenticate, isAuth, isAdmin } from '../middlewares/auth.middleware.js';
