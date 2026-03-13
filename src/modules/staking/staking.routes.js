import express from 'express';
import { isAuth, isAdmin } from '../../middlewares/auth.middleware.js';
import {
  createPlanController,
  getPlansController,
  getPlanByIdController,
  updatePlanController,
  deletePlanController,
  subscribeUserController,
  claimRewardsController,
  getTotalStakedAmountController,
  getProfitController,
  getRewardHistoryController,
  getStakingHistoryController,
  getStakesForUserController,
  unstakeUserController // NEW IMPORT
} from './staking.controller.js';

const router = express.Router();

// Créer un plan
router.post('/plan', isAuth, isAdmin, createPlanController);

// Lister tous les plans
router.get('/plans', getPlansController);

// Récupérer un plan par ID
router.get('/plan/:id', isAuth, getPlanByIdController);

// Mettre à jour un plan
router.put('/plan/:id', isAuth, isAdmin, updatePlanController);

// Supprimer un plan
router.delete('/plan/:id', isAuth, isAdmin, deletePlanController);

// Souscrire un utilisateur
router.post('/subscribe', isAuth, subscribeUserController);

// Réclamer les intérêts accumulés
router.post('/claim-rewards', isAuth, claimRewardsController);

// Nouvelle route pour récupérer le total misé par l'utilisateur
router.get('/total-staked', isAuth, getTotalStakedAmountController);

// Nouvelle route pour récupérer le bénéfice du staking de l'utilisateur
router.get('/profit', isAuth, getProfitController);

// Nouvelle route pour récupérer l'historique des récompenses
router.get('/rewards/history', isAuth, getRewardHistoryController);

// Nouvelle route pour récupérer l'historique de staking (chaque ajout de profit)
router.get('/history', isAuth, getStakingHistoryController);

// Nouvelle route pour récupérer les mises actives de l'utilisateur
router.get('/user-stakes', isAuth, getStakesForUserController);

// Nouvelle route pour désinvestir (unstake)
router.post('/unstake', isAuth, unstakeUserController);

export default router;