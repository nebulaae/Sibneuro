'use client';

import { AlertTriangle, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';

export const ErrorComponent = ({
  title,
  description,
  icon: Icon = AlertTriangle,
  onRetry,
}: {
  title: string;
  description: string;
  icon?: React.ElementType;
  onRetry?: () => void;
}) => {
  return (
    <Empty className="max-w-md mx-auto bg-destructive/10 border-destructive/20 border rounded-xl p-6">
      <EmptyHeader>
        <EmptyMedia
          variant="icon"
          className="bg-destructive/20 p-3 rounded-full mb-4"
        >
          <Icon className="size-8 text-destructive" />
        </EmptyMedia>
        <EmptyTitle className="text-lg font-semibold text-foreground">
          {title}
        </EmptyTitle>
        <EmptyDescription className="text-sm text-muted-foreground mt-2">
          {description}
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent className="mt-6">
        {onRetry && (
          <Button
            variant="outline"
            onClick={onRetry}
            className="border-destructive/30 hover:bg-destructive/20"
          >
            Попробовать снова
          </Button>
        )}
      </EmptyContent>
    </Empty>
  );
};

export const NetworkError = ({ onRetry }: { onRetry?: () => void }) => (
  <ErrorComponent
    title="Ошибка соединения"
    description="Не удалось загрузить данные. Проверьте интернет-соединение."
    icon={WifiOff}
    onRetry={onRetry}
  />
);
