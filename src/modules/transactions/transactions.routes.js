import express from 'express';
import transactionsController from './transactions.controller.js';

const router = express.Router();

router.use('/', transactionsController);

export default router;