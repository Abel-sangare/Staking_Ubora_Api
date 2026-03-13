// src/services/blockchain/wallet.service.js
import { ethers } from 'ethers';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { providers } from './blockchain.service.js';

dotenv.config();

const ENCRYPTION_KEY = process.env.WALLET_SECRET; // 32 bytes en hex
const IV_LENGTH = 16;

/**
 * Chiffrement d'une clé privée
 */
export function encryptPrivateKey(privateKey) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  let encrypted = cipher.update(privateKey, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

/**
 * Déchiffrement d'une clé privée
 */
export function decryptPrivateKey(encrypted) {
  const [ivHex, encryptedData] = encrypted.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

/**
 * Créer un hot wallet à partir d'une clé privée chiffrée
 * @param {string} encryptedKey - clé privée chiffrée
 * @param {string} chain - 'ethereum' ou 'bsc'
 */
export function getHotWallet(encryptedKey, chain = 'ethereum') {
  const privateKey = decryptPrivateKey(encryptedKey);

  if (!providers[chain]) throw new Error(`Provider inconnu pour la chaîne ${chain}`);

  return new ethers.Wallet(privateKey, providers[chain]);
}

/**
 * Vérifier que le wallet a assez de fonds pour un retrait
 * @param {ethers.Wallet} wallet
 * @param {number|string} amount en Ether
 */
export async function hasSufficientBalance(wallet, amount) {
  const balance = await wallet.getBalance(); // en wei
  return balance.gte(ethers.parseEther(amount.toString()));
}

/**
 * Créer un wallet utilisateur aléatoire (optionnel)
 * @param {string} chain - 'ethereum' ou 'bsc'
 */
export function createUserWallet(chain = 'ethereum') {
  if (!providers[chain]) throw new Error(`Provider inconnu pour la chaîne ${chain}`);
  const wallet = ethers.Wallet.createRandom().connect(providers[chain]);
  return {
    address: wallet.address,
    privateKey: wallet.privateKey,
    wallet,
  };
}

/**
 * Cold wallet : clé jamais exposée au serveur
 * On stocke seulement l’adresse pour monitoring et retrait manuel
 */
export function getColdWalletAddress() {
  return process.env.COLD_WALLET_ADDRESS;
}