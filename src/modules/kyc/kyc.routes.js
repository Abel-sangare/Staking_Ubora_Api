import express from 'express';
import * as kycController from './kyc.controller.js';
import { isAuth,isAdmin } from '../../middlewares/auth.middleware.js';
import { uploadKycImages } from '../../middlewares/upload.middleware.js';

const router = express.Router();

// User routes
router.post('/submit', isAuth, uploadKycImages, kycController.submitKyc);
router.get('/me', isAuth, kycController.getUserKyc);

// Admin routes (Moved to admin.routes.js)

export default router;
