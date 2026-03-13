import { ethers } from 'ethers';
import dotenv from 'dotenv';

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
 * Vérifier une adresse Ethereum/BSC
 */
export function isValidAddress(address) {
  return ethers.isAddress(address);
}

/**
 * Lire le solde d'une adresse
 */
export async function getBalance(chain, address) {
  if (!isValidAddress(address)) throw new Error('Adresse invalide');
  return await providers[chain].getBalance(address);
}

/**
 * Envoyer une transaction (HOT WALLET)
 */
export async function sendTransaction(chain, fromWallet, toAddress, amount) {
  if (!isValidAddress(toAddress)) throw new Error('Adresse destinataire invalide');

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
 * @param {string} network - Réseau (ex: 'bsc').
 * @returns {Promise<string>} Le hash de la transaction.
 */
export async function sendPlatformWithdrawal(toAddress, amount, currency, network) {
  if (!platformHotWallet) {
    throw new Error('Le portefeuille chaud de la plateforme n\'est pas configuré ou est invalide.');
  }
  if (!isValidAddress(toAddress)) {
    throw new Error('Adresse de destination invalide pour le retrait.');
  }
  if (network.toLowerCase() !== 'bsc') { // Pour l'instant, ne supporte que BSC, rendu insensible à la casse
    throw new Error('Seul le réseau BSC est supporté pour les retraits directs de la plateforme.');
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
      // TODO: Charger l'ABI du contrat USDT et l'adresse du contrat dynamiquement si nécessaire
      const USDT_CONTRACT_ADDRESS = '0x55d398326f99059ff775485246999027b3197955'; // Adresse USDT BEP-20
      const USDT_ABI = ["function transfer(address to, uint256 amount) returns (bool)"];
      const usdtContract = new ethers.Contract(USDT_CONTRACT_ADDRESS, USDT_ABI, platformHotWallet);
      
      const amountInUnits = ethers.parseUnits(amount.toString(), 18); // USDT sur BSC (BEP-20) a 18 décimales
      tx = await usdtContract.transfer(toAddress, amountInUnits);
    } else {
      throw new Error(`La devise ${currency} n'est pas supportée pour les retraits directs de la plateforme.`);
    }

    return tx.hash;
  } catch (error) {
    console.error('Erreur lors de l\'envoi du retrait depuis le portefeuille de la plateforme:', error);
    throw new Error(`Échec de l'envoi du retrait depuis la plateforme: ${error.message}`);
  }
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