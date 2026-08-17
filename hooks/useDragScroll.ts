'use client';

import { useRef, useEffect } from 'react';

/**
 * Делает горизонтальный скролл-контейнер удобным на ПК (где нет тача):
 *  - вертикальное колесо мыши → горизонтальный скролл;
 *  - перетаскивание мышью (drag-to-scroll) с инерцией, как на тач-экране;
 *  - гасит клик, если это был драг (чтобы не открыть карточку случайно).
 *
 * На тач-устройствах не вмешивается — там работает нативный скролл.
 */
export function useDragScroll<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const scrollable = () => el.scrollWidth > el.clientWidth;

    // scroll-snap притягивает контейнер к ближайшей карточке на каждом кадре,
    // из-за чего мышиная протяжка шла рывками, а инерция гасла сразу. На время
    // жеста снимаем притяжение и возвращаем, когда движение остановилось.
    const setSnap = (enabled: boolean) => {
      el.style.scrollSnapType = enabled ? '' : 'none';
    };

    let inertia = 0;
    // Страховка: если кадры не идут (вкладка в фоне, webview не композитит),
    // requestAnimationFrame не вызовется и снап останется выключенным навсегда.
    let snapGuard: ReturnType<typeof setTimeout> | null = null;

    const stopInertia = () => {
      if (inertia) cancelAnimationFrame(inertia);
      inertia = 0;
      if (snapGuard) clearTimeout(snapGuard);
      snapGuard = null;
    };

    const onWheel = (e: WheelEvent) => {
      if (!scrollable()) return;
      // Берём ось с бОльшим смещением: вертикальное колесо мыши (deltaY)
      // или горизонтальный трекпад (deltaX).
      const raw = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
      if (raw === 0) return;
      // Нормализуем единицы в пиксели. Вебвью (в т.ч. Telegram Desktop) часто
      // шлёт deltaMode=LINE с крошечным deltaY (±1..3) — без пересчёта скролл
      // сдвигался на 1px за щелчок и выглядел «застывшим».
      let delta = raw;
      if (e.deltaMode === 1)
        delta *= 16; // DOM_DELTA_LINE → ~строка
      else if (e.deltaMode === 2) delta *= el.clientWidth; // DOM_DELTA_PAGE
      e.preventDefault();
      stopInertia();
      el.scrollLeft += delta;
    };

    let isDown = false;
    let pointerId = -1;
    let startX = 0;
    let startScroll = 0;
    let moved = false;
    // Скорость последнего движения (px/мс) — из неё раскручивается инерция.
    let velocity = 0;
    let lastX = 0;
    let lastT = 0;

    const onPointerDown = (e: PointerEvent) => {
      // Тач оставляем нативному скроллу; тянем только мышью/пером.
      if (e.pointerType === 'touch' || !scrollable()) return;
      stopInertia();
      isDown = true;
      moved = false;
      velocity = 0;
      pointerId = e.pointerId;
      startX = e.clientX;
      lastX = e.clientX;
      lastT = e.timeStamp;
      startScroll = el.scrollLeft;
      // Захватываем указатель на контейнер: дальнейшие move/up прилетают сюда,
      // даже если жест начался на кнопке-карточке. Без этого драг рвался.
      try {
        el.setPointerCapture(e.pointerId);
      } catch {}
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDown || e.pointerId !== pointerId) return;

      const dx = e.clientX - startX;
      if (Math.abs(dx) > 3 && !moved) {
        moved = true;
        setSnap(false);
      }
      if (moved) e.preventDefault(); // гасим выделение/нативный драг во время тяги

      const dt = e.timeStamp - lastT;
      if (dt > 0) {
        // Сглаживаем: одиночный «рваный» кадр не должен задавать всю инерцию.
        const instant = (e.clientX - lastX) / dt;
        velocity = velocity * 0.7 + instant * 0.3;
        lastX = e.clientX;
        lastT = e.timeStamp;
      }

      el.scrollLeft = startScroll - dx;
    };

    // Докрутка по инерции: скорость затухает экспоненциально, снап
    // возвращается, только когда движение практически остановилось.
    const runInertia = () => {
      let v = velocity;
      const step = () => {
        v *= 0.94;
        el.scrollLeft -= v * 16; // ~16мс на кадр
        const atEdge =
          el.scrollLeft <= 0 || el.scrollLeft >= el.scrollWidth - el.clientWidth;
        if (Math.abs(v) < 0.02 || atEdge) {
          stopInertia();
          setSnap(true);
          return;
        }
        inertia = requestAnimationFrame(step);
      };
      inertia = requestAnimationFrame(step);
      snapGuard = setTimeout(() => {
        stopInertia();
        setSnap(true);
      }, 2000);
    };

    const endDrag = (e: PointerEvent) => {
      if (e.pointerId !== pointerId) return;
      isDown = false;
      pointerId = -1;
      try {
        el.releasePointerCapture(e.pointerId);
      } catch {}

      if (moved && Math.abs(velocity) > 0.05) runInertia();
      else setSnap(true);
    };

    // Если это был драг — не даём клику открыть карточку под курсором.
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
      stopInertia();
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
