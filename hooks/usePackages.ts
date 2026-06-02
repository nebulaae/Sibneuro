import api from '@/lib/api';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';

export interface PlanDescription {
  en?: string;
  ru?: string;
}

export interface Plan {
  name: string;
  default?: boolean;
  duration: number; // Duration of subscription in seconds
  requests: number; // Number of requests/tokens
  amount?: number | null; // RUB price
  amount_xtr?: number | null; // Stars price
  amount_usdt?: number | null; // USDT price
  description?: PlanDescription;
}

export interface Package {
  icon: string;
  text: string;
  view?: 'popular' | 'profitable' | null;
  plans: Plan[];
}

export interface PackagesResponse {
  pay_id: string;
  email_required: boolean;
  webhook_url: string;
  promo_check_url?: string | null;
  promo?: any;
  packages: Package[] | null;
}

export interface CreatePaymentPayload {
  pay_id: string;
  method: 'rub' | 'xtr' | 'usdt';
  package_index: number;
  plan_index: number;
  lang: string;
  email?: string | null;
}

export interface CreatePaymentResponse {
  link: string;
}

// GET /api/packages
export const usePackages = () => {
  return useQuery<PackagesResponse>({
    queryKey: queryKeys.packages,
    queryFn: async (): Promise<PackagesResponse> => {
      const token =
        typeof window !== 'undefined'
          ? localStorage.getItem('auth_token')
          : null;

      const { data } = await api.get('/api/packages', {
        params: { auth_token: token },
      });

      return data;
    },
    staleTime: 30_000,
  });
};

// POST webhook_url
export const useCreatePaymentSession = () => {
  return useMutation<
    CreatePaymentResponse,
    Error,
    { webhookUrl: string; payload: CreatePaymentPayload }
  >({
    mutationFn: async ({ webhookUrl, payload }) => {
      // webhookUrl is an absolute URL, so it bypasses axios baseURL prefixing
      const { data } = await api.post(webhookUrl, payload);
      return data as CreatePaymentResponse;
    },
  });
};
