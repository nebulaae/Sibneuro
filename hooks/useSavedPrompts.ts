import { useState, useEffect, useCallback } from 'react';

export interface SavedPrompt {
  id: string;
  title: string;
  text: string;
  createdAt: number;
  updatedAt: number;
}

const STORAGE_KEY = 'saved_prompts_v1';

function loadPrompts(): SavedPrompt[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as SavedPrompt[];
  } catch {
    return [];
  }
}

function savePrompts(prompts: SavedPrompt[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prompts));
  } catch {}
}

export function useSavedPrompts() {
  const [prompts, setPrompts] = useState<SavedPrompt[]>([]);

  // Загружаем при маунте
  useEffect(() => {
    setPrompts(loadPrompts());
  }, []);

  const addPrompt = useCallback((title: string, text: string): SavedPrompt => {
    const now = Date.now();
    const newPrompt: SavedPrompt = {
      id: `prompt_${now}_${Math.random().toString(36).slice(2, 7)}`,
      title: title.trim(),
      text: text.trim(),
      createdAt: now,
      updatedAt: now,
    };
    setPrompts((prev) => {
      const next = [newPrompt, ...prev];
      savePrompts(next);
      return next;
    });
    return newPrompt;
  }, []);

  const updatePrompt = useCallback(
    (id: string, title: string, text: string) => {
      setPrompts((prev) => {
        const next = prev.map((p) =>
          p.id === id
            ? {
                ...p,
                title: title.trim(),
                text: text.trim(),
                updatedAt: Date.now(),
              }
            : p
        );
        savePrompts(next);
        return next;
      });
    },
    []
  );

  const deletePrompt = useCallback((id: string) => {
    setPrompts((prev) => {
      const next = prev.filter((p) => p.id !== id);
      savePrompts(next);
      return next;
    });
  }, []);

  return { prompts, addPrompt, updatePrompt, deletePrompt };
}

// ─── Draft сохранение текущего промпта в инпуте ──────────────────────────────

const DRAFT_KEY = (dialogueId: string | null | undefined) =>
  `chat_draft_${dialogueId ?? 'new'}`;

export function useDraftPrompt(dialogueId: string | null | undefined) {
  const key = DRAFT_KEY(dialogueId);

  const load = useCallback((): string => {
    try {
      return localStorage.getItem(key) ?? '';
    } catch {
      return '';
    }
  }, [key]);

  const save = useCallback(
    (text: string) => {
      try {
        if (text) {
          localStorage.setItem(key, text);
        } else {
          localStorage.removeItem(key);
        }
      } catch {}
    },
    [key]
  );

  const clear = useCallback(() => {
    try {
      localStorage.removeItem(key);
    } catch {}
  }, [key]);

  return { load, save, clear };
}
