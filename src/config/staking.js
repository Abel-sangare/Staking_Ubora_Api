// src/config/staking.js
// Plans de staking de la plateforme StakingUbora
// Synchronisé avec le smart contract StakingUbora.sol (BSC Mainnet)

export const STAKING_PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    plan_id_contract: 0,        // planId dans le smart contract
    min_amount: 1,              // USDT
    max_amount: 1000,
    daily_rate: 93,             // % par jour
    min_duration_days: 60,
    max_duration_days: 365,
    currency: 'USDT',
    networks: ['bsc', 'tron'],
    active: true,
  },
  {
    id: 'standard',
    name: 'Standard',
    plan_id_contract: 1,        // planId dans le smart contract
    min_amount: 1001,
    max_amount: null,           // illimité
    daily_rate: 98,             // % par jour
    min_duration_days: 60,
    max_duration_days: 365,
    currency: 'USDT',
    networks: ['bsc', 'tron'],
    active: true,
  },
];

/**
 * Récupérer un plan par son ID.
 */
export function getStakingPlan(planId) {
  return STAKING_PLANS.find(p => p.id === planId && p.active) || null;
}

/**
 * Calculer le rendement total d'un plan.
 * @param {string} planId   - 'starter' ou 'standard'
 * @param {number} amount   - montant en USDT
 * @param {number} days     - durée choisie (entre min et max du plan)
 * @returns {object}
 */
export function calculateStakingReturn(planId, amount, days) {
  const plan = getStakingPlan(planId);
  if (!plan) throw new Error(`Plan de staking "${planId}" introuvable.`);

  if (days < plan.min_duration_days || days > plan.max_duration_days) {
    throw new Error(`Durée invalide. Doit être entre ${plan.min_duration_days} et ${plan.max_duration_days} jours.`);
  }

  const totalInterest = amount * (plan.daily_rate / 100) * days;
  return {
    principal: amount,
    interest: parseFloat(totalInterest.toFixed(2)),
    total: parseFloat((amount + totalInterest).toFixed(2)),
    daily_rate: plan.daily_rate,
    duration_days: days,
  };
}

// ── Wallets ───────────────────────────────────────────────────────────────────

export const WALLETS = {
  bsc: {
    hot_wallet:       process.env.BSC_HOT_WALLET       || '0x98ac56c6689008952e5eDecaF883e954F10281d4',
    collector_wallet: process.env.BSC_COLLECTOR_WALLET || '0xE69F1391454353A8Ff915eB153Ba8d901cF0Afdf',
  },
  tron: {
    hot_wallet:       process.env.TRON_HOT_WALLET       || 'TQLLtrzXRgRZNjXPJWvzz4v2YvtroLzUiB',
    collector_wallet: process.env.TRON_COLLECTOR_WALLET || 'TKsnaJch4FNDwRfGzRtuzbgW4yo2YbxxZy',
  },
};

// ── Réseaux supportés ─────────────────────────────────────────────────────────

export const SUPPORTED_NETWORKS = {
  bsc: {
    name: 'BNB Smart Chain',
    protocols: ['BEP20', 'BNB'],
    native_currency: 'BNB',
    chain_id: 56,
    rpc: process.env.BSC_RPC_URL,
    explorer: 'https://bscscan.com',
    usdt_contract: '0x55d398326f99059fF775485246999027B3197955',
  },
  tron: {
    name: 'TRON',
    protocols: ['TRC20'],
    native_currency: 'TRX',
    explorer: 'https://tronscan.org',
    usdt_contract: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t', // USDT TRC20
  },
};
