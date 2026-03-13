/**
 * Ce fichier contient la documentation Swagger des endpoints admin.
 * Les routes effectives sont définies dans `src/modules/admin/admin.routes.js`.
 */

/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Gestion financière, taux et stratégie groupe
 */

/**
 * @swagger
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */

/**
 * @swagger
 * /admin/plans/{uuid}:
 *   put:
 *     summary: Modifier le taux d'intérêt et/ou les frais d'un plan
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: uuid
 *         required: true
 *         schema:
 *           type: string
 *         description: UUID du plan
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               interest_rate:
 *                 type: number
 *                 example: 12.5
 *               management_fee:
 *                 type: number
 *                 example: 15
 *     responses:
 *       200:
 *         description: Plan mis à jour
 *       400:
 *         description: Erreur de validation
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Non autorisé
 */

/**
 * @swagger
 * /admin/plans/{uuid}/status:
 *   put:
 *     summary: Activer ou désactiver un plan de staking
 *     tags: [Admin]
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
 *               is_active:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       200:
 *         description: Statut modifié
 *       400:
 *         description: Erreur
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Non autorisé
 */

/**
 * @swagger
 * /admin/exposure:
 *   get:
 *     summary: Voir l'exposition financière globale de la plateforme
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Exposition globale
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Non autorisé
 */

/**
 * @swagger
 * /admin/simulate:
 *   post:
 *     summary: Simuler l'impact d'un changement de taux d'intérêt
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               new_rate:
 *                 type: number
 *                 example: 18
 *     responses:
 *       200:
 *         description: Résultat de la simulation
 *       400:
 *         description: Erreur
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Non autorisé
 */

/**
 * @swagger
 * /admin/users:
 *   get:
 *     summary: Lister tous les utilisateurs
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste des utilisateurs
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Non autorisé
 */

/**
 * @swagger
 * /admin/dashboard:
 *   get:
 *     summary: Obtenir les statistiques du dashboard
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statistiques globales
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Non autorisé
 */