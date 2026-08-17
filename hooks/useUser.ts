import api from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { getUserAnalyticsParams } from '@/lib/analytics';

export interface User {
  user_id: number;
  username?: string;
  name?: string;
  // backend может вернуть число или строку ("9000052.00") — приводим через Number() на месте
  tokens: number | string;
  balance?: number | string;
  // Реферальная экономика: всего заработано / всего выведено (для экрана выводов).
  total_rewards?: number | string;
  total_withdrawals?: number | string;
  source?: string;
  lang?: string;
  inviter?: number | null;
  premium?: boolean;
  premium_end?: number;
  tg_premium?: boolean;
  is_new?: boolean;
}

export const useUser = () => {
  return useQuery({
    queryKey: queryKeys.user,
    queryFn: async (): Promise<{ user: User }> => {
      // К каждому /user прикрепляем name, username, tg_premium, lang (аналитика)
      // и inviter — если приложение открыто по реферальной ссылке.
      const { data } = await api.get('/api/user', {
        params: getUserAnalyticsParams(),
      });
      return data;
    },
    staleTime: 30_000,
    // Баланс — самое заметное число в интерфейсе, и «0» из-за упавшего запроса
    // читается пользователем как «списали все токены». Поэтому:
    //  • несколько ретраев с backoff — переживаем обрыв сети и гонку с тихим
    //    входом (первый запрос может уйти раньше, чем появится токен);
    //  • обновление при возврате в приложение и при восстановлении сети —
    //    после пополнения или переавторизации цифра подтягивается сама.
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
};
