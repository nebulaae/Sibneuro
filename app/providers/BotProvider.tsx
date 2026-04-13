'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import axios from 'axios';

/* ── Types ── */
export interface BotInfo {
  bot_id: number;
  bot_username: string; // без @
  max_username?: string; // без @, если есть
}

interface BotContextValue {
  bot: BotInfo | null;
  isLoading: boolean;
}

/* ── Storage keys ── */
const STORAGE_KEY = 'bot_info';

/* ── Context ── */
const BotContext = createContext<BotContextValue>({
  bot: null,
  isLoading: true,
});

export function useBot(): BotContextValue {
  return useContext(BotContext);
}

/* ── Helpers ── */
function loadFromStorage(): BotInfo | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as BotInfo;
  } catch {
    return null;
  }
}

function saveToStorage(info: BotInfo) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(info));
  } catch {}
}

async function fetchBotInfo(): Promise<BotInfo> {
  const baseURL = process.env.NEXT_PUBLIC_API_URL;
  const { data } = await axios.get(`${baseURL}/api/bot`);
  // Нормализуем: убираем @ из username если бекенд вернул с @
  return {
    bot_id: data.bot_id,
    bot_username: String(data.bot_username).replace(/^@/, ''),
    max_username: data.max_username
      ? String(data.max_username).replace(/^@/, '')
      : undefined,
  };
}

/* ── Provider ── */
export function BotProvider({ children }: { children: ReactNode }) {
  const [bot, setBot] = useState<BotInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      // 1. Сначала отдаём кэш из localStorage — UI не мигает
      const cached = loadFromStorage();
      if (cached && !cancelled) {
        setBot(cached);
        setIsLoading(false);
      }

      // 2. Всегда обновляем с сервера (свежие данные)
      try {
        const fresh = await fetchBotInfo();
        if (!cancelled) {
          saveToStorage(fresh);
          setBot(fresh);
        }
      } catch (err) {
        console.warn('[BotProvider] Failed to fetch /api/bot:', err);
        // Если кэша нет и запрос упал — isLoading = false, bot = null
        // Приложение продолжит работу с fallback-значениями
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <BotContext.Provider value={{ bot, isLoading }}>
      {children}
    </BotContext.Provider>
  );
}
