import * as kycService from './kyc.service.js';
import cloudinary from '../../config/cloudinary.js';
import { getUserIdByUuid } from '../users/users.service.js'; // Import the new function

/**
 * @swagger
 * tags:
 *   name: KYC
 *   description: Gestion des requêtes KYC (Know Your Customer)
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     KYCRequest:
 *       type: object
 *       required:
 *         - document_type
 *         - document_number
 *         - document_front_url
 *         - selfie_url
 *       properties:
 *         id:
 *           type: integer
 *           description: ID auto-généré de la requête KYC
 *           readOnly: true
 *         user_id:
 *           type: integer
 *           description: ID de l'utilisateur associé à la requête KYC
 *           readOnly: true
 *         document_type:
 *           type: string
 *           enum: [cni, passport, driving_license]
 *           description: Type de document (carte nationale d'identité, passeport, permis de conduire)
 *         document_number:
 *           type: string
 *           description: Numéro du document
 *         document_front_url:
 *           type: string
 *           format: url
 *           description: URL de la face avant du document
 *         document_back_url:
 *           type: string
 *           format: url
 *           description: URL de la face arrière du document (optionnel)
 *         selfie_url:
 *           type: string
 *           format: url
 *           description: URL du selfie de l'utilisateur avec le document
 *         status:
 *           type: string
 *           enum: [pending, approved, rejected]
 *           default: pending
 *           description: Statut de la requête (en attente, approuvée, rejetée)
 *           readOnly: true
 *         reviewed_by:
 *           type: integer
 *           description: ID de l'administrateur ayant examiné la requête
 *           readOnly: true
 *         review_comment:
 *           type: string
 *           description: Commentaire de l'administrateur lors de l'examen
 *           readOnly: true
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: Date de création de la requête
 *           readOnly: true
 *         reviewed_at:
 *           type: string
 *           format: date-time
 *           description: Date d'examen de la requête
 *           readOnly: true
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */

/**
 * @swagger
 * /kyc/submit:
 *   post:
 *     summary: Soumettre une nouvelle requête KYC avec des fichiers images.
 *     tags: [KYC]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - document_type
 *               - document_number
 *               - documentFront
 *               - selfie
 *             properties:
 *               document_type:
 *                 type: string
 *                 enum: [cni, passport, driving_license]
 *                 example: cni
 *               document_number:
 *                 type: string
 *                 example: ABC123456
 *               documentFront:
 *                 type: string
 *                 format: binary
 *                 description: Fichier image de la face avant du document.
 *               documentBack:
 *                 type: string
 *                 format: binary
 *                 description: Fichier image de la face arrière du document (optionnel).
 *               selfie:
 *                 type: string
 *                 format: binary
 *                 description: Fichier image du selfie de l'utilisateur.
 *     responses:
 *       201:
 *         description: Requête KYC soumise avec succès.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 kycRequestId:
 *                   type: integer
 *       400:
 *         description: Requête invalide, fichiers manquants ou une requête KYC en attente existe déjà.
 *       401:
 *         description: Non authentifié.
 */
export async function submitKyc(req, res) {
  try {
    const { document_type, document_number } = req.body;
    const userUuid = req.user.uuid; // Get the UUID from the decoded JWT

    console.log(`KYC Controller - User UUID: ${userUuid}`); // Log userUuid directly

    if (!req.files || (!req.files.documentFront && !req.files.selfie)) {
      return res.status(400).json({ message: 'Document front image and selfie are required.' });
    }

    let documentFrontUrl = null;
    let documentBackUrl = null;
    let selfieUrl = null;

    // Upload documentFront
    if (req.files.documentFront && req.files.documentFront[0]) {
      const result = await cloudinary.uploader.upload(
        `data:${req.files.documentFront[0].mimetype};base64,${req.files.documentFront[0].buffer.toString('base64')}`,
        {
          resource_type: "image",
          folder: "kyc_documents" // Optional: specify a folder in Cloudinary
        }
      );
      documentFrontUrl = result.secure_url;
    }

    // Upload documentBack (optional)
    if (req.files.documentBack && req.files.documentBack[0]) {
      const result = await cloudinary.uploader.upload(
        `data:${req.files.documentBack[0].mimetype};base64,${req.files.documentBack[0].buffer.toString('base64')}`,
        {
          resource_type: "image",
          folder: "kyc_documents"
        }
      );
      documentBackUrl = result.secure_url;
    }

    // Upload selfie
    if (req.files.selfie && req.files.selfie[0]) {
      const result = await cloudinary.uploader.upload(
        `data:${req.files.selfie[0].mimetype};base64,${req.files.selfie[0].buffer.toString('base64')}`,
        {
          resource_type: "image",
          folder: "kyc_documents"
        }
      );
      selfieUrl = result.secure_url;
    }

    // Ensure document_type, document_number, documentFrontUrl, selfieUrl are present
    if (!document_type || !document_number || !documentFrontUrl || !selfieUrl) {
      return res.status(400).json({ message: 'Missing required KYC fields or file uploads failed.' });
    }

    const kycRequestId = await kycService.submitKycRequest(
      userUuid, // Pass userUuid directly
      document_type,
      document_number,
      documentFrontUrl,
      documentBackUrl, // This will be null if no back document was uploaded
      selfieUrl
    );
    res.status(201).json({ message: 'KYC request submitted successfully.', kycRequestId });
  } catch (error) {
    console.error('KYC submission error:', error);
    res.status(400).json({ message: error.message });
  }
}

/**
 * @swagger
 * /kyc/me:
 *   get:
 *     summary: Obtenir la dernière requête KYC de l'utilisateur authentifié
 *     tags: [KYC]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dernière requête KYC de l'utilisateur.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/KYCRequest'
 *       401:
 *         description: Non authentifié.
 *       404:
 *         description: Aucune requête KYC trouvée pour cet utilisateur.
 *       500:
 *         description: Erreur serveur.
 */
export async function getUserKyc(req, res) {
  try {
    const userUuid = req.user.uuid; // Get the UUID from the decoded JWT
    const kycRequest = await kycService.getKycRequestForUser(userUuid);
    if (!kycRequest) {
      return res.status(404).json({ message: 'No KYC request found for this user.' });
    }
    res.status(200).json(kycRequest);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

/**
 * @swagger
 * /admin/kyc:
 *   get:
 *     summary: Lister toutes les requêtes KYC (Admin)
 *     tags: [KYC]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste de toutes les requêtes KYC.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/KYCRequest'
 *       401:
 *         description: Non authentifié.
 *       403:
 *         description: Non autorisé (seuls les administrateurs).
 *       500:
 *         description: Erreur serveur.
 */
export async function getAllKyc(req, res) {
  try {
    const kycRequests = await kycService.fetchAllKycRequests();
    res.status(200).json(kycRequests);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

/**
 * @swagger
 * /admin/kyc/{userUuid}:
 *   get:
 *     summary: Obtenir les détails de la dernière requête KYC d'un utilisateur spécifique (Admin)
 *     tags: [KYC]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userUuid
 *         required: true
 *         schema:
 *           type: string
 *         description: UUID de l'utilisateur pour lequel récupérer la requête KYC
 *     responses:
 *       200:
 *         description: Détails de la dernière requête KYC de l'utilisateur.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/KYCRequest'
 *       401:
 *         description: Non authentifié.
 *       403:
 *         description: Non autorisé (seuls les administrateurs).
 *       404:
 *         description: Requête KYC non trouvée pour cet utilisateur.
 *       500:
 *         description: Erreur serveur.
 */
export async function getKycDetails(req, res) {
  try {
    const { userUuid } = req.params; // Extract userUuid from params
    const kycRequest = await kycService.getKycRequestDetails(userUuid); // Pass userUuid to service
    if (!kycRequest) {
      return res.status(404).json({ message: 'No KYC request found for this user.' });
    }
    res.status(200).json(kycRequest);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

/**
 * @swagger
 * /admin/kyc/{userUuid}/approve:
 *   put:
 *     summary: Approuver la dernière requête KYC en attente d'un utilisateur (Admin)
 *     tags: [KYC]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userUuid
 *         required: true
 *         schema:
 *           type: string
 *         description: UUID de l'utilisateur dont la requête KYC doit être approuvée
 *     responses:
 *       200:
 *         description: Requête KYC de l'utilisateur approuvée avec succès.
 *       400:
 *         description: Requête invalide, aucune requête en attente pour cet utilisateur, ou administrateur non trouvé.
 *       401:
 *         description: Non authentifié.
 *       403:
 *         description: Non autorisé (seuls les administrateurs).
 */
export async function approveKyc(req, res) {
  try {
    const { userUuid } = req.params; // Extract userUuid from params
    const adminUuid = req.user.uuid;
    const reviewedBy = await getUserIdByUuid(adminUuid); // Get integer ID of admin

    if (!reviewedBy) {
      return res.status(400).json({ message: 'Admin user not found.' });
    }

    await kycService.approveKycRequest(userUuid, reviewedBy); // Pass userUuid to service
    res.status(200).json({ message: 'KYC request approved successfully.' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
}

/**
 * @swagger
 * /admin/kyc/{userUuid}/reject:
 *   put:
 *     summary: Rejeter la dernière requête KYC en attente d'un utilisateur (Admin)
 *     tags: [KYC]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userUuid
 *         required: true
 *         schema:
 *           type: string
 *         description: UUID de l'utilisateur dont la requête KYC doit être rejetée
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - review_comment
 *             properties:
 *               review_comment:
 *                 type: string
 *                 example: Document illisible ou information manquante.
 *     responses:
 *       200:
 *         description: Requête KYC de l'utilisateur rejetée avec succès.
 *       400:
 *         description: Requête invalide, aucune requête en attente pour cet utilisateur, administrateur non trouvé, ou commentaire de rejet manquant.
 *       401:
 *         description: Non authentifié.
 *       403:
 *         description: Non autorisé (seuls les administrateurs).
 */
export async function rejectKyc(req, res) {
  try {
    const { userUuid } = req.params; // Extract userUuid from params
    const { review_comment } = req.body;
    const adminUuid = req.user.uuid;
    const reviewedBy = await getUserIdByUuid(adminUuid); // Get integer ID of admin

    if (!reviewedBy) {
      return res.status(400).json({ message: 'Admin user not found.' });
    }

    await kycService.rejectKycRequest(userUuid, reviewedBy, review_comment); // Pass userUuid to service
    res.status(200).json({ message: 'KYC request rejected successfully.' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
}
