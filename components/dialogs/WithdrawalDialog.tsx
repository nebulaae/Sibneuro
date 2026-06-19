'use client';

import { useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Loader2,
  ArrowUpRight,
  Coins,
  TrendingUp,
  Wallet,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useHaptic } from '@/hooks/useHaptic';
import { useUser } from '@/hooks/useUser';
import {
  useWithdrawalMinAmount,
  useWithdrawals,
  useCreateWithdrawal,
  useCancelWithdrawal,
  type WithdrawalStatus,
} from '@/hooks/useWithdrawal';

const STATUS_META: Record<
  WithdrawalStatus,
  { label: string; cls: string }
> = {
  pending: { label: 'В обработке', cls: 'bg-amber-400/15 text-amber-300 border-amber-400/25' },
  completed: { label: 'Выполнен', cls: 'bg-emerald-400/15 text-emerald-300 border-emerald-400/25' },
  canceled: { label: 'Отменён', cls: 'bg-white/10 text-white/50 border-white/15' },
  declined: { label: 'Отклонён', cls: 'bg-red-400/15 text-red-300 border-red-400/25' },
};

export function WithdrawalDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const haptic = useHaptic();
  const { data: userData } = useUser();
  const { data: minAmount } = useWithdrawalMinAmount();
  const { data: withdrawals, isLoading: listLoading } = useWithdrawals();
  const createWithdrawal = useCreateWithdrawal();
  const cancelWithdrawal = useCancelWithdrawal();

  const balance = Number(userData?.user?.balance ?? 0);
  const totalRewards = Number(userData?.user?.total_rewards ?? 0);
  const totalWithdrawals = Number(userData?.user?.total_withdrawals ?? 0);
  const min = minAmount ?? 0;

  const [amount, setAmount] = useState('');
  const [requisites, setRequisites] = useState('');
  const [notes, setNotes] = useState('');

  const numAmount = Number(amount) || 0;
  const canSubmit =
    numAmount >= min && numAmount <= balance && !createWithdrawal.isPending;

  const sorted = useMemo(
    () =>
      [...(withdrawals || [])].sort(
        (a, b) => (b.id ?? 0) - (a.id ?? 0)
      ),
    [withdrawals]
  );

  const submit = () => {
    if (!canSubmit) {
      if (numAmount < min) toast.error(`Минимальная сумма вывода — ${min} ₽`);
      else if (numAmount > balance) toast.error('Недостаточно средств');
      return;
    }
    haptic.medium();
    createWithdrawal.mutate(
      {
        amount: numAmount,
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

  const cancel = (id: number) => {
    haptic.light();
    cancelWithdrawal.mutate(id, {
      onSuccess: () => {
        haptic.success();
        toast.success('Вывод отменён, средства возвращены');
      },
      onError: (e: any) =>
        toast.error(e?.apiError || e?.message || 'Не удалось отменить'),
    });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-zinc-950/95 border-white/10 text-white max-w-md p-6 rounded-[32px] backdrop-blur-2xl shadow-2xl max-h-[88vh] overflow-y-auto">
        <DialogHeader className="mb-1">
          <DialogTitle className="text-[20px] font-black tracking-tight text-white flex items-center gap-2">
            <Wallet size={20} className="text-cyan-300" />
            Вывод средств
          </DialogTitle>
          <DialogDescription className="text-white/40 text-[13px] font-medium">
            Минимальная сумма вывода — {min} ₽
          </DialogDescription>
        </DialogHeader>

        {/* Сводка: баланс / заработано / выведено */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <Stat icon={Coins} label="Баланс" value={balance} accent />
          <Stat icon={TrendingUp} label="Заработано" value={totalRewards} />
          <Stat icon={ArrowUpRight} label="Выведено" value={totalWithdrawals} />
        </div>

        {/* Форма */}
        <div className="flex flex-col gap-2.5 mb-5">
          <input
            type="number"
            inputMode="numeric"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={`Сумма, ₽ (от ${min})`}
            className="w-full h-12 px-4 rounded-2xl bg-zinc-900/60 border border-white/10 text-[15px] text-white placeholder:text-white/25 outline-none focus:border-cyan-400/50 transition-colors"
          />
          <input
            value={requisites}
            onChange={(e) => setRequisites(e.target.value)}
            placeholder="Реквизиты (карта / счёт)"
            className="w-full h-12 px-4 rounded-2xl bg-zinc-900/60 border border-white/10 text-[15px] text-white placeholder:text-white/25 outline-none focus:border-cyan-400/50 transition-colors"
          />
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Комментарий (необязательно)"
            className="w-full h-12 px-4 rounded-2xl bg-zinc-900/60 border border-white/10 text-[15px] text-white placeholder:text-white/25 outline-none focus:border-cyan-400/50 transition-colors"
          />
          <button
            onClick={submit}
            disabled={!canSubmit}
            className={cn(
              'w-full h-13 py-3.5 rounded-2xl flex items-center justify-center gap-2 font-black text-[16px] transition-all active:scale-[0.98]',
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
        <p className="text-[12px] font-black uppercase tracking-widest text-white/30 mb-2.5">
          История выводов
        </p>
        {listLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="size-5 animate-spin text-white/40" />
          </div>
        ) : sorted.length === 0 ? (
          <p className="text-[13px] text-white/35 font-medium py-3 text-center">
            Пока нет заявок на вывод
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {sorted.map((w) => {
              const meta = STATUS_META[w.status];
              return (
                <div
                  key={w.id}
                  className="flex items-center gap-3 rounded-2xl bg-zinc-900/50 border border-white/8 p-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-black text-white">
                      {Number(w.amount).toLocaleString('ru-RU')} ₽
                    </p>
                    {w.requisites && (
                      <p className="text-[11px] text-white/35 font-medium truncate">
                        {w.requisites}
                      </p>
                    )}
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
                      onClick={() => cancel(w.id)}
                      disabled={cancelWithdrawal.isPending}
                      className="shrink-0 w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/50 active:scale-90 transition-all"
                      aria-label="Отменить"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: typeof Coins;
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        'rounded-2xl p-2.5 border flex flex-col gap-1',
        accent
          ? 'bg-cyan-400/10 border-cyan-400/25'
          : 'bg-white/5 border-white/10'
      )}
    >
      <Icon size={13} className={accent ? 'text-cyan-300' : 'text-white/40'} />
      <span className="text-[10px] font-bold uppercase tracking-wide text-white/35">
        {label}
      </span>
      <span className="text-[15px] font-black leading-none text-white">
        {value.toLocaleString('ru-RU')}
      </span>
    </div>
  );
}
