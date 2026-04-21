'use client';

import { Locale, useLocale } from 'next-intl';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { useTransition, useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export const LanguageSwitcher = () => {
  const locale = useLocale();
  const router = useRouter();

  const [currentLocale, setCurrentLocale] = useState<Locale>(locale as Locale);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setCurrentLocale(locale as Locale);
  }, [locale]);

  const handleLanguageChange = useCallback(
    (value: string) => {
      const nextLocale: 'en' | 'ru' = value as 'en' | 'ru';

      startTransition(() => {
        document.cookie = `locale=${nextLocale}; path=/; max-age=${
          60 * 60 * 24 * 365
        };`;

        setCurrentLocale(nextLocale);
        router.refresh();
      });
    },
    [startTransition, setCurrentLocale, router]
  );

  return (
    <Select value={currentLocale} onValueChange={handleLanguageChange}>
      {/* Красивый триггер */}
      <SelectTrigger
        disabled={isPending}
        className="bg-transparent hover:bg-muted/50 border border-border/60 text-textPrimary 
                   hover:border-border focus:ring-2 focus:ring-primary/30 
                   transition-all duration-200 w-fit h-9 px-3 rounded-xl shadow-sm"
      >
        <div className="flex items-center gap-2">
          <SelectValue />
        </div>
      </SelectTrigger>

      {/* Улучшенное выпадающее меню */}
      <SelectContent
        className="w-40 rounded-2xl border border-border/80 bg-popover shadow-xl 
                   backdrop-blur-xl p-1 animate-in fade-in-0 zoom-in-95"
        align="end"
      >
        <SelectItem
          value="en"
          className="flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer 
                     hover:bg-accent transition-colors text-base font-medium"
        >
          <span>Eng</span>
        </SelectItem>

        <SelectItem
          value="ru"
          className="flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer 
                     hover:bg-accent transition-colors text-base font-medium"
        >
          <span>Рус</span>
        </SelectItem>
      </SelectContent>
    </Select>
  );
};
