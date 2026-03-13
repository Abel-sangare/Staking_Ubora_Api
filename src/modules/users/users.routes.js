import express from 'express';
import { isAuth } from '../../middlewares/auth.middleware.js';
import { getUserProfile, updateUserProfile } from './users.service.js'; // Note: ces fonctions sont toujours dans users.service.js
import { getWallet, getUserStakesController } from './users.controller.js';

const router = express.Router();

// GET /users/me
router.get('/me', isAuth, async (req, res) => {
	try {
		const user = await getUserProfile(req.user.uuid);
		if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' });
		res.json(user);
	} catch (err) {
		res.status(400).json({ error: err.message });
	}
});

// PUT /users/me
router.put('/me', isAuth, async (req, res) => {
	try {
		const user = await updateUserProfile(req.user.uuid, req.body);
		res.json({ message: 'Profil mis à jour', user });
	} catch (err) {
		res.status(400).json({ error: err.message });
	}
});

// GET /users/stakes
router.get('/stakes', isAuth, getUserStakesController);

// GET /users/wallet
router.get('/wallet', isAuth, getWallet);

export default router;
