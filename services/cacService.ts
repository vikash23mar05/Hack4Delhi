/* Local Clean Air Credits service (client-only MVP but robust):
 - Stores balance, monthly redeemed, transactions and awarded action ids in localStorage
 - 1 CAC = ₹1 notional credit (government-issued digital voucher)
 - All rewards anchor to real Delhi government departments
 - Prevents duplicate awards when caller provides an action id
*/

const BALANCE_KEY     = 'cac_balance';
const MONTHLY_KEY     = 'cac_monthly_redeemed';
const TX_KEY          = 'cac_transactions';
const AWARDED_ACTIONS_KEY = 'cac_awarded_actions';

// Legacy constant kept for backward-compat (electricity redemption)
export const CAC_PER_KWH   = 15;
export const MONTHLY_CAP_CAC = 300; // ₹300 equivalent per month, abuse-safe

// ─── Reward Catalog ────────────────────────────────────────────────────────

export type RewardCategory = 'transit' | 'health' | 'green' | 'civic';

export interface Reward {
  id: string;
  title: string;
  subtitle: string;          // one-liner: what you actually get
  detail: string;            // how to redeem / which dept manages it
  cacCost: number;           // CAC required
  rupeeEquivalent: number;   // ₹ value (1 CAC = ₹1)
  category: RewardCategory;
  icon: string;              // Material Symbols icon name
  dept: string;              // implementing department
  practical: string;         // short note on how this is implementable today
  monthlyLimit: number;      // max redemptions per month (anti-abuse)
}

export const REWARDS_CATALOG: Reward[] = [
  // ── TRANSIT ──────────────────────────────────────────────────────────────
  {
    id: 'dtc_trip',
    title: 'DTC Bus Trip',
    subtitle: '1 single-journey bus credit on any DTC route',
    detail: 'Credit issued as a QR code to your registered mobile number, scannable at DTC e-ticketing gates.',
    cacCost: 15,
    rupeeEquivalent: 15,
    category: 'transit',
    icon: 'directions_bus',
    dept: 'Delhi Transport Corporation (DTC)',
    practical: 'DTC e-ticketing API (DIMTS) already supports QR-based credits. Integration is a single API call.',
    monthlyLimit: 8,
  },
  {
    id: 'metro_token',
    title: 'Delhi Metro Ride',
    subtitle: '1 single-journey Metro credit (any line)',
    detail: 'Digital QR token sent to your DMRC app or mobile. Valid for 24 hours from issue.',
    cacCost: 30,
    rupeeEquivalent: 30,
    category: 'transit',
    icon: 'subway',
    dept: 'Delhi Metro Rail Corporation (DMRC)',
    practical: 'DMRC QR ticketing is live since 2022. DMRC already has a corporate bulk-QR purchase API used by employers.',
    monthlyLimit: 6,
  },

  // ── HEALTH ───────────────────────────────────────────────────────────────
  {
    id: 'masks_pack',
    title: 'N95 Mask Pack (×5)',
    subtitle: '5 N95 / FFP2-grade masks from nearest DPCC centre',
    detail: 'Collect from any of 34 DPCC distribution centres across Delhi by showing your CAC QR code.',
    cacCost: 20,
    rupeeEquivalent: 20,
    category: 'health',
    icon: 'masks',
    dept: 'Delhi Pollution Control Committee (DPCC)',
    practical: 'DPCC already runs free-mask drives during Diwali & crop-burning season. CAC adds a verifiable distribution layer.',
    monthlyLimit: 2,
  },
  {
    id: 'opd_priority',
    title: 'Priority OPD Token',
    subtitle: 'Skip-the-queue OPD slot at any Delhi Govt hospital',
    detail: 'A digital priority token valid at all GNCT hospitals (GTB, Safdarjung, DDU, etc.) — same-day booking.',
    cacCost: 50,
    rupeeEquivalent: 50,
    category: 'health',
    icon: 'local_hospital',
    dept: 'GNCT Health Dept / Delhi Health Services',
    practical: 'Delhi govt hospitals use a central token system (e-Hospital NIC). Priority slots are an unused feature of the existing platform.',
    monthlyLimit: 2,
  },

  // ── GREEN ────────────────────────────────────────────────────────────────
  {
    id: 'sapling',
    title: 'Plant a Sapling',
    subtitle: '1 native sapling planted in your ward by Forest Dept',
    detail: 'A geo-tagged sapling is planted on your behalf; you receive a digital certificate with GPS coordinates.',
    cacCost: 50,
    rupeeEquivalent: 50,
    category: 'green',
    icon: 'park',
    dept: 'Delhi Forest & Wildlife Dept',
    practical: 'Delhi Forest Dept has 30+ government nurseries. GNCT already runs the "Harit Delhi" tree plantation portal. This adds a citizen-linked sponsorship layer.',
    monthlyLimit: 3,
  },
  {
    id: 'solar_subsidy',
    title: 'PM Surya Ghar Contribution',
    subtitle: '₹100 credited toward rooftop solar installation cost',
    detail: 'Credit applied directly to your PM Surya Ghar (rooftop solar) subsidy account. Stackable up to ₹1,000/year.',
    cacCost: 100,
    rupeeEquivalent: 100,
    category: 'green',
    icon: 'solar_power',
    dept: 'MNRE / DISCOM (BSES / Tata Power Delhi)',
    practical: 'PM Surya Ghar Muft Bijli Yojana has a live national portal (pmsuryagarh.gov.in). State-level top-up credits are a proposed extension in the scheme guidelines.',
    monthlyLimit: 2,
  },

  // ── CIVIC ────────────────────────────────────────────────────────────────
  {
    id: 'property_tax',
    title: 'MCD Property Tax Rebate',
    subtitle: '₹100 credit off your annual MCD property tax bill',
    detail: 'Credited to your MCD Property Tax account on the MCD online portal. Valid for the current financial year. Max ₹500/year.',
    cacCost: 100,
    rupeeEquivalent: 100,
    category: 'civic',
    icon: 'home',
    dept: 'Municipal Corporation of Delhi (MCD)',
    practical: 'MCD property tax is fully online (mcdonlinepayment.com). A rebate credit field already exists in the payment schema — used for senior citizen & woman-owner discounts.',
    monthlyLimit: 1,
  },
  {
    id: 'cng_voucher',
    title: 'CNG Conversion Voucher',
    subtitle: '₹200 subsidy voucher toward CNG kit fitment',
    detail: 'One-time voucher (per vehicle). Redeemable at any Transport Dept-empanelled CNG retrofitting garage. Requires RC book.',
    cacCost: 200,
    rupeeEquivalent: 200,
    category: 'civic',
    icon: 'local_gas_station',
    dept: 'Delhi Transport Dept / IGL',
    practical: 'Delhi Transport Dept already disburses CNG conversion subsidies to auto and taxi owners. Digital vouchers via IGL\'s portal is a stated expansion goal.',
    monthlyLimit: 1,
  },
];

// ─── Internal helpers ───────────────────────────────────────────────────────

function nowMonthKey() {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

function getJSON<T>(key: string, fallback: T): T {
  try { return JSON.parse(localStorage.getItem(key) ?? 'null') ?? fallback; } catch(e) { return fallback; }
}

function setJSON(key: string, v: any) { localStorage.setItem(key, JSON.stringify(v)); }

// ─── Balance ────────────────────────────────────────────────────────────────

export function getBalance(): number {
  const raw = localStorage.getItem(BALANCE_KEY);
  if (raw === null) { setBalance(0); return 0; }
  return Number(raw ?? 0);
}

export function setBalance(n: number) {
  const v = Math.max(0, Math.floor(Number(n) || 0));
  localStorage.setItem(BALANCE_KEY, String(v));
  try { window.dispatchEvent(new StorageEvent('storage', { key: BALANCE_KEY, newValue: String(v) })); } catch(e) {}
  return v;
}

// ─── Transactions ───────────────────────────────────────────────────────────

export type Transaction = {
  id: string;
  type: 'award' | 'redeem';
  amount: number;
  note?: string;
  rewardId?: string;
  timestamp: string;
}

export function getTransactions(): Transaction[] {
  return getJSON<Transaction[]>(TX_KEY, []);
}

function pushTransaction(tx: Transaction) {
  const txs = getTransactions();
  txs.unshift(tx);
  setJSON(TX_KEY, txs);
}

// ─── Monthly tracking ───────────────────────────────────────────────────────

export function getMonthlyRedeemed(): number {
  const store = getJSON<Record<string, number>>(MONTHLY_KEY, {});
  return Number(store[nowMonthKey()] ?? 0);
}

function addMonthlyRedeemed(n: number) {
  const store = getJSON<Record<string, number>>(MONTHLY_KEY, {});
  const key = nowMonthKey();
  store[key] = (Number(store[key] ?? 0) + n);
  setJSON(MONTHLY_KEY, store);
  try { window.dispatchEvent(new StorageEvent('storage', { key: MONTHLY_KEY, newValue: JSON.stringify(store[key]) })); } catch(e) {}
}

// Per-reward monthly redemption tracking
const REWARD_MONTHLY_KEY = 'cac_reward_monthly';

export function getRewardMonthlyCount(rewardId: string): number {
  const store = getJSON<Record<string, Record<string, number>>>(REWARD_MONTHLY_KEY, {});
  const mk = nowMonthKey();
  return Number(store[mk]?.[rewardId] ?? 0);
}

function incrementRewardMonthlyCount(rewardId: string) {
  const store = getJSON<Record<string, Record<string, number>>>(REWARD_MONTHLY_KEY, {});
  const mk = nowMonthKey();
  if (!store[mk]) store[mk] = {};
  store[mk][rewardId] = (store[mk][rewardId] ?? 0) + 1;
  setJSON(REWARD_MONTHLY_KEY, store);
}

// ─── Legacy kWh redemption (backward compat) ────────────────────────────────

export function canRedeemKwh(kwh = 1): boolean {
  const needed = kwh * CAC_PER_KWH;
  return getBalance() >= needed && (getMonthlyRedeemed() + needed) <= MONTHLY_CAP_CAC;
}

export function redeemForKwh(kwh = 1) {
  const needed = kwh * CAC_PER_KWH;
  if (!canRedeemKwh(kwh)) return { ok: false, error: 'insufficient balance or monthly cap reached' };
  setBalance(getBalance() - needed);
  addMonthlyRedeemed(needed);
  const tx: Transaction = { id: `redeem_${Date.now()}`, type: 'redeem', amount: needed, note: `${needed} CAC → ${kwh} kWh`, timestamp: new Date().toISOString() };
  pushTransaction(tx);
  return { ok: true, cacSpent: needed };
}

// ─── Rewards Marketplace redemption ─────────────────────────────────────────

export function canRedeemReward(rewardId: string): { ok: boolean; error?: string } {
  const reward = REWARDS_CATALOG.find(r => r.id === rewardId);
  if (!reward) return { ok: false, error: 'Unknown reward' };
  if (getBalance() < reward.cacCost) return { ok: false, error: `Need ${reward.cacCost} CAC (you have ${getBalance()})` };
  if ((getMonthlyRedeemed() + reward.cacCost) > MONTHLY_CAP_CAC) return { ok: false, error: 'Monthly redemption cap reached (₹300/month)' };
  if (getRewardMonthlyCount(rewardId) >= reward.monthlyLimit) return { ok: false, error: `Monthly limit (${reward.monthlyLimit}×/month) reached for this reward` };
  return { ok: true };
}

export function redeemForReward(rewardId: string): { ok: boolean; error?: string; cacSpent?: number; voucherCode?: string } {
  const check = canRedeemReward(rewardId);
  if (!check.ok) return check;

  const reward = REWARDS_CATALOG.find(r => r.id === rewardId)!;
  setBalance(getBalance() - reward.cacCost);
  addMonthlyRedeemed(reward.cacCost);
  incrementRewardMonthlyCount(rewardId);

  // Generate a simple voucher code (in production: from govt backend)
  const voucherCode = `CAC-${reward.id.toUpperCase().slice(0,4)}-${Date.now().toString(36).toUpperCase()}`;

  const tx: Transaction = {
    id: `redeem_${Date.now()}`,
    type: 'redeem',
    amount: reward.cacCost,
    note: `${reward.title} — ${reward.dept}`,
    rewardId,
    timestamp: new Date().toISOString(),
  };
  pushTransaction(tx);
  return { ok: true, cacSpent: reward.cacCost, voucherCode };
}

// ─── Award CAC ──────────────────────────────────────────────────────────────

export function awardCAC(amount: number, opts?: { id?: string; note?: string }) {
  if (!amount || amount <= 0) return { ok: false, error: 'invalid amount' };
  const actions = getJSON<Record<string, boolean>>(AWARDED_ACTIONS_KEY, {});
  if (opts?.id) {
    if (actions[opts.id]) return { ok: false, error: 'already awarded' };
    actions[opts.id] = true;
    setJSON(AWARDED_ACTIONS_KEY, actions);
  }
  const b = setBalance(getBalance() + amount);
  const tx: Transaction = { id: `award_${Date.now()}`, type: 'award', amount, note: opts?.note, timestamp: new Date().toISOString() };
  pushTransaction(tx);
  return { ok: true, newBalance: b };
}

export function hasAwardedAction(id: string) {
  const actions = getJSON<Record<string, boolean>>(AWARDED_ACTIONS_KEY, {});
  return Boolean(actions[id]);
}

// ─── Migration ──────────────────────────────────────────────────────────────

function runMigrations() {
  try {
    const raw = localStorage.getItem(BALANCE_KEY);
    if (raw !== null && Number(raw) === 5) {
      const txs = getTransactions();
      const actions = getJSON<Record<string, boolean>>(AWARDED_ACTIONS_KEY, {});
      if ((txs?.length ?? 0) === 0 && Object.keys(actions ?? {}).length === 0) {
        setBalance(0);
      }
    }
  } catch (e) {}
}

runMigrations();

export default { getBalance, setBalance, awardCAC, getMonthlyRedeemed, canRedeemKwh, redeemForKwh, redeemForReward, canRedeemReward, getTransactions, hasAwardedAction, getRewardMonthlyCount };
