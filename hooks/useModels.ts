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
  // Преобразуем объект категорий в плоский массив, как это было в state.js
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
  });
};
