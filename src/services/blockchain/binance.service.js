// src/services/blockchain/binance.service.js
import axios from 'axios';
import crypto from 'crypto';
// import { BINANCE_API_KEY, BINANCE_API_SECRET } from '../../config/env.js'; // Removed direct import
import dotenv from 'dotenv'; // Ensure dotenv is configured if not already

dotenv.config(); // Ensure env vars are loaded

const BINANCE_API_KEY = process.env.BINANCE_API_KEY;
const BINANCE_API_SECRET = process.env.BINANCE_API_SECRET;

// Configuration Axios pour le client API Binance
const binanceApiClient = axios.create({
  baseURL: 'https://api.binance.com', // Ou 'https://testnet.binance.vision' pour le testnet
  headers: {
    'X-MBX-APIKEY': BINANCE_API_KEY,
  },
});

/**
 * Génère une signature HMAC SHA256 pour les requêtes Binance.
 * @param {string} queryString
 * @returns {string}
 */
function signRequest(queryString) {
  return crypto.createHmac('sha256', BINANCE_API_SECRET).update(queryString).digest('hex');
}

/**
 * Fonction pour faire des requêtes signées à Binance.
 * @param {string} method - GET, POST, PUT, DELETE
 * @param {string} endpoint - /api/v3/account
 * @param {object} params - Paramètres de la requête
 */
async function makeSignedRequest(method, endpoint, params = {}) {
  if (!BINANCE_API_KEY || !BINANCE_API_SECRET) {
    throw new Error('Binance API Key or Secret Key not configured.');
  }

  const timestamp = Date.now();
  const queryString = new URLSearchParams({ ...params, timestamp }).toString();
  const signature = signRequest(queryString);

  const url = `${endpoint}?${queryString}&signature=${signature}`;

  try {
    const response = await binanceApiClient({
      method: method,
      url: url,
    });
    return response.data;
  } catch (error) {
    console.error(`Error making signed Binance API request to ${endpoint}:`, error.response?.data || error.message);
    throw new Error(`Binance API Error: ${error.response?.data?.msg || error.message}`);
  }
}

// --- Fonctions d'intégration spécifiques à Binance ---

/**
 * Récupère l'adresse de dépôt pour un actif et un réseau.
 * @param {string} coin - ex: 'USDT'
 * @param {string} network - ex: 'BSC'
 */
export async function getBinanceDepositAddress(coin, network) {
  const params = { coin, network };
  return await makeSignedRequest('GET', '/sapi/v1/capital/deposit/address', params);
}

/**
 * Récupère l'historique des dépôts pour réconciliation.
 * @param {string} coin 
 * @param {number} startTime 
 */
export async function getBinanceDepositHistory(coin, startTime) {
  const params = { coin, status: 1 }; // 1 = Success
  if (startTime) params.startTime = startTime;
  return await makeSignedRequest('GET', '/sapi/v1/capital/deposit/hisrec', params);
}

/**
 * Initie un retrait réel de Binance vers une adresse externe.
 * @param {string} coin - ex: 'USDT'
 * @param {string} address - Adresse de destination
 * @param {number} amount - Montant
 * @param {string} network - ex: 'BSC'
 */
export async function initiateBinanceWithdrawal(coin, address, amount, network) {
  const params = {
    coin,
    address,
    amount,
    network,
    // Note: 'amount' doit inclure les frais ou être net selon votre logique
  };
  
  // POST /sapi/v1/capital/withdraw/apply
  return await makeSignedRequest('POST', '/sapi/v1/capital/withdraw/apply', params);
}

/**
 * Vérifie le statut d'un retrait.
 */
export async function getBinanceWithdrawStatus(withdrawId) {
  const params = { withdrawId };
  return await makeSignedRequest('GET', '/sapi/v1/capital/withdraw/history', params);
}

/**
 * Récupère les réseaux pris en charge pour un actif donné (coin).
 * Cela inclut les réseaux disponibles pour le dépôt et le retrait.
 * @param {string} coin - L'actif pour lequel récupérer les réseaux (ex: 'USDT').
 * @returns {Array} Une liste d'objets réseau avec des détails.
 */
export async function getBinanceSupportedNetworks(coin) {
  const allConfigs = await makeSignedRequest('GET', '/sapi/v1/capital/config/getall');
  
  const coinConfig = allConfigs.find(config => config.coin === coin);

  if (!coinConfig || !coinConfig.networkList) {
    return []; // Aucun réseau trouvé pour cette pièce
  }

  // Retourne la liste des réseaux pour le dépôt et le retrait
  // On peut filtrer davantage si nécessaire (ex: network.withdrawEnable ou network.depositEnable)
  return coinConfig.networkList.map(network => ({
    network: network.network,
    name: network.name,
    withdrawEnable: network.withdrawEnable,
    depositEnable: network.depositEnable,
    withdrawMin: network.withdrawMin,
    depositMin: network.depositMin,
    // Ajoutez d'autres champs pertinents si nécessaire
  }));
}

/**
 * [PLACEHOLDER] Vérifie la signature d'un webhook de Binance.
 * REMARQUE : Binance n'utilise pas de signature HMAC pour TOUS les webhooks.
 * Par exemple, pour les User Data Stream (nécessaire pour les dépôts en temps réel), il s'agit d'un websocket.
 * Pour d'autres webhooks (ex: de P2P ou autres), il pourrait y avoir une signature.
 * Cette fonction est un placeholder générique. La logique exacte dépendra du type de webhook Binance utilisé.
 *
 * @param {object} payload - Corps de la requête webhook
 * @param {string} signature - Signature fournie dans les headers (si applicable)
 * @returns {boolean} - true si la signature est valide
 */
export function verifyBinanceWebhookSignature(payload, signature) {
  console.warn(`[PLACEHOLDER] verifyBinanceWebhookSignature appelé. Ceci est une simulation.`);
  // Logique réelle :
  // Dépend du type de webhook Binance. Certains peuvent utiliser un hmac avec une clé secrète partagée.
  // Pour l'instant, on simule une validation.
  return true;
}