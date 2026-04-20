"use client";

import { GlobeIcon } from "@radix-ui/react-icons";
import { Locale, useLocale } from "next-intl";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  useTransition,
  useState,
  useCallback,
  useEffect,
} from "react";
import { useRouter } from "next/navigation";

export const LanguageSwitcher = () => {
  const locale = useLocale();
  const router = useRouter();

  const [currentLocale, setCurrentLocale] = useState<Locale>(locale as Locale);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setCurrentLocale(locale as Locale);
  }, [locale]);

  const handleLanguageChange = useCallback((value: string) => {
    const nextLocale: "en" | "ru" = value as "en" | "ru";

    startTransition(() => {
      // Update the cookie that your server-side getRequestConfig reads
      document.cookie = `locale=${nextLocale}; path=/; max-age=${
        60 * 60 * 24 * 365
      };`; // 1 year

      // Update UI instantly
      setCurrentLocale(nextLocale);

      // Refresh server components with new locale
      router.refresh();
    });
  }, [startTransition, setCurrentLocale, router]);

  return (
    <Select value={currentLocale} onValueChange={handleLanguageChange}>
      <SelectTrigger
        disabled={isPending}
        className="bg-transparent text-textPrimary hover:bg-transparent border-0 focus:ring-0 w-fit h-9 px-3"
      >
        <GlobeIcon className="size-4 mr-2" />
        <SelectValue />
      </SelectTrigger>

      <SelectContent>
        <SelectItem value="en">Eng</SelectItem>
        <SelectItem value="ru">Рус</SelectItem>
      </SelectContent>
    </Select>
  );
};