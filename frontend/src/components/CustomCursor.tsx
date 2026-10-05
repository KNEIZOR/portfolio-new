import { useEffect } from 'react';

export default function CustomCursor() {
  useEffect(() => {
    if (window.matchMedia('(pointer: coarse)').matches || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const cursor = document.querySelector<HTMLElement>('.custom-cursor');
    if (!cursor) return;
    let x = 0;
    let y = 0;
    let frame = 0;
    const move = (event: PointerEvent) => {
      x = event.clientX; y = event.clientY;
      if (!frame) frame = requestAnimationFrame(() => {
        cursor.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0) translate(-50%,-50%)';
        frame = 0;
      });
      const target = (event.target as HTMLElement | null)?.closest<HTMLElement>('[data-cursor]');
      cursor.classList.toggle('is-active', Boolean(target));
      cursor.dataset.label = target?.dataset.cursor ?? '';
    };
    window.addEventListener('pointermove', move, { passive: true });
    return () => { window.removeEventListener('pointermove', move); cancelAnimationFrame(frame); };
  }, []);
  return <div className="custom-cursor" aria-hidden="true" />;
}
