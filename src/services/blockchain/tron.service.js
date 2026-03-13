// src/services/blockchain/tron.service.js
// Gestion TRON / TRC20 (USDT-TRC20)
// Dépendance : npm install tronweb

import { TronWeb } from 'tronweb';
import dotenv from 'dotenv';
dotenv.config();

// ─── Provider TRON ────────────────────────────────────────────────────────────
const TRON_FULL_NODE     = process.env.TRON_FULL_NODE     || 'https://api.trongrid.io';
const TRON_SOLIDITY_NODE = process.env.TRON_SOLIDITY_NODE || 'https://api.trongrid.io';
const TRON_EVENT_SERVER  = process.env.TRON_EVENT_SERVER  || 'https://api.trongrid.io';
const TRON_API_KEY       = process.env.TRON_API_KEY       || '';

// Adresse du contrat USDT sur TRON Mainnet
export const USDT_TRC20_CONTRACT = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';

/**
 * Crée une instance TronWeb avec ou sans clé privée.
 * @param {string|null} privateKey - Si null, instance en lecture seule.
 */
export function getTronWeb(privateKey = null) {
  return new TronWeb(
    TRON_FULL_NODE,
    TRON_SOLIDITY_NODE,
    TRON_EVENT_SERVER,
    privateKey || '0000000000000000000000000000000000000000000000000000000000000001', // lecture seule
    TRON_API_KEY ? { headers: { 'TRON-PRO-API-KEY': TRON_API_KEY } } : {}
  );
}

// Instance partagée en lecture seule
const tronWeb = getTronWeb();

/**
 * Créer un nouveau wallet TRON utilisateur.
 * @returns {{ address: string, privateKey: string }}
 */
export function createTronWallet() {
  const account = tronWeb.utils.accounts.generateAccount();
  return {
    address: account.address.base58,
    privateKey: account.privateKey,
  };
}

/**
 * Valider une adresse TRON (Base58Check, commence par T).
 */
export function isValidTronAddress(address) {
  try {
    return tronWeb.isAddress(address);
  } catch {
    return false;
  }
}

/**
 * Lire le solde TRX d'une adresse (en TRX).
 */
export async function getTrxBalance(address) {
  const balanceSun = await tronWeb.trx.getBalance(address);
  return balanceSun / 1_000_000; // SUN → TRX
}

/**
 * Lire le solde USDT TRC20 d'une adresse.
 */
export async function getUsdtTrc20Balance(address) {
  const contract = await tronWeb.contract().at(USDT_TRC20_CONTRACT);
  const balance = await contract.balanceOf(address).call();
  return parseFloat(tronWeb.fromSun(balance.toString())) * 1_000_000 / 1_000_000;
  // USDT TRC20 a 6 décimales
}

/**
 * Envoyer du TRX d'un wallet vers une adresse.
 * @param {string} privateKey - Clé privée du wallet source
 * @param {string} toAddress  - Adresse destination Base58
 * @param {number} amountTrx  - Montant en TRX
 * @returns {string} txHash
 */
export async function sendTrx(privateKey, toAddress, amountTrx) {
  const tw = getTronWeb(privateKey);
  const amountSun = Math.floor(amountTrx * 1_000_000);
  const tx = await tw.trx.sendTransaction(toAddress, amountSun);
  if (!tx.result) throw new Error(`TRX send failed: ${JSON.stringify(tx)}`);
  return tx.txid;
}

/**
 * Envoyer des USDT TRC20 d'un wallet vers une adresse.
 * @param {string} privateKey  - Clé privée du wallet source
 * @param {string} toAddress   - Adresse destination Base58
 * @param {number} amountUsdt  - Montant en USDT
 * @returns {string} txHash
 */
export async function sendUsdtTrc20(privateKey, toAddress, amountUsdt) {
  const tw = getTronWeb(privateKey);
  const contract = await tw.contract().at(USDT_TRC20_CONTRACT);
  // USDT TRC20 = 6 décimales
  const amountRaw = Math.floor(amountUsdt * 1_000_000);
  const tx = await contract.transfer(toAddress, amountRaw).send({
    feeLimit: 40_000_000, // 40 TRX max pour les frais
    shouldPollResponse: false,
  });
  return tx;
}

/**
 * Vérifier le statut d'une transaction TRON.
 * @returns {{ confirmed: boolean, success: boolean, blockNumber: number|null }}
 */
export async function getTronTransactionStatus(txHash) {
  try {
    const info = await tronWeb.trx.getTransactionInfo(txHash);
    if (!info || !info.blockNumber) {
      return { confirmed: false, success: false, blockNumber: null };
    }
    return {
      confirmed: true,
      success: info.receipt?.result === 'SUCCESS',
      blockNumber: info.blockNumber,
    };
  } catch {
    return { confirmed: false, success: false, blockNumber: null };
  }
}

/**
 * Hot wallet TRON de la plateforme (pour funding TRX).
 * La clé privée est lue depuis les variables d'environnement.
 */
export const platformTronHotWalletAddress = process.env.PLATFORM_TRON_HOT_WALLET_ADDRESS || null;
export const platformTronHotWalletKey     = process.env.PLATFORM_TRON_HOT_WALLET_PRIVATE_KEY || null;
