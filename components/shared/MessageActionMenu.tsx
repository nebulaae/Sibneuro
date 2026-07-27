'use client';

/**
 * MessageActionMenu — нативное (Telegram-подобное) контекстное меню для сообщений.
 *
 * Заменяет shadcn/radix ContextMenu на кастомное меню с упором на UX:
 * — открывается по долгому нажатию (touch) или правому клику (desktop);
 * — скролл отменяет long-press, поэтому лента остаётся отзывчивой;
 * — выделение текста в сообщениях отключено (как в Telegram), чтобы
 *   удержание не запускало системное выделение/копирование;
 * — меню появляется рядом с точкой нажатия, с затемнением фона и haptic.
 *
 * Экшены передаются списком — например «Копировать» и «Переслать».
 */

import {
  ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useHaptic } from '@/hooks/useHaptic';

export interface MessageAction {
  key: string;
  label: string;
  icon: ReactNode;
  onSelect: () => void;
  danger?: boolean;
}

interface Point {
  x: number;
  y: number;
}

const LONG_PRESS_MS = 420;
const MOVE_TOLERANCE = 10;
const MENU_WIDTH = 208;

export function MessageActionMenu({
  actions,
  children,
  className,
}: {
  actions: MessageAction[];
  children: ReactNode;
  className?: string;
}) {
  const haptic = useHaptic();
  const [origin, setOrigin] = useState<Point | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startPoint = useRef<Point | null>(null);
  const suppressClick = useRef(false);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const openAt = useCallback(
    (x: number, y: number) => {
      haptic.medium();
      setOrigin({ x, y });
    },
    [haptic]
  );

  const onTouchStart = (e: React.TouchEvent) => {
    if (!actions.length) return;
    const touch = e.touches[0];
    startPoint.current = { x: touch.clientX, y: touch.clientY };
    clearTimer();
    timerRef.current = setTimeout(() => {
      suppressClick.current = true;
      openAt(startPoint.current!.x, startPoint.current!.y);
    }, LONG_PRESS_MS);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (!startPoint.current) return;
    const touch = e.touches[0];
    const dx = Math.abs(touch.clientX - startPoint.current.x);
    const dy = Math.abs(touch.clientY - startPoint.current.y);
    if (dx > MOVE_TOLERANCE || dy > MOVE_TOLERANCE) clearTimer();
  };

  const onTouchEnd = () => {
    clearTimer();
    // Подавление клика сбрасывается в onClickCapture (когда синтетический
    // click после long-press действительно приходит). Этот таймер — лишь
    // страховка, если click вообще не наступит.
    if (suppressClick.current) {
      setTimeout(() => {
        suppressClick.current = false;
      }, 300);
    }
  };

  const onContextMenu = (e: React.MouseEvent) => {
    if (!actions.length) return;
    e.preventDefault();
    openAt(e.clientX, e.clientY);
  };

  const onClickCapture = (e: React.MouseEvent) => {
    if (suppressClick.current) {
      e.preventDefault();
      e.stopPropagation();
      suppressClick.current = false;
    }
  };

  useEffect(() => () => clearTimer(), [clearTimer]);

  const close = useCallback(() => setOrigin(null), []);

  return (
    <>
      <div
        className={cn('select-none', className)}
        style={{
          WebkitTouchCallout: 'none',
          WebkitUserSelect: 'none',
          userSelect: 'none',
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
        onContextMenu={onContextMenu}
        onClickCapture={onClickCapture}
      >
        {children}
      </div>

      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {origin && (
              <MenuOverlay
                origin={origin}
                actions={actions}
                onClose={close}
                onSelect={(a) => {
                  haptic.light();
                  // Выполняем синхронно — clipboard/openTelegramLink требуют
                  // «живого» пользовательского жеста (user activation).
                  a.onSelect();
                  close();
                }}
              />
            )}
          </AnimatePresence>,
          document.body
        )}
    </>
  );
}

function MenuOverlay({
  origin,
  actions,
  onClose,
  onSelect,
}: {
  origin: Point;
  actions: MessageAction[];
  onClose: () => void;
  onSelect: (a: MessageAction) => void;
}) {
  // Позиционируем меню, не давая ему вылезти за края экрана.
  const vw = typeof window !== 'undefined' ? window.innerWidth : 360;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 640;
  const estHeight = actions.length * 52 + 12;

  let left = origin.x;
  if (left + MENU_WIDTH > vw - 12) left = vw - MENU_WIDTH - 12;
  if (left < 12) left = 12;

  let top = origin.y + 8;
  const openUp = top + estHeight > vh - 12;
  if (openUp) top = Math.max(12, origin.y - estHeight - 8);

  return (
    <motion.div
      className="fixed inset-0 z-[200]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      onClick={onClose}
      onContextMenu={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
      <motion.div
        className="absolute w-52 overflow-hidden rounded-2xl border border-white/10 bg-neutral-900/95 shadow-[0_16px_48px_rgba(0,0,0,0.55)] backdrop-blur-2xl"
        style={{ left, top, transformOrigin: openUp ? 'bottom' : 'top' }}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ type: 'spring', stiffness: 520, damping: 32 }}
        onClick={(e) => e.stopPropagation()}
      >
        {actions.map((a, i) => (
          <button
            key={a.key}
            onClick={() => onSelect(a)}
            className={cn(
              'flex w-full items-center gap-3 px-4 py-3.5 text-[15px] font-medium transition-colors active:bg-white/10',
              i !== 0 && 'border-t border-white/5',
              a.danger ? 'text-red-400' : 'text-white/90'
            )}
          >
            <span
              className={cn(
                'flex items-center justify-center',
                a.danger ? 'text-red-400' : 'text-white/60'
              )}
            >
              {a.icon}
            </span>
            {a.label}
          </button>
        ))}
      </motion.div>
    </motion.div>
  );
}
