'use client';

import Link from 'next/link';
import {
  BrainCircuit,
  MessageSquareOff,
  History,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';

export const EmptyComponent = ({
  title,
  description,
  icon: Icon,
  button,
  buttonLink,
}: {
  title: string;
  description: string;
  icon: React.ElementType;
  button?: string;
  buttonLink?: string;
}) => {
  return (
    <Empty className="flex flex-col items-center justify-center p-8 text-center">
      <EmptyHeader>
        <EmptyMedia variant="icon" className="mb-4">
          <Icon className="size-12 text-muted-foreground opacity-50" />
        </EmptyMedia>
        <EmptyTitle className="text-lg font-semibold">{title}</EmptyTitle>
        <EmptyDescription className="text-sm text-muted-foreground max-w-62.5 mt-2">
          {description}
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent className="mt-6">
        {button && buttonLink && (
          <Link href={buttonLink}>
            <Button>{button}</Button>
          </Link>
        )}
      </EmptyContent>
    </Empty>
  );
};

export const ModelsEmpty = () => (
  <EmptyComponent
    title="Нет моделей"
    description="В данной категории пока нет доступных ИИ-моделей."
    icon={BrainCircuit}
  />
);

export const ChatsEmpty = () => (
  <EmptyComponent
    title="Нет чатов"
    description="Начните новый диалог с любым AI-ассистентом."
    icon={MessageSquareOff}
    button="Создать чат"
    buttonLink="/models"
  />
);

export const GenerationsEmpty = () => (
  <EmptyComponent
    title="Нет генераций"
    description="Вы еще ничего не создавали. Выберите модель и начните творить!"
    icon={History}
    button="Начать генерацию"
    buttonLink="/generate"
  />
);
