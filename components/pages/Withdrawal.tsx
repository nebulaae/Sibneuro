'use client';

import { useMemo, useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft,
  Wallet,
  TrendingUp,
  ArrowUpRight,
  Loader2,
  X,
  Banknote,
  Bitcoin,
  CreditCard,
  ChevronDown,
  Check,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn, formatBankRequisites } from '@/lib/utils';
import { useHaptic } from '@/hooks/useHaptic';
import { useUser } from '@/hooks/useUser';
import {
  useWithdrawalMinAmount,
  useWithdrawals,
  useCreateWithdrawal,
  useCancelWithdrawal,
  type WithdrawalStatus,
  type WithdrawalType,
  type WithdrawalTypeOption,
} from '@/hooks/useWithdrawal';

/* Fallback-типы: показываем селект даже если /withdrawal/min-amount
   не вернул withdrawal_types (404 / старый бэкенд). Комиссию считает бэкенд. */
const DEFAULT_WITHDRAWAL_TYPES: WithdrawalTypeOption[] = [
  { type: 'rub', fee_percent: 0 },
  { type: 'crypto', fee_percent: 0 },
];

/* ── Glass styles (sibneuro palette) ── */
const glass = cn(
  'bg-[#0A0A0A]/60 backdrop-blur-3xl border border-white/5',
  'shadow-[0_8px_32px_rgba(0,0,0,0.4)]'
);

const spring =
  'transition-all duration-[240ms] [transition-timing-function:cubic-bezier(0.32,0.72,0,1)]';

const STATUS_META: Record<WithdrawalStatus, { label: string; cls: string }> = {
  pending: { label: 'В обработке', cls: 'bg-amber-400/15 text-amber-300 border-amber-400/25' },
  completed: { label: 'Выполнен', cls: 'bg-emerald-400/15 text-emerald-300 border-emerald-400/25' },
  canceled: { label: 'Отменён', cls: 'bg-white/10 text-white/50 border-white/15' },
  declined: { label: 'Отклонён', cls: 'bg-red-400/15 text-red-300 border-red-400/25' },
};

/* ── Per-type field config: поля меняются в зависимости от типа вывода ── */
const TYPE_META: Record<
  WithdrawalType,
  {
    label: string;
    emoji: string;
    icon: typeof Banknote;
    reqLabel: string;
    reqPlaceholder: string;
    reqHint: string;
    numeric: boolean;
  }
> = {
  rub: {
    label: 'Рубли',
    emoji: '🏦',
    icon: Banknote,
    reqLabel: 'Номер карты',
    reqPlaceholder: '4444 5555 6666 7777',
    reqHint: 'Карта или счёт для вывода в рублях',
    numeric: true,
  },
  crypto: {
    label: 'Криптокошелёк',
    emoji: '₿',
    icon: Bitcoin,
    reqLabel: 'Адрес кошелька',
    reqPlaceholder: 'TXk… адрес USDT',
    reqHint: 'Сеть USDT TRC-20',
    numeric: false,
  },
};

function StatCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-2 p-4 rounded-[20px] border',
        accent
          ? 'bg-cyan-400/10 border-cyan-400/25'
          : 'bg-white/5 border-white/10'
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-widest text-white/35">
          {label}
        </span>
        <span className={accent ? 'text-cyan-300/70' : 'text-white/25'}>
          {icon}
        </span>
      </div>
      <span className="text-[22px] font-black tracking-tight text-white">
        {value}
      </span>
    </div>
  );
}

export const Withdrawal = () => {
  const router = useRouter();
  const haptic = useHaptic();

  const { data: userData } = useUser();
  const user = userData?.user;
  const balance = Number(user?.balance ?? 0);

  const { data: minData } = useWithdrawalMinAmount();
  const { data: items = [], isLoading } = useWithdrawals();
  const createWithdrawal = useCreateWithdrawal();
  const cancelWithdrawal = useCancelWithdrawal();

  const [amount, setAmount] = useState('');
  const [requisites, setRequisites] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedType, setSelectedType] = useState<WithdrawalType>('rub');

  const min = minData?.min_withdraw_amount ?? 0;
  const withdrawalTypes = minData?.withdrawal_types?.length
    ? minData.withdrawal_types
    : DEFAULT_WITHDRAWAL_TYPES;
  const numAmount = parseInt(amount, 10) || 0;

  const feePercent =
    withdrawalTypes.find((t) => t.type === selectedType)?.fee_percent ?? 0;
  const feeAmount = Math.round((numAmount * feePercent) / 100);
  const amountAfterFee = numAmount - feeAmount;

  const typeMeta = TYPE_META[selectedType];
  const TypeIcon = typeMeta.icon;

  // Кастомный дропдаун типа вывода.
  const [typeOpen, setTypeOpen] = useState(false);
  const typeRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!typeOpen) return;
    const onDown = (e: MouseEvent) => {
      if (typeRef.current && !typeRef.current.contains(e.target as Node)) {
        setTypeOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [typeOpen]);

  const error = useMemo(() => {
    if (!amount) return null;
    if (numAmount < min) return `Минимум для вывода — ${min} ₽`;
    if (numAmount > balance) return 'Недостаточно средств';
    return null;
  }, [amount, numAmount, min, balance]);

  const canSubmit = numAmount > 0 && !error && !createWithdrawal.isPending;

  const sorted = useMemo(
    () => [...(items || [])].sort((a, b) => (b.id ?? 0) - (a.id ?? 0)),
    [items]
  );

  const changeType = (type: WithdrawalType) => {
    setTypeOpen(false);
    if (type === selectedType) return;
    haptic.light();
    setSelectedType(type);
    // Реквизиты специфичны для типа вывода — очищаем при переключении.
    setRequisites('');
  };

  const handleSubmit = () => {
    if (!canSubmit) return;
    haptic.medium();
    createWithdrawal.mutate(
      {
        amount: numAmount,
        type: selectedType,
        requisites: requisites.trim() || undefined,
        notes: notes.trim() || undefined,
      },
      {
        onSuccess: () => {
          haptic.success();
          toast.success('Заявка на вывод создана');
          setAmount('');
          setRequisites('');
          setNotes('');
        },
        onError: (e: any) => {
          haptic.error();
          toast.error(e?.apiError || e?.message || 'Не удалось создать вывод');
        },
      }
    );
  };

  const handleCancel = (id: number) => {
    haptic.warning();
    cancelWithdrawal.mutate(id, {
      onSuccess: () => {
        haptic.success();
        toast.success('Вывод отменён, средства возвращены');
      },
      onError: (e: any) => {
        toast.error(e?.apiError || e?.message || 'Не удалось отменить');
      },
    });
  };

  return (
    <div className="flex flex-col min-h-svh bg-[#050505] text-white selection:bg-cyan-400/30 pb-28">
      {/* ── Header ── */}
      <header className="sticky top-0 z-50 flex items-center gap-3 px-5 py-4 bg-[#050505]/80 backdrop-blur-xl border-b border-white/5">
        <button
          onClick={() => {
            haptic.light();
            router.back();
          }}
          className={cn(
            'flex items-center justify-center w-10 h-10 rounded-xl bg-white/5 border border-white/10',
            spring,
            'active:scale-[0.92] hover:bg-white/10'
          )}
        >
          <ChevronLeft size={18} className="text-white/60" />
        </button>
        <h1 className="text-[18px] font-black tracking-tight text-white">
          Вывод средств
        </h1>
      </header>

      <div className="flex flex-col gap-6 px-4 py-6">
        {/* Балансы */}
        <div className="grid grid-cols-3 gap-3">
          <StatCard icon={<Wallet size={14} />} label="Баланс" value={balance} accent />
          <StatCard
            icon={<TrendingUp size={14} />}
            label="Заработано"
            value={Number(user?.total_rewards ?? 0)}
          />
          <StatCard
            icon={<ArrowUpRight size={14} />}
            label="Выведено"
            value={Number(user?.total_withdrawals ?? 0)}
          />
        </div>

        {/* Форма */}
        <div className={cn('flex flex-col gap-4 p-5 rounded-[24px]', glass)}>
          {/* ── Кастомный дропдаун типа вывода: выбираешь тип → поля меняются ── */}
          {withdrawalTypes.length > 0 && (
            <div className="flex flex-col gap-2">
              <label className="text-[12px] font-bold uppercase tracking-widest text-white/40">
                Способ вывода
              </label>
              <div className="relative" ref={typeRef}>
                <button
                  type="button"
                  onClick={() => {
                    haptic.light();
                    setTypeOpen((o) => !o);
                  }}
                  className={cn(
                    'w-full flex items-center gap-3 bg-black/30 border rounded-2xl px-3 py-3',
                    spring,
                    typeOpen ? 'border-cyan-400/50' : 'border-white/10'
                  )}
                >
                  <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-cyan-400/12 text-cyan-300">
                    <TypeIcon size={18} />
                  </span>
                  <span className="flex-1 text-left">
                    <span className="block text-[15px] font-black text-white leading-tight">
                      {typeMeta.label}
                    </span>
                    <span className="text-[11px] font-medium text-white/35">
                      {feePercent > 0
                        ? `комиссия ${feePercent}%`
                        : 'нажмите, чтобы выбрать'}
                    </span>
                  </span>
                  <ChevronDown
                    size={18}
                    className={cn(
                      'text-white/40 transition-transform duration-200',
                      typeOpen && 'rotate-180'
                    )}
                  />
                </button>

                {typeOpen && (
                  <div className="absolute z-20 mt-2 w-full rounded-2xl bg-[#0A0A0A]/95 backdrop-blur-2xl border border-white/10 p-1.5 shadow-[0_16px_48px_rgba(0,0,0,0.6)]">
                    {withdrawalTypes.map((opt) => {
                      const m = TYPE_META[opt.type];
                      const Icon = m.icon;
                      const active = opt.type === selectedType;
                      return (
                        <button
                          key={opt.type}
                          type="button"
                          onClick={() => changeType(opt.type)}
                          className={cn(
                            'w-full flex items-center gap-3 rounded-xl px-2.5 py-2.5 transition-colors',
                            active ? 'bg-cyan-400/12' : 'hover:bg-white/5'
                          )}
                        >
                          <span
                            className={cn(
                              'flex items-center justify-center w-9 h-9 rounded-lg',
                              active
                                ? 'bg-cyan-400/20 text-cyan-300'
                                : 'bg-white/5 text-white/50'
                            )}
                          >
                            <Icon size={16} />
                          </span>
                          <span className="flex-1 text-left">
                            <span
                              className={cn(
                                'block text-[14px] font-black leading-tight',
                                active ? 'text-white' : 'text-white/70'
                              )}
                            >
                              {m.label}
                            </span>
                            {opt.fee_percent > 0 && (
                              <span className="text-[11px] font-medium text-white/35">
                                комиссия {opt.fee_percent}%
                              </span>
                            )}
                          </span>
                          {active && <Check size={16} className="text-cyan-300" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Сумма */}
          <div className="flex flex-col gap-2">
            <label className="text-[12px] font-bold uppercase tracking-widest text-white/40">
              Сумма {min > 0 && <span className="text-white/25">(мин. {min})</span>}
            </label>
            <div className="relative">
              <input
                inputMode="numeric"
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ''))}
                placeholder="0"
                className="w-full bg-black/30 border border-white/10 rounded-2xl px-4 py-3.5 pr-10 text-[18px] font-black text-white placeholder:text-white/20 outline-none focus:border-cyan-400/50 transition-all"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[16px] font-black text-white/30">
                ₽
              </span>
            </div>
            {numAmount > 0 && feePercent > 0 && (
              <div className="flex items-center justify-between px-1 text-[12px] font-medium text-white/40">
                <span>Комиссия {feePercent}%</span>
                <span>
                  −{feeAmount.toLocaleString('ru-RU')} ₽ → получите{' '}
                  <span className="text-cyan-300 font-bold">
                    {amountAfterFee.toLocaleString('ru-RU')} ₽
                  </span>
                </span>
              </div>
            )}
          </div>

          {/* Реквизиты — динамически меняются под тип вывода */}
          <div className="flex flex-col gap-2">
            <label className="text-[12px] font-bold uppercase tracking-widest text-white/40">
              {typeMeta.reqLabel}
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30">
                {selectedType === 'rub' ? (
                  <CreditCard size={16} />
                ) : (
                  <Wallet size={16} />
                )}
              </span>
              <input
                inputMode={typeMeta.numeric ? 'numeric' : 'text'}
                value={requisites}
                onChange={(e) =>
                  setRequisites(
                    typeMeta.numeric
                      ? formatBankRequisites(e.target.value)
                      : e.target.value
                  )
                }
                placeholder={typeMeta.reqPlaceholder}
                className="w-full bg-black/30 border border-white/10 rounded-2xl pl-11 pr-4 py-3 text-[15px] font-medium text-white placeholder:text-white/20 outline-none focus:border-cyan-400/50 transition-all"
              />
            </div>
            <p className="text-[11px] font-medium text-white/25 px-1">
              {typeMeta.reqHint}
            </p>
          </div>

          {/* Комментарий */}
          <div className="flex flex-col gap-2">
            <label className="text-[12px] font-bold uppercase tracking-widest text-white/40">
              Комментарий
            </label>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="необязательно"
              className="w-full bg-black/30 border border-white/10 rounded-2xl px-4 py-3 text-[15px] font-medium text-white placeholder:text-white/20 outline-none focus:border-cyan-400/50 transition-all"
            />
          </div>

          {error && (
            <p className="text-[13px] font-bold text-red-400 px-1">{error}</p>
          )}

          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className={cn(
              'w-full h-14 rounded-2xl flex items-center justify-center gap-2 font-black text-[16px] active:scale-[0.98]',
              spring,
              canSubmit
                ? 'bg-cyan-400 text-black shadow-[0_0_24px_rgba(34,211,238,0.35)]'
                : 'bg-white/5 text-white/25'
            )}
          >
            {createWithdrawal.isPending ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <ArrowUpRight size={18} />
            )}
            Вывести {numAmount > 0 ? `${numAmount} ₽` : ''}
          </button>
        </div>

        {/* История */}
        <div className="flex flex-col gap-3">
          <h2 className="text-[13px] font-black uppercase tracking-widest text-white/30 px-2">
            История выводов
          </h2>

          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-20 rounded-[20px] bg-white/5 animate-pulse" />
            ))
          ) : sorted.length === 0 ? (
            <p className="text-[14px] text-white/30 px-2 py-6 text-center">
              Пока нет выводов
            </p>
          ) : (
            sorted.map((w) => {
              const meta = STATUS_META[w.status];
              return (
                <div
                  key={w.id}
                  className={cn('flex items-center gap-3 p-4 rounded-[20px]', glass)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[18px] font-black text-white">
                        {Number(w.amount).toLocaleString('ru-RU')} ₽
                      </span>
                      {w.amount_without_fee != null &&
                        w.amount_without_fee !== w.amount && (
                          <span className="text-[12px] text-white/30 font-medium line-through">
                            {Number(w.amount_without_fee).toLocaleString('ru-RU')}
                          </span>
                        )}
                    </div>
                    {(w.type || w.fee > 0) && (
                      <div className="flex items-center gap-2 mt-0.5">
                        {w.type && (
                          <span className="text-[10px] font-bold uppercase text-white/30">
                            {w.type === 'rub' ? '🏦 Рубли' : '₿ Крипто'}
                          </span>
                        )}
                        {w.fee > 0 && (
                          <span className="text-[10px] text-white/25">
                            комис. {Number(w.fee).toLocaleString('ru-RU')} ₽
                          </span>
                        )}
                      </div>
                    )}
                    {w.requisites && (
                      <p className="text-[12px] font-medium text-white/40 truncate mt-1">
                        {w.requisites}
                      </p>
                    )}
                    <p className="text-[11px] font-medium text-white/25 mt-0.5">
                      {new Date(w.created_at).toLocaleDateString('ru-RU', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>

                  <span
                    className={cn(
                      'shrink-0 px-2.5 py-1 rounded-full text-[11px] font-bold border',
                      meta?.cls
                    )}
                  >
                    {meta?.label ?? w.status}
                  </span>

                  {w.status === 'pending' && (
                    <button
                      onClick={() => handleCancel(w.id)}
                      disabled={cancelWithdrawal.isPending}
                      className="shrink-0 w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/50 active:scale-90 transition-all disabled:opacity-50"
                      aria-label="Отменить"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default Withdrawal;
