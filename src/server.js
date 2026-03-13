import express from 'express';
import cors from 'cors';
import swaggerJsDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { PORT, NODE_ENV } from './config/env.js';

import authRoutes from './modules/auth/auth.routes.js';
import stakingRoutes from './modules/staking/staking.routes.js';
import transactionsRoutes from './modules/transactions/transactions.routes.js';
import paymentsRoutes from './modules/payments/payments.routes.js';
import adminRoutes from './modules/admin/admin.routes.js';
import usersRoutes from './modules/users/users.routes.js';
import auditRoutes from './services/audit/audit.controller.js';
import kycRoutes from './modules/kyc/kyc.routes.js';
import webhooksRoutes from './modules/webhooks/webhooks.routes.js';

import { apiLimiter, authLimiter } from './middlewares/rateLimiter.js'; // ✅ FIX B08

import './jobs/staking-cron.js';
import './jobs/transaction-monitor.js';
import './jobs/sweeper.js';
import './jobs/gas-station.js';

const app = express();

/* ======================
   Logging — FIX B10
====================== */
// ✅ FIX B10: suppression du console.log(req.url) complet qui exposait les tokens JWT
//    dans les logs (via query string). On logue uniquement méthode + path sans query string.
app.use((req, res, next) => {
  if (NODE_ENV !== 'production') {
    console.log(`REQ: ${req.method} ${req.path}`);
  }
  next();
});

/* ======================
   Middlewares
====================== */

// ✅ FIX B05: CORS restreint aux domaines de production.
//    Remplacer les valeurs ci-dessous par les vrais domaines de la plateforme.
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Autoriser les appels sans origin (mobile natif, curl, tests)
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origine non autorisée — ${origin}`));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Webhooks : raw body avant express.json (pas de CORS navigateur sur ces routes)
app.use('/webhooks',
  express.raw({ type: () => true, limit: '10mb' }), // ✅ FIX B11: 50mb → 10mb
  webhooksRoutes
);

// ✅ FIX B11: limite body réduite de 50mb à 1mb pour les routes JSON standard
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ limit: '1mb', extended: true }));

// ✅ FIX B08: rate limiter global appliqué sur toutes les routes
app.use(apiLimiter);

/* ======================
   Routes
====================== */

// ✅ FIX B08: authLimiter renforcé sur les endpoints d'authentification
app.use('/auth', authLimiter, authRoutes);
app.use('/staking', stakingRoutes);
app.use('/transactions', transactionsRoutes);
app.use('/payments', paymentsRoutes);
app.use('/admin', adminRoutes);
app.use('/users', usersRoutes);
app.use('/audit', auditRoutes);
app.use('/kyc', kycRoutes);

/* ======================
   Swagger — FIX B09
====================== */
// ✅ FIX B09: Swagger désactivé en production.
//    Pour y accéder en dev : NODE_ENV=development (valeur par défaut).
if (NODE_ENV !== 'production') {
  const swaggerOptions = {
    definition: {
      openapi: '3.0.0',
      info: {
        title: 'Staking Ubora API',
        version: '1.0.0',
        description: 'Documentation API Staking Ubora — ENVIRONNEMENT DE DÉVELOPPEMENT',
      },
      servers: [{ url: `http://localhost:${PORT}` }],
    },
    apis: [
      './src/modules/auth/auth.controller.js',
      './src/modules/staking/staking.controller.js',
      './src/modules/transactions/transactions.controller.js',
      './src/modules/payments/payments.controller.js',
      './src/modules/admin/admin.controller.js',
      './src/modules/users/users.controller.js',
      './src/services/audit/audit.controller.js',
      './src/modules/kyc/kyc.controller.js',
      './src/modules/webhooks/webhooks.routes.js'
    ],
  };

  const swaggerDocs = swaggerJsDoc(swaggerOptions);
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));
  app.get('/', (req, res) => res.redirect('/api-docs'));
} else {
  // En production : la racine retourne juste un statut OK
  app.get('/', (req, res) => res.json({ status: 'ok' }));
}

/* ======================
   Start Server
====================== */
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT} [${NODE_ENV}]`);
});
