import React, { useEffect, useState } from 'react';
import cacService, {
  MONTHLY_CAP_CAC,
  REWARDS_CATALOG,
  Reward,
  RewardCategory,
} from '../services/cacService';

const CATEGORY_META: Record<RewardCategory, { label: string; icon: string; color: string }> = {
  transit: { label: 'Public Transit',  icon: 'directions_bus', color: 'text-blue-400'   },
  health:  { label: 'Health & Safety', icon: 'local_hospital',  color: 'text-red-400'    },
  green:   { label: 'Clean & Green',   icon: 'park',            color: 'text-green-400'  },
  civic:   { label: 'Civic Benefits',  icon: 'account_balance', color: 'text-yellow-400' },
};

const CATEGORY_BG: Record<RewardCategory, string> = {
  transit: 'from-blue-500/10 border-blue-500/20',
  health:  'from-red-500/10 border-red-500/20',
  green:   'from-green-500/10 border-green-500/20',
  civic:   'from-yellow-500/10 border-yellow-500/20',
};

interface VoucherModal { reward: Reward; code: string }

const CACPage: React.FC = () => {
  const [balance, setBalance]         = useState<number>(0);
  const [monthly, setMonthly]         = useState<number>(0);
  const [txs, setTxs]                 = useState<any[]>([]);
  const [toast, setToast]             = useState<string | null>(null);
  const [toastOk, setToastOk]         = useState(true);
  const [voucher, setVoucher]         = useState<VoucherModal | null>(null);
  const [activeCategory, setActive]   = useState<RewardCategory | 'all'>('all');
  const [detailReward, setDetail]     = useState<Reward | null>(null);

  const refresh = () => {
    setBalance(cacService.getBalance());
    setMonthly(cacService.getMonthlyRedeemed());
    setTxs(cacService.getTransactions());
  };

  useEffect(() => {
    refresh();
    const onStorage = (e: StorageEvent) => {
      if (['cac_balance','cac_monthly_redeemed','cac_transactions'].includes(e.key ?? '')) refresh();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  function showToast(msg: string, ok = true) {
    setToastOk(ok);
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  }

  const handleRedeem = (reward: Reward) => {
    const check = cacService.canRedeemReward(reward.id);
    if (!check.ok) { showToast(check.error ?? 'Cannot redeem', false); return; }

    const res = cacService.redeemForReward(reward.id);
    if (res.ok) {
      refresh();
      setVoucher({ reward, code: res.voucherCode! });
    } else {
      showToast(res.error ?? 'Redemption failed', false);
    }
  };

  const filtered = activeCategory === 'all'
    ? REWARDS_CATALOG
    : REWARDS_CATALOG.filter(r => r.category === activeCategory);

  const monthlyLeft = MONTHLY_CAP_CAC - monthly;

  return (
    <div className="flex-1 bg-gradient-to-b from-background-dark via-[#0a1210] to-background-dark min-h-screen p-6 lg:p-10">
      <div className="max-w-6xl mx-auto space-y-10 animate-in fade-in duration-500">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-l-4 border-green-500 pl-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-green-400 mb-1">Ward-Wise Delhi Platform</p>
            <h1 className="text-4xl font-black tracking-tight uppercase">
              Clean Air Credits
            </h1>
            <p className="text-white/50 mt-2 max-w-lg text-sm leading-relaxed">
              Earn CAC by taking verified civic actions. Redeem for real benefits backed by Delhi government departments.
              <span className="text-green-400 font-bold"> 1 CAC = ₹1 government-issued notional credit.</span>
            </p>
          </div>
          <div className="flex gap-4 flex-wrap">
            {/* Balance card */}
            <div className="bg-green-500/10 border border-green-500/30 rounded-2xl px-8 py-5 text-center min-w-[130px]">
              <p className="text-xs font-bold uppercase tracking-widest text-green-400 mb-1">Balance</p>
              <p className="text-5xl font-black text-green-400">{balance}</p>
              <p className="text-xs text-white/40 mt-1 font-bold">CAC</p>
            </div>
            {/* Monthly cap */}
            <div className="bg-white/5 border border-white/10 rounded-2xl px-6 py-5 text-center min-w-[130px]">
              <p className="text-xs font-bold uppercase tracking-widest text-white/50 mb-1">Monthly Left</p>
              <p className="text-5xl font-black text-white">{monthlyLeft}</p>
              <p className="text-xs text-white/40 mt-1 font-bold">of {MONTHLY_CAP_CAC} CAC</p>
            </div>
          </div>
        </div>

        {/* How to Earn strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { action: 'Report pollution (photo + location)', cac: '+3 CAC', icon: 'photo_camera' },
            { action: 'Join a local clean-air mission',      cac: '+2 CAC', icon: 'group'        },
            { action: 'Verified school no-idling pledge',    cac: '+1 CAC', icon: 'school'       },
            { action: 'Ward tree plantation participation',  cac: '+5 CAC', icon: 'forest'       },
          ].map((e, i) => (
            <div key={i} className="bg-white/[0.03] border border-white/5 rounded-xl p-4 flex items-start gap-3">
              <span className="material-symbols-outlined text-green-400 text-xl mt-0.5">{e.icon}</span>
              <div>
                <p className="text-xs text-white/60 leading-snug">{e.action}</p>
                <p className="text-sm font-black text-green-400 mt-1">{e.cac}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Rewards Marketplace */}
        <div>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-black uppercase tracking-widest">Rewards Marketplace</h2>
              <p className="text-white/40 text-xs mt-1 font-bold uppercase tracking-wider">All rewards backed by active Delhi govt. departments</p>
            </div>
            {/* Category filter */}
            <div className="flex gap-2 flex-wrap">
              {(['all', ...Object.keys(CATEGORY_META)] as Array<RewardCategory | 'all'>).map(cat => (
                <button
                  key={cat}
                  onClick={() => setActive(cat)}
                  className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider transition-all border
                    ${activeCategory === cat
                      ? 'bg-green-500 text-black border-green-500'
                      : 'bg-white/5 text-white/50 border-white/10 hover:bg-white/10'
                    }`}
                >
                  {cat === 'all' ? 'All' : CATEGORY_META[cat as RewardCategory].label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-5">
            {filtered.map(reward => {
              const meta      = CATEGORY_META[reward.category];
              const bg        = CATEGORY_BG[reward.category];
              const monthUsed = cacService.getRewardMonthlyCount(reward.id);
              const atLimit   = monthUsed >= reward.monthlyLimit;
              const canAfford = balance >= reward.cacCost;
              const canAct    = canAfford && !atLimit && (monthly + reward.cacCost) <= MONTHLY_CAP_CAC;

              return (
                <div
                  key={reward.id}
                  className={`bg-gradient-to-br ${bg} to-transparent border rounded-2xl p-6 flex flex-col gap-4 transition-all hover:scale-[1.01] ${!canAct ? 'opacity-60' : ''}`}
                >
                  {/* Top row */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-4">
                      <div className={`size-12 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0`}>
                        <span className={`material-symbols-outlined text-2xl ${meta.color}`}>{reward.icon}</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className={`text-[10px] font-black uppercase tracking-widest ${meta.color}`}>{meta.label}</span>
                          <span className="text-[10px] text-white/30 font-bold">• {reward.dept}</span>
                        </div>
                        <h3 className="font-black text-lg leading-tight">{reward.title}</h3>
                        <p className="text-white/60 text-xs mt-1">{reward.subtitle}</p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-2xl font-black text-white">{reward.cacCost}</p>
                      <p className="text-[10px] font-bold text-white/40 uppercase">CAC</p>
                      <p className="text-[10px] text-white/30">≈ ₹{reward.rupeeEquivalent}</p>
                    </div>
                  </div>

                  {/* Monthly limit indicator */}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-white/5 rounded-full h-1 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${atLimit ? 'bg-red-500' : meta.color.replace('text-', 'bg-')}`}
                        style={{ width: `${Math.min((monthUsed / reward.monthlyLimit) * 100, 100)}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-white/30 font-bold whitespace-nowrap">
                      {monthUsed}/{reward.monthlyLimit} this month
                    </span>
                  </div>

                  {/* Bottom row */}
                  <div className="flex items-center gap-3 mt-auto pt-2 border-t border-white/5">
                    <button
                      onClick={() => setDetail(reward)}
                      className="text-xs text-white/40 hover:text-white transition-colors font-bold"
                    >
                      How it works ↗
                    </button>
                    <div className="flex-1" />
                    <button
                      disabled={!canAct}
                      onClick={() => handleRedeem(reward)}
                      className={`px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all
                        ${canAct
                          ? 'bg-green-500 text-black hover:bg-green-400 hover:scale-105 shadow-[0_0_20px_rgba(34,197,94,0.3)]'
                          : 'bg-white/5 text-white/20 cursor-not-allowed'
                        }`}
                    >
                      {atLimit ? 'Monthly limit reached' : !canAfford ? `Need ${reward.cacCost - balance} more CAC` : `Redeem ${reward.cacCost} CAC`}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Transaction History */}
        <div className="space-y-4">
          <h2 className="text-xl font-black uppercase tracking-widest">Transaction History</h2>
          <div className="bg-white/[0.02] border border-white/5 rounded-2xl overflow-hidden">
            {txs.length === 0 ? (
              <div className="p-8 text-center text-sm text-white/30">
                No transactions yet. Report pollution or join a mission to earn your first CAC.
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {txs.slice(0, 30).map(tx => (
                  <div key={tx.id} className="flex justify-between items-center px-6 py-4 hover:bg-white/5 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className={`size-8 rounded-full flex items-center justify-center ${tx.type === 'award' ? 'bg-green-500/10' : 'bg-blue-500/10'}`}>
                        <span className={`material-symbols-outlined text-sm ${tx.type === 'award' ? 'text-green-400' : 'text-blue-400'}`}>
                          {tx.type === 'award' ? 'add_circle' : 'redeem'}
                        </span>
                      </div>
                      <div>
                        <p className="font-bold text-sm">{tx.note || (tx.type === 'award' ? 'CAC Earned' : 'CAC Redeemed')}</p>
                        <p className="text-[11px] text-white/40 mt-0.5">{new Date(tx.timestamp).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                    </div>
                    <span className={`font-black font-mono ${tx.type === 'award' ? 'text-green-400' : 'text-white/50'}`}>
                      {tx.type === 'award' ? '+' : '−'}{tx.amount} CAC
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 px-8 py-4 rounded-full shadow-2xl text-sm font-bold z-[9999] flex items-center gap-3 transition-all
          ${toastOk ? 'bg-green-500 text-black' : 'bg-red-500/90 text-white'}`}>
          <span className="material-symbols-outlined text-sm">{toastOk ? 'check_circle' : 'error'}</span>
          {toast}
        </div>
      )}

      {/* Detail Modal */}
      {detailReward && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[9998] flex items-center justify-center p-6" onClick={() => setDetail(null)}>
          <div className="bg-[#0d131f] border border-white/10 rounded-3xl p-8 max-w-lg w-full space-y-5 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div>
                <span className={`text-xs font-black uppercase tracking-widest ${CATEGORY_META[detailReward.category].color}`}>
                  {CATEGORY_META[detailReward.category].label}
                </span>
                <h3 className="text-2xl font-black mt-1">{detailReward.title}</h3>
              </div>
              <button onClick={() => setDetail(null)} className="text-white/30 hover:text-white transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="space-y-4 text-sm text-white/60">
              <div className="bg-white/5 rounded-xl p-4">
                <p className="text-xs font-bold uppercase tracking-widest text-white/40 mb-2">What you get</p>
                <p className="text-white">{detailReward.subtitle}</p>
              </div>
              <div className="bg-white/5 rounded-xl p-4">
                <p className="text-xs font-bold uppercase tracking-widest text-white/40 mb-2">How to redeem</p>
                <p>{detailReward.detail}</p>
              </div>
              <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-4">
                <p className="text-xs font-bold uppercase tracking-widest text-green-400 mb-2">Why this is implementable</p>
                <p className="text-white/70">{detailReward.practical}</p>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-white/5">
                <div>
                  <p className="text-xs text-white/30 font-bold uppercase">Implementing dept.</p>
                  <p className="text-white font-bold text-sm mt-0.5">{detailReward.dept}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-white/30 font-bold uppercase">Monthly limit</p>
                  <p className="text-white font-bold text-sm mt-0.5">{detailReward.monthlyLimit}× per citizen</p>
                </div>
              </div>
            </div>
            <button
              onClick={() => { handleRedeem(detailReward); setDetail(null); }}
              disabled={!cacService.canRedeemReward(detailReward.id).ok}
              className="w-full py-4 bg-green-500 text-black font-black uppercase tracking-widest rounded-xl hover:bg-green-400 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Redeem {detailReward.cacCost} CAC — ₹{detailReward.rupeeEquivalent} value
            </button>
          </div>
        </div>
      )}

      {/* Voucher Modal */}
      {voucher && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[9999] flex items-center justify-center p-6">
          <div className="bg-[#0d131f] border border-green-500/30 rounded-3xl p-10 max-w-md w-full text-center space-y-6 shadow-2xl">
            <div className="size-20 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center mx-auto">
              <span className="material-symbols-outlined text-4xl text-green-400">confirmation_number</span>
            </div>
            <div>
              <h3 className="text-2xl font-black text-green-400 uppercase">{voucher.reward.title}</h3>
              <p className="text-white/60 text-sm mt-2">{voucher.reward.subtitle}</p>
            </div>
            <div className="bg-black/40 border border-white/10 rounded-2xl p-6">
              <p className="text-xs font-bold uppercase tracking-widest text-white/40 mb-3">Your Voucher Code</p>
              <p className="text-3xl font-black font-mono text-green-400 tracking-widest">{voucher.code}</p>
            </div>
            <div className="bg-white/5 rounded-xl p-4 text-left text-xs text-white/50 space-y-1">
              <p className="font-bold text-white/70">Next steps:</p>
              <p>{voucher.reward.detail}</p>
              <p className="text-white/30 mt-2">Dept: {voucher.reward.dept}</p>
            </div>
            <p className="text-xs text-white/30">
              {voucher.reward.cacCost} CAC deducted • Valid 30 days from issue
            </p>
            <button
              onClick={() => { setVoucher(null); refresh(); }}
              className="w-full py-3 bg-green-500 text-black font-black uppercase tracking-widest rounded-xl hover:bg-green-400 transition-all"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CACPage;
