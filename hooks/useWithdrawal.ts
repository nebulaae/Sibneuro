'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';

/**
 * Вывод средств. Все роуты под /api (bot_id и user_id подставляет интерсептор
 * lib/api.ts из localStorage — поэтому здесь их не передаём явно).
 *
 * Эндпоинты:
 *   GET  /api/withdrawal/min-amount        → { success, min_withdraw_amount }
 *   POST /api/withdrawal   body{amount,..} → { success, id, status, amount, balance, ... }
 *   GET  /api/withdrawal?status=...        → { success, items: [...] }
 *   POST /api/withdrawal/cancel?id=...     → { success, id, status, balance }
 */

export type WithdrawalStatus = 'pending' | 'canceled' | 'completed' | 'declined';
export type WithdrawalType = 'rub' | 'crypto';

export interface WithdrawalTypeOption {
  type: WithdrawalType;
  fee_percent: number;
}

export interface WithdrawalMinAmountData {
  min_withdraw_amount: number;
  withdrawal_types: WithdrawalTypeOption[];
}

export interface Withdrawal {
  id: number;
  bot_id: number;
  user_id: number;
  amount: number;
  amount_without_fee: number;
  fee: number;
  type: WithdrawalType;
  status: WithdrawalStatus;
  requisites: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateWithdrawalPayload {
  amount: number;
  type: WithdrawalType;
  requisites?: string;
  notes?: string;
}

export interface CreateWithdrawalResponse {
  success: boolean;
  id: number;
  status: WithdrawalStatus;
  type: WithdrawalType;
  amount: number;
  amount_without_fee: number;
  fee: number;
  requisites: string | null;
  notes: string | null;
  balance: number;
  error?: string;
}

// GET /api/withdrawal/min-amount
export const useWithdrawalMinAmount = () => {
  return useQuery({
    queryKey: queryKeys.withdrawalMinAmount,
    queryFn: async () => {
      const { data } = await api.get('/api/withdrawal/min-amount');
      if (!data.success) throw new Error(data.error || 'Failed to load min amount');
      return {
        min_withdraw_amount: data.min_withdraw_amount as number,
        withdrawal_types: (data.withdrawal_types || []) as WithdrawalTypeOption[],
      } as WithdrawalMinAmountData;
    },
    staleTime: 5 * 60_000,
  });
};

// GET /api/withdrawal?status=pending,completed
export const useWithdrawals = (status?: WithdrawalStatus | WithdrawalStatus[]) => {
  const statusParam = Array.isArray(status) ? status.join(',') : status;
  return useQuery({
    queryKey: queryKeys.withdrawals(statusParam),
    queryFn: async () => {
      const { data } = await api.get('/api/withdrawal', {
        params: statusParam ? { status: statusParam } : {},
      });
      if (!data.success) throw new Error(data.error || 'Failed to load withdrawals');
      return (data.items || []) as Withdrawal[];
    },
  });
};

// POST /api/withdrawal
export const useCreateWithdrawal = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateWithdrawalPayload) => {
      const { data } = await api.post<CreateWithdrawalResponse>(
        '/api/withdrawal',
        payload
      );
      // Бекенд отдаёт 200 c { success:false, error } для бизнес-ошибок
      // (недостаточно средств / меньше минимума) — пробрасываем как ошибку.
      if (!data.success) {
        const err = new Error(data.error || 'Withdrawal failed') as Error & {
          apiError?: string;
        };
        err.apiError = data.error;
        throw err;
      }
      return data;
    },
    onSuccess: () => {
      // Баланс изменился — обновляем профиль и список выводов.
      queryClient.invalidateQueries({ queryKey: queryKeys.user });
      queryClient.invalidateQueries({ queryKey: ['withdrawal', 'list'] });
    },
  });
};

// POST /api/withdrawal/cancel?id=...
export const useCancelWithdrawal = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.post('/api/withdrawal/cancel', null, {
        params: { id },
      });
      if (!data.success) {
        const err = new Error(data.error || 'Cancel failed') as Error & {
          apiError?: string;
        };
        err.apiError = data.error;
        throw err;
      }
      return data as {
        success: true;
        id: number;
        status: WithdrawalStatus;
        balance: number;
      };
    },
    onSuccess: () => {
      // Сумма вернулась в баланс — обновляем профиль и список.
      queryClient.invalidateQueries({ queryKey: queryKeys.user });
      queryClient.invalidateQueries({ queryKey: ['withdrawal', 'list'] });
    },
  });
};
