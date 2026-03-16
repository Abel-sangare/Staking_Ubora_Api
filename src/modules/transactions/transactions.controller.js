import express from 'express';
import { isAuth } from '../../middlewares/auth.middleware.js';
import { roleMiddleware } from '../../middlewares/role.middleware.js';
import {
  createDeposit,
  createWithdrawal,
  updateTransactionStatus,
  getTransactions,
  getTransactionById
} from './transactions.service.js';
import * as binanceService from '../../services/blockchain/binance.service.js'; // New import
import { createAuditLog } from '../../services/audit/audit.service.js';
import { kycCheckMiddleware } from '../../middlewares/kyc.middleware.js'; // <-- Ajout de cette ligne
import { getUserProfile } from '../users/users.service.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Transactions
 *   description: "Dépôts et retraits crypto & fiat"
 */

/* =====================================================
   USER — GET DEPOSIT ADDRESS
===================================================== */
/**
 * @swagger
 * /transactions/deposit-address:
 *   get:
 *     summary: "Obtenir l'adresse de dépôt personnelle de l'utilisateur"
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: coin
 *         schema:
 *           type: string
 *         description: "Le symbole de la crypto-monnaie (ex: USDT). Par défaut USDT."
 *       - in: query
 *         name: network
 *         schema:
 *           type: string
 *         description: "Le réseau blockchain (ex: BSC, TRC20, BNB). Si non fourni, utilise l'adresse locale."
 *     responses:
 *       200:
 *         description: "Adresse de dépôt personnelle de l'utilisateur"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 address:
 *                   type: string
 *                   description: "L'adresse de dépôt"
 *                 coin: { type: string }
 *                 network: { type: string }
 *       401:
 *         description: "Non authentifié"
 *       404:
 *         description: "Utilisateur ou adresse de portefeuille non trouvé"
 */
router.get(
  '/deposit-address',
  isAuth,
  roleMiddleware(['USER']),
  kycCheckMiddleware, // Exige un KYC approuvé
  async (req, res) => {
    try {
      const { coin = 'USDT', network } = req.query;
      const user = await getUserProfile(req.user.uuid);

      if (!user) {
        return res.status(404).json({ error: 'Utilisateur non trouvé.' });
      }

      // Si un réseau spécifique est demandé (autre que BSC par défaut), on interroge Binance
      if (network && network.toUpperCase() !== 'BSC') {
        try {
          let binanceNetwork = network.toUpperCase();
          // Mapping pour Binance : TRC20 est souvent identifié par 'TRX'
          if (binanceNetwork === 'TRC20') binanceNetwork = 'TRX';
          if (binanceNetwork === 'BEP20') binanceNetwork = 'BSC';

          const binanceAddress = await binanceService.getBinanceDepositAddress(coin.toUpperCase(), binanceNetwork);
          return res.status(200).json({
            address: binanceAddress.address,
            tag: binanceAddress.tag,
            coin: coin.toUpperCase(),
            network: network.toUpperCase()
          });
        } catch (binanceErr) {
          console.error(`Erreur Binance pour l'adresse ${coin}/${network}:`, binanceErr.message);
          return res.status(400).json({ error: `Impossible de récupérer une adresse de dépôt pour le réseau ${network}. ${binanceErr.message}` });
        }
      }

      // Par défaut, ou si BSC est demandé, on peut retourner l'adresse locale du portefeuille (EVM)
      if (!user.wallet_address) {
        return res.status(404).json({ error: 'Adresse de portefeuille locale non trouvée.' });
      }

      res.status(200).json({
        address: user.wallet_address,
        coin: coin.toUpperCase(),
        network: network ? network.toUpperCase() : 'BSC'
      });

    } catch (err) {
      console.error('Erreur lors de la récupération de l\'adresse de dépôt:', err);
      res.status(500).json({ error: err.message || 'Erreur interne du serveur.' });
    }
  }
);

/* =====================================================
   USER — CREATE WITHDRAWAL
===================================================== */
/**
 * @swagger
 * /transactions/withdrawal:
 *   post:
 *     summary: "Créer une demande de retrait (via Binance)"
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *               - currency
 *               - network
 *               - toAddress
 *             properties:
 *               amount:
 *                 type: number
 *                 description: "Le montant à retirer"
 *               currency:
 *                 type: string
 *                 description: "La crypto-monnaie (ex: USDT)"
 *               network:
 *                 type: string
 *                 description: "Le réseau blockchain pour le retrait (ex: BSC, TRC20)"
 *               toAddress:
 *                 type: string
 *                 description: "L'adresse de destination du retrait"
 *     responses:
 *       201:
 *         description: "Demande de retrait initiée"
 *       400:
 *         description: "Erreur (ex: solde insuffisant)"
 */
router.post(
  '/withdrawal',
  isAuth,
  roleMiddleware(['USER']),
  kycCheckMiddleware, // Ajout du middleware KYC
  async (req, res) => {
    try {
      const { amount, currency, network, toAddress } = req.body;
      const user_uuid = req.user.uuid;

      if (!amount || !currency || !network || !toAddress) {
        return res.status(400).json({ error: 'Tous les champs (amount, currency, network, toAddress) sont requis' });
      }

      const tx = await createWithdrawal({ user_uuid, amount, currency, network, toAddress, type: 'WITHDRAWAL', status: 'PENDING', actor_role: req.user.role });

      res.status(201).json(tx);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }
);

/* =====================================================
   ADMIN — UPDATE TRANSACTION STATUS
===================================================== */
/**
 * @swagger
 * /transactions/{uuid}/status:
 *   put:
 *     summary: "Mettre à jour le statut d'une transaction (ADMIN)"
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: uuid
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [PENDING, APPROVED, SENT, CONFIRMED, FAILED]
 *               tx_hash:
 *                 type: string
 *               confirmations:
 *                 type: integer
 *     responses:
 *       200:
 *         description: "Transaction mise à jour"
 *       400:
 *         description: "Erreur"
 *       403:
 *         description: "Accès refusé"
 */
router.put(
  '/:uuid/status',
  isAuth,
  roleMiddleware(['ADMIN']),
  async (req, res) => {
    try {
      const { status, tx_hash, confirmations } = req.body;
      const tx = await updateTransactionStatus(req.params.uuid, status, tx_hash, confirmations);

      await createAuditLog({
        event_type: 'TRANSACTION_STATUS_UPDATED',
        actor_uuid: req.user.uuid,
        actor_role: 'ADMIN',
        entity_type: 'TRANSACTION',
        entity_uuid: req.params.uuid,
        metadata: { status, tx_hash, confirmations },
        ip_address: req.ip,
        user_agent: req.headers['user-agent']
      });

      res.status(200).json(tx);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }
);

/* =====================================================
   ADMIN — APPROVE WITHDRAWAL
===================================================== */
/**
 * @swagger
 * /transactions/{uuid}/admin-approve:
 *   put:
 *     summary: "Approuver un retrait en attente et envoyer les fonds (ADMIN)"
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: uuid
 *         required: true
 *         schema:
 *           type: string
 *         description: UUID de la transaction de retrait à approuver
 *     responses:
 *       200:
 *         description: "Retrait approuvé et fonds envoyés"
 *       400:
 *         description: "Requête invalide ou erreur lors de l'envoi des fonds"
 *       403:
 *         description: "Accès refusé"
 *       404:
 *         description: "Transaction de retrait non trouvée"
 */
router.put(
  '/:uuid/admin-approve',
  isAuth,
  roleMiddleware(['ADMIN']),
  async (req, res) => {
    try {
      const { uuid } = req.params;
      const adminUuid = req.user.uuid; // L'UUID de l'admin qui approuve

      const result = await adminApproveWithdrawal(uuid, adminUuid);

      await createAuditLog({
        event_type: 'WITHDRAWAL_APPROVED_BY_ADMIN',
        actor_uuid: adminUuid,
        actor_role: 'ADMIN',
        entity_type: 'TRANSACTION',
        entity_uuid: uuid,
        metadata: { status: result.status, tx_hash: result.tx_hash },
      });

      res.status(200).json(result);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }
);

/* =====================================================
   USER / ADMIN — GET TRANSACTIONS
===================================================== */
/**
 * @swagger
 * /transactions:
 *   get:
 *     summary: "Récupérer toutes les transactions (ADMIN) ou ses propres transactions (USER)"
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: user_uuid
 *         schema:
 *           type: string
 *         required: false
 *         description: "Filtrer par UUID utilisateur (ADMIN seulement)"
 *     responses:
 *       200:
 *         description: "Liste des transactions"
 *       401:
 *         description: "Non authentifié"
 *       403:
 *         description: "Accès refusé"
 */
router.get(
  '/',
  isAuth,
  async (req, res) => {
    try {
      const isAdmin = req.user.role === 'ADMIN';
      const txs = await getTransactions(isAdmin ? req.query.user_uuid : req.user.uuid);
      res.status(200).json(txs);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }
);

/* =====================================================
   USER / ADMIN — GET TRANSACTION BY UUID
===================================================== */
/**
 * @swagger
 * /transactions/{uuid}:
 *   get:
 *     summary: "Récupérer une transaction par UUID"
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: uuid
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: "Transaction trouvée"
 *       401:
 *         description: "Non authentifié"
 *       403:
 *         description: "Accès interdit"
 *       404:
 *         description: "Transaction non trouvée"
 */
router.get(
  '/:uuid',
  isAuth,
  async (req, res) => {
    try {
      const tx = await getTransactionById(req.params.uuid);
      if (!tx) return res.status(404).json({ error: 'Transaction non trouvée' });

      if (req.user.role !== 'ADMIN' && tx.user_uuid !== req.user.uuid) {
        return res.status(403).json({ error: 'Accès interdit' });
      }

      res.status(200).json(tx);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }
);
/* =====================================================
   USER — GET BINANCE SUPPORTED NETWORKS
===================================================== */
/**
 * @swagger
 * /transactions/binance/networks:
 *   get:
 *     summary: "Obtenir la liste des réseaux pris en charge par Binance pour une crypto-monnaie donnée"
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: coin
 *         schema:
 *           type: string
 *         required: true
 *         description: "Le symbole de la crypto-monnaie (ex: USDT)"
 *     responses:
 *       200:
 *         description: "Liste des réseaux supportés par Binance"
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   network: { type: string, description: "Nom du réseau (ex: BSC, ERC20)" }
 *                   name: { type: string, description: "Nom complet du réseau" }
 *                   withdrawEnable: { type: boolean, description: "Retrait activé sur ce réseau" }
 *                   depositEnable: { type: boolean, description: "Dépôt activé sur ce réseau" }
 *                   withdrawMin: { type: number, description: "Montant minimum de retrait" }
 *                   depositMin: { type: number, description: "Montant minimum de dépôt" }
 *       400:
 *         description: "Paramètre 'coin' manquant"
 *       401:
 *         description: "Non authentifié"
 */
export async function getBinanceNetworksController(req, res) {
  try {
    const { coin } = req.query;
    if (!coin) {
      return res.status(400).json({ error: 'Le paramètre "coin" est requis.' });
    }
    const networks = await binanceService.getBinanceSupportedNetworks(coin.toUpperCase()); // Convert to uppercase as Binance API usually expects this
    res.status(200).json(networks);
  } catch (err) {
    console.error('Error fetching Binance networks:', err);
    res.status(500).json({ error: err.message || 'Erreur interne du serveur.' });
  }
}

router.get('/binance/networks', isAuth, getBinanceNetworksController); // NEW ROUTE

export default router;