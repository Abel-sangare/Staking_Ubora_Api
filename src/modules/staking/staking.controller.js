// src/modules/staking/staking.controller.js
import * as stakingService from './staking.service.js';

/**
 * @swagger
 * tags:
 *   name: Staking
 *   description: Opérations liées au staking
 */

/**
 * @swagger
 * /staking/total-staked:
 *   get:
 *     summary: Récupère le montant total misé par l'utilisateur authentifié
 *     tags: [Staking]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Montant total misé récupéré avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalStaked:
 *                   type: number
 *                   format: float
 *                   description: Montant total misé par l'utilisateur
 *       400:
 *         description: Erreur lors de la récupération du montant total misé
 *       401:
 *         description: Non autorisé
 */
export async function getTotalStakedAmountController(req, res) {
  try {
    const user_uuid = req.user.uuid;
    const totalStaked = await stakingService.getTotalStakedAmount(user_uuid);
    res.status(200).json({ totalStaked });
  } catch (err) {
    console.error('Error fetching total staked amount in controller', { user_uuid: req.user.uuid, err });
    res.status(400).json({ error: err.message });
  }
  
}

/**
 * @swagger
 * /staking/profit:
 *   get:
 *     summary: Récupère le bénéfice total du staking pour l'utilisateur authentifié
 *     tags: [Staking]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Bénéfice total du staking récupéré avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 profit:
 *                   type: number
 *                   format: float
 *                   description: Montant total du bénéfice de staking pour l'utilisateur
 *       400:
 *         description: Erreur lors de la récupération du bénéfice du staking
 *       401:
 *         description: Non autorisé
 */
export async function getProfitController(req, res) {
  try {
    const user_uuid = req.user.uuid;
    const profit = await stakingService.getProfit(user_uuid);
    res.status(200).json({ profit });
  } catch (err) {
    console.error('Error fetching staking profit in controller', { user_uuid: req.user.uuid, err });
    res.status(400).json({ error: err.message });
  }
}

/**
 * @swagger
 * /staking/plan:
 *   post:
 *     summary: Crée un nouveau plan de staking
 *     tags: [Staking]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - min_amount
 *               - max_amount
 *               - rate_by_day
 *             properties:
 *               name:
 *                 type: string
 *               min_amount:
 *                 type: number
 *                 format: float
 *               max_amount:
 *                 type: number
 *                 format: float
 *               rate_by_day:
 *                 type: number
 *                 format: float
 *     responses:
 *       201:
 *         description: Plan créé avec succès
 *       400:
 *         description: Requête invalide
 */
export async function createPlanController(req, res) {
  try {
    const { name, min_amount, max_amount, rate_by_day } = req.body;
    if (!name || min_amount === undefined || max_amount === undefined || rate_by_day === undefined) {
      return res.status(400).json({ error: 'Champs requis: name, min_amount, max_amount, rate_by_day' });
    }
    const result = await stakingService.createPlan({ name, min_amount, max_amount, rate_by_day });
    res.status(201).json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

/**
 * @swagger
 * /staking/plans:
 *   get:
 *     summary: Récupère tous les plans de staking actifs
 *     tags: [Staking]
 *     responses:
 *       200:
 *         description: Liste des plans récupérée avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   name:
 *                     type: string
 *                   min_amount:
 *                     type: number
 *                   max_amount:
 *                     type: number
 *                   rate_by_day:
 *                     type: number
 *                   is_active:
 *                     type: integer
 *       400:
 *         description: Erreur lors de la récupération des plans
 */
export async function getPlansController(req, res) {
  try {
    const plans = await stakingService.getPlans();
    res.status(200).json(plans);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

/**
 * @swagger
 * /staking/plan/{id}:
 *   get:
 *     summary: Récupère un plan de staking par son ID
 *     tags: [Staking]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID du plan de staking
 *     responses:
 *       200:
 *         description: Plan récupéré avec succès
 *       400:
 *         description: ID invalide ou erreur
 *       404:
 *         description: Plan non trouvé
 */
export async function getPlanByIdController(req, res) {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: 'ID invalide' });
  try {
    const plan = await stakingService.getPlanById(id);
    if (!plan) return res.status(404).json({ error: 'Plan non trouvé' });
    res.status(200).json(plan);
  } catch (err) {
    console.error('Error fetching plan in controller', { id, err });
    res.status(400).json({ error: err.message });
  }
}

/**
 * @swagger
 * /staking/plan/{id}:
 *   put:
 *     summary: Met à jour un plan de staking existant
 *     tags: [Staking]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID du plan de staking à mettre à jour
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               min_amount:
 *                 type: number
 *                 format: float
 *               max_amount:
 *                 type: number
 *                 format: float
 *               rate_by_day:
 *                 type: number
 *                 format: float
 *     responses:
 *       200:
 *         description: Plan mis à jour avec succès
 *       400:
 *         description: Requête invalide ou erreur
 */
export async function updatePlanController(req, res) {
  try {
    const plan = await stakingService.updatePlan(req.params.id, req.body);
    res.status(200).json(plan);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

/**
 * @swagger
 * /staking/plan/{id}:
 *   delete:
 *     summary: Supprime un plan de staking
 *     tags: [Staking]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID du plan de staking à supprimer
 *       - in: query
 *         name: hard
 *         schema:
 *           type: boolean
 *           default: true
 *         required: false
 *         description: Si vrai, supprime définitivement; sinon, marque comme inactif.
 *     responses:
 *       200:
 *         description: Plan supprimé ou marqué comme inactif avec succès
 *       400:
 *         description: Erreur lors de la suppression du plan
 *       404:
 *         description: Plan non trouvé
 */
export async function deletePlanController(req, res) {
  const id = parseInt(req.params.id, 10);
  const hard = req.query.hard === undefined ? true : (req.query.hard === '1' || req.query.hard === 'true');
  try {
    const result = await stakingService.deletePlan(id, hard);
    if (!result || result.affectedRows === 0) {
      return res.status(404).json({ error: 'Plan non trouvé ou déjà supprimé' });
    }
    const message = hard ? 'Plan supprimé définitivement' : 'Plan marqué comme inactif';
    res.status(200).json({ message });
  } catch (err) {
    console.error('Error deleting plan in controller', { id, hard, err });
    res.status(400).json({ error: err.message });
  }
}

/**
 * @swagger
 * /staking/subscribe:
 *   post:
 *     summary: Souscrit l'utilisateur authentifié à un plan de staking
 *     tags: [Staking]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - plan_id
 *               - amount
 *               - duration_days
 *             properties:
 *               plan_id:
 *                 type: integer
 *               amount:
 *                 type: number
 *                 format: float
 *               duration_days:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Souscription au plan réussie
 *       400:
 *         description: Requête invalide ou erreur de souscription
 *       401:
 *         description: Non autorisé
 */
export async function subscribeUserController(req, res) {
  try {
    const { plan_id, amount, duration_days } = req.body;
    const user_uuid = req.user.uuid;

    if (!plan_id || !amount || !duration_days) {
      return res.status(400).json({
        error: 'Champs requis: plan_id, amount, duration_days'
      });
    }

    const result = await stakingService.subscribeUser({
      user_uuid,
      plan_id,
      amount,
      duration_days
    });

    res.status(201).json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

/**
 * @swagger
 * /staking/claim-rewards:
 *   post:
 *     summary: Réclame les récompenses (intérêts accumulés) pour une mise spécifique
 *     tags: [Staking]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - stake_id
 *             properties:
 *               stake_id:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Récompenses réclamées avec succès
 *       400:
 *         description: Requête invalide ou erreur lors de la réclamation des récompenses
 *       401:
 *         description: Non autorisé
 *       404:
 *         description: Mise non trouvée
 */
export async function claimRewardsController(req, res) {
  try {
    const { stake_id } = req.body;
    const user_uuid = req.user.uuid;

    if (!stake_id) {
      return res.status(400).json({
        error: 'Champs requis: stake_id'
      });
    }

    const result = await stakingService.claimRewards({
      user_uuid,
      stake_id
    });

    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

/**
 * @swagger
 * /staking/rewards/history:
 *   get:
 *     summary: Récupère l'historique des récompenses (intérêts) réclamées pour l'utilisateur authentifié
 *     tags: [Staking]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Historique des récompenses récupéré avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   reward_id:
 *                     type: integer
 *                   stake_id:
 *                     type: integer
 *                   reward_amount:
 *                     type: number
 *                     format: float
 *                   reward_date:
 *                     type: string
 *                     format: date-time
 *                   stake_amount:
 *                     type: number
 *                     format: float
 *                   plan_name:
 *                     type: string
 *       400:
 *         description: Erreur lors de la récupération de l'historique des récompenses
 *       401:
 *         description: Non autorisé
 */
export async function getRewardHistoryController(req, res) {
  try {
    const user_uuid = req.user.uuid;
    const rewardHistory = await stakingService.getRewardHistoryForUser(user_uuid);
    res.status(200).json(rewardHistory);
  } catch (err) {
    console.error('Error fetching reward history in controller', { user_uuid: req.user.uuid, err });
    res.status(400).json({ error: err.message });
  }
}

/**
 * @swagger
 * /staking/history:
 *   get:
 *     summary: Récupère l'historique détaillé des ajouts d'intérêts pour l'utilisateur authentifié
 *     tags: [Staking]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Historique de staking récupéré avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   stake_id:
 *                     type: integer
 *                   date:
 *                     type: string
 *                     format: date-time
 *                   capital:
 *                     type: number
 *                     format: float
 *                   interest:
 *                     type: number
 *                     format: float
 *                   fee:
 *                     type: number
 *                     format: float
 *                   created_at:
 *                     type: string
 *                     format: date-time
 *                   original_stake_amount:
 *                     type: number
 *                     format: float
 *                   plan_name:
 *                     type: string
 *       400:
 *         description: Erreur lors de la récupération de l'historique de staking
 *       401:
 *         description: Non autorisé
 */
export async function getStakingHistoryController(req, res) {
  try {
    const user_uuid = req.user.uuid;
    const stakingHistory = await stakingService.getStakingHistoryForUser(user_uuid);
    res.status(200).json(stakingHistory);
  } catch (err) {
    console.error('Error fetching staking history in controller', { user_uuid: req.user.uuid, err });
    res.status(400).json({ error: err.message });
  }
}

/**
 * @swagger
 * /staking/user-stakes:
 *   get:
 *     summary: Récupère la liste détaillée des mises actives de l'utilisateur authentifié
 *     tags: [Staking]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste des mises actives récupérée avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   stake_id:
 *                     type: integer
 *                   amount:
 *                     type: number
 *                     format: float
 *                   status:
 *                     type: string
 *                   duration_days:
 *                     type: integer
 *                   subscription_date:
 *                     type: string
 *                     format: date-time
 *                   plan_name:
 *                     type: string
 *                   rate_by_day:
 *                     type: number
 *                     format: float
 *       400:
 *         description: Erreur lors de la récupération des mises de l'utilisateur
 *       401:
 *         description: Non autorisé
 */
export async function getStakesForUserController(req, res) {
  try {
    const user_uuid = req.user.uuid;
    const stakes = await stakingService.getStakesForUser(user_uuid);
    res.status(200).json(stakes);
  } catch (err) {
    console.error('Error fetching user stakes in controller', { user_uuid: req.user.uuid, err });
    res.status(400).json({ error: err.message });
  }
}

/**
 * @swagger
 * /staking/unstake:
 *   post:
 *     summary: Retire le capital principal d'une mise (désinvestissement)
 *     tags: [Staking]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - stake_id
 *             properties:
 *               stake_id:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Désinvestissement réussi
 *       400:
 *         description: "Erreur lors du désinvestissement (ex: période de verrouillage non écoulée)"
 *       401:
 *         description: Non autorisé
 */
export async function unstakeUserController(req, res) {
  try {
    const { stake_id } = req.body;
    const user_uuid = req.user.uuid;
    const isAdmin = req.user.role === 'ADMIN';

    if (!stake_id) {
      return res.status(400).json({ error: 'Champ requis: stake_id' });
    }

    const result = await stakingService.unstakeUser({
      user_uuid,
      stake_id,
      isAdmin
    });

    res.status(200).json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}