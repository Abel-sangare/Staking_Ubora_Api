import { ethers } from 'ethers';
import dotenv from 'dotenv';
import * as tronService from './tron.service.js';

dotenv.config();

/**
 * Fournisseurs RPC pour Ethereum et Binance Smart Chain
 */
export const providers = {
  ethereum: new ethers.JsonRpcProvider(process.env.ETH_RPC_URL),
  bsc: new ethers.JsonRpcProvider(process.env.BSC_RPC_URL)
};

// --- Portefeuille chaud de la plateforme pour les retraits ---
let platformHotWallet = null;
if (process.env.PLATFORM_HOT_WALLET_PRIVATE_KEY && providers.bsc) {
  platformHotWallet = new ethers.Wallet(process.env.PLATFORM_HOT_WALLET_PRIVATE_KEY, providers.bsc);
  console.log('Adresse du portefeuille chaud de la plateforme chargée:', platformHotWallet.address);
  // AVERTISSEMENT DE SÉCURITÉ : Pour la production, la clé privée doit être gérée de manière
  // extrêmement sécurisée (ex: KMS, HSM, etc.) et non directement via une variable d'environnement non chiffrée.
} else {
  console.warn('PLATFORM_HOT_WALLET_PRIVATE_KEY non défini ou fournisseur BSC non disponible. Les retraits directs depuis la plateforme ne fonctionneront pas.');
}
export { platformHotWallet };

/**
 * Vérifier une adresse (Ethereum/BSC ou TRON)
 */
export function isValidAddress(address, network = 'bsc') {
  if (network.toLowerCase() === 'tron' || network.toLowerCase() === 'trc20') {
    return tronService.isValidTronAddress(address);
  }
  return ethers.isAddress(address);
}

/**
 * Lire le solde d'une adresse
 */
export async function getBalance(chain, address) {
  if (chain.toLowerCase() === 'tron' || chain.toLowerCase() === 'trc20') {
    return await tronService.getTrxBalance(address);
  }
  if (!isValidAddress(address)) throw new Error('Adresse invalide');
  return await providers[chain].getBalance(address);
}

/**
 * Envoyer une transaction (HOT WALLET)
 */
export async function sendTransaction(chain, fromWallet, toAddress, amount) {
  if (!isValidAddress(toAddress, chain)) throw new Error('Adresse destinataire invalide');

  // Calcul gas fees
  const gasPrice = await providers[chain].getFeeData();
  const tx = await fromWallet.sendTransaction({
    to: toAddress,
    value: ethers.parseEther(amount.toString()),
    gasPrice: gasPrice.maxFeePerGas
  });

  return tx.hash;
}

/**
 * Envoie un retrait depuis le portefeuille chaud de la plateforme.
 * @param {string} toAddress - Adresse de destination.
 * @param {number} amount - Montant à envoyer (en ether/BNB pour BNB natif, ou en unité du token pour ERC-20/BEP-20).
 * @param {string} currency - Devise (ex: 'BNB', 'USDT').
 * @param {string} network - Réseau (ex: 'bsc', 'tron', 'trc20').
 * @returns {Promise<string>} Le hash de la transaction.
 */
export async function sendPlatformWithdrawal(toAddress, amount, currency, network) {
  const net = network.toLowerCase();

  // ─── GESTION TRON (TRC20) ───────────────────────────────────────────────────
  if (net === 'tron' || net === 'trc20') {
    if (!tronService.platformTronHotWalletKey) {
      throw new Error('Le portefeuille chaud TRON de la plateforme n\'est pas configuré.');
    }
    if (!tronService.isValidTronAddress(toAddress)) {
      throw new Error('Adresse TRON invalide pour le retrait.');
    }

    if (currency.toUpperCase() === 'TRX') {
      return await tronService.sendTrx(tronService.platformTronHotWalletKey, toAddress, amount);
    } else if (currency.toUpperCase() === 'USDT') {
      return await tronService.sendUsdtTrc20(tronService.platformTronHotWalletKey, toAddress, amount);
    } else {
      throw new Error(`La devise ${currency} n'est pas supportée sur TRON via la plateforme.`);
    }
  }

  // ─── GESTION BSC (BEP20) ────────────────────────────────────────────────────
  if (net === 'bsc' || net === 'bep20') {
    if (!platformHotWallet) {
      throw new Error('Le portefeuille chaud BSC de la plateforme n\'est pas configuré.');
    }
    if (!ethers.isAddress(toAddress)) {
      throw new Error('Adresse BSC/EVM invalide pour le retrait.');
    }

    try {
      const provider = providers.bsc;
      const gasPrice = await provider.getFeeData();

      let tx;
      if (currency.toUpperCase() === 'BNB') {
        // Retrait de BNB natif
        tx = await platformHotWallet.sendTransaction({
          to: toAddress,
          value: ethers.parseEther(amount.toString()),
          gasPrice: gasPrice.maxFeePerGas,
        });
      } else if (currency.toUpperCase() === 'USDT') {
        // Retrait de USDT (BEP-20)
        const USDT_CONTRACT_ADDRESS = '0x55d398326f99059ff775485246999027b3197955';
        const USDT_ABI = ["function transfer(address to, uint256 amount) returns (bool)"];
        const usdtContract = new ethers.Contract(USDT_CONTRACT_ADDRESS, USDT_ABI, platformHotWallet);
        
        const amountInUnits = ethers.parseUnits(amount.toString(), 18);
        tx = await usdtContract.transfer(toAddress, amountInUnits);
      } else {
        throw new Error(`La devise ${currency} n'est pas supportée sur BSC via la plateforme.`);
      }

      return tx.hash;
    } catch (error) {
      console.error('Erreur lors de l\'envoi du retrait BSC:', error);
      throw new Error(`Échec de l'envoi du retrait BSC: ${error.message}`);
    }
  }

  throw new Error(`Le réseau ${network} n'est pas supporté pour les retraits directs.`);
}

/**
 * Confirmer un dépôt sur la blockchain (exemple simplifié)
 * txHash : hash de la transaction
 * confirmations : nombre de confirmations attendues
 */
export async function confirmDeposit(chain, txHash, confirmations = 1) {
  const provider = providers[chain];
  const receipt = await provider.waitForTransaction(txHash, confirmations);
  return receipt.status === 1; // true si la tx est confirmée avec succès
}