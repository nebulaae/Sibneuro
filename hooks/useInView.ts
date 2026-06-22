'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Сообщает, находится ли элемент в зоне видимости.
 *
 * Нужен, чтобы в ленте трендов проигрывался ТОЛЬКО видимый ролик, а остальные
 * стояли на паузе — иначе десятки одновременно играющих видео жрут CPU/сеть и
 * лента лагает. amount управляет порогом «достаточно видно».
 */
export function useInView<T extends HTMLElement = HTMLDivElement>(
  amount = 0.6
): [React.RefObject<T | null>, boolean] {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold: amount }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [amount]);

  return [ref, inView];
}
