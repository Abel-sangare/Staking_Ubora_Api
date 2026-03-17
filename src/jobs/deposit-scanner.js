import cron from 'node-cron';
import { db } from '../config/database.js';
import * as tronService from '../services/blockchain/tron.service.js';
import { processIncomingDeposit } from '../modules/transactions/deposit.service.js';

/**
 * Scanner de secours pour TRON (TRC20)
 * Scanne les transactions récentes pour chaque utilisateur ayant une adresse TRON
 */
export async function scanTronDeposits() {
  console.log('[Scanner TRON] Démarrage du scan de secours...');
  
  try {
    // 1. Récupérer tous les utilisateurs avec une adresse TRON
    const [users] = await db.query('SELECT uuid, tron_wallet_address FROM users WHERE tron_wallet_address IS NOT NULL');
    
    for (const user of users) {
      try {
        // Note: Cette partie nécessite une API comme TronGrid ou un nœud complet.
        // Ici, on utilise le fournisseur configuré dans tronService.
        const tronWeb = tronService.getTronWeb();
        
        // Récupérer les transactions récentes de l'adresse
        // Attention: Selon le provider, cette méthode peut varier.
        const transactions = await tronWeb.trx.getTransactionsRelated(user.tron_wallet_address, 'to', 10);
        
        for (const tx of transactions) {
          if (tx.ret && tx.ret[0].contractRet === 'SUCCESS') {
            const data = tx.raw_data.contract[0].parameter.value;
            
            // Si c'est un transfert USDT TRC20 (Appel de contrat transfer)
            if (data.contract_address === tronService.USDT_TRC20_CONTRACT) {
              // Logique de décodage simplifiée (à affiner selon les logs réels de TronWeb)
              // amount = data.amount / 1_000_000
              // tx_hash = tx.txID
              
              /* 
              await processIncomingDeposit({
                toAddress: user.tron_wallet_address,
                amount: amount,
                currency: 'USDT',
                network: 'TRC20',
                tx_hash: tx.txID,
                method: 'tron_scanner_fallback'
              });
              */
            }
          }
        }
      } catch (err) {
        console.error(`[Scanner TRON] Erreur pour l'utilisateur ${user.uuid}:`, err.message);
      }
    }
  } catch (error) {
    console.error('[Scanner TRON] Erreur fatale:', error);
  }
}

// Planification toutes les 10 minutes
cron.schedule('*/10 * * * *', scanTronDeposits);
