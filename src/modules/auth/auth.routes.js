import express from 'express';
import { registerUser, loginUser, logoutUser } from './auth.controller.js';
import { isAuth } from '../../middlewares/auth.middleware.js';

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/logout', isAuth, logoutUser);

export default router;