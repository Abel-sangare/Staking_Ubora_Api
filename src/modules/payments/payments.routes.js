// src/modules/payments/payments.routes.js
import express from 'express';
import paymentsController from './payments.controller.js';

const router = express.Router();

// Toutes les routes du controller sont branchées ici
router.use('/', paymentsController);

export default router;