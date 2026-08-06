import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';

export interface ModelVersion {
  label: string;
  cost: number;
  default?: boolean;
  limit_media?: Record<string, number>;
}

export interface AIModel {
  tech_name: string;
  model_name: string;
  avatar?: string;
  input: string[];
  categories: string[];
  mainCategory?: string;
  versions: ModelVersion[];
}

const getModels = async (): Promise<AIModel[]> => {
  const { data } = await api.get('/api/models');
  const flatModels: AIModel[] = [];
  if (data.categories) {
    Object.entries(data.categories).forEach(([category, models]) => {
      (models as AIModel[]).forEach((model) => {
        if (!flatModels.find((m) => m.tech_name === model.tech_name)) {
          flatModels.push({ ...model, mainCategory: category });
        }
      });
    });
  }
  return flatModels;
};

export const useAIModels = () => {
  return useQuery({
    queryKey: queryKeys.models,
    queryFn: getModels,
    staleTime: 5 * 60_000,
  });
};

export interface ModelParamsResponse {
  params: any[];
  /** Сколько файлов какого типа принимает версия, напр. { image: 1, video: 1 }. */
  limit_media: Record<string, number>;
  cost?: number;
  version?: string;
}

export const useModelParams = (techName: string | null, version?: string) => {
  return useQuery({
    queryKey: queryKeys.params(techName!, version),
    queryFn: async (): Promise<ModelParamsResponse> => {
      const { data } = await api.get('/api/params', {
        params: { tech_name: techName, version },
      });
      return {
        params: data.params || [],
        limit_media: data.limit_media || {},
        cost: data.cost,
        version: data.version,
      };
    },
    enabled: !!techName,
  });
};
