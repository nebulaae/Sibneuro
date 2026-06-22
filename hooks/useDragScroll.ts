'use client';

import { useRef, useEffect } from 'react';

/**
 * Делает горизонтальный скролл-контейнер удобным на ПК (где нет тача):
 *  - вертикальное колесо мыши → горизонтальный скролл;
 *  - перетаскивание мышью (drag-to-scroll), как на тач-экране;
 *  - гасит клик, если это был драг (чтобы не переключить вкладку случайно).
 *
 * На тач-устройствах не вмешивается — там работает нативный скролл.
 */
export function useDragScroll<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const scrollable = () => el.scrollWidth > el.clientWidth;

    const onWheel = (e: WheelEvent) => {
      if (e.deltaY === 0 || !scrollable()) return;
      // Колесо обычно даёт deltaY — превращаем его в горизонтальный сдвиг.
      e.preventDefault();
      el.scrollLeft += e.deltaY;
    };

    let isDown = false;
    let pointerId = -1;
    let startX = 0;
    let startScroll = 0;
    let moved = false;

    const onPointerDown = (e: PointerEvent) => {
      // Тач оставляем нативному скроллу; тянем только мышью/пером.
      if (e.pointerType === 'touch' || !scrollable()) return;
      isDown = true;
      moved = false;
      pointerId = e.pointerId;
      startX = e.clientX;
      startScroll = el.scrollLeft;
      // Захватываем указатель на контейнер: дальнейшие move/up прилетают сюда,
      // даже если жест начался на кнопке-табе. Без этого драг с кнопки рвался.
      try {
        el.setPointerCapture(e.pointerId);
      } catch {}
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDown || e.pointerId !== pointerId) return;
      const dx = e.clientX - startX;
      if (Math.abs(dx) > 3) moved = true;
      if (moved) e.preventDefault(); // гасим выделение/нативный драг во время тяги
      el.scrollLeft = startScroll - dx;
    };

    const endDrag = (e: PointerEvent) => {
      if (e.pointerId !== pointerId) return;
      isDown = false;
      pointerId = -1;
      try {
        el.releasePointerCapture(e.pointerId);
      } catch {}
    };

    // Если это был драг — не даём клику переключить активный таб.
    const onClickCapture = (e: MouseEvent) => {
      if (moved) {
        e.stopPropagation();
        e.preventDefault();
        moved = false;
      }
    };

    // Все pointer-события вешаем на сам контейнер — благодаря pointer capture
    // они доходят сюда независимо от того, на каком потомке начался жест.
    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('pointerdown', onPointerDown);
    el.addEventListener('pointermove', onPointerMove);
    el.addEventListener('pointerup', endDrag);
    el.addEventListener('pointercancel', endDrag);
    el.addEventListener('click', onClickCapture, true);

    return () => {
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('pointerdown', onPointerDown);
      el.removeEventListener('pointermove', onPointerMove);
      el.removeEventListener('pointerup', endDrag);
      el.removeEventListener('pointercancel', endDrag);
      el.removeEventListener('click', onClickCapture, true);
    };
  }, []);

  return ref;
}
