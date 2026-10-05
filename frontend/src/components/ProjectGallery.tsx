import { useEffect, useRef, useState, type PointerEvent, type TouchEvent } from 'react';
import { useTranslation } from 'react-i18next';
import type { GalleryImage } from '../app/types';

export default function ProjectGallery({ images, title }: { images: GalleryImage[]; title: string }) {
  const { t } = useTranslation();
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const pointerStart = useRef<number | null>(null);
  const dragged = useRef(false);
  const count = images.length;

  const previous = () => setIndex((current) => (current - 1 + count) % count);
  const next = () => setIndex((current) => (current + 1) % count);

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
      if (event.key === 'ArrowLeft') previous();
      if (event.key === 'ArrowRight') next();
      if (event.key === 'Tab' && modalRef.current) {
        const elements = Array.from(modalRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'));
        const first = elements[0]; const last = elements[elements.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus();
    };
  }, [open, count]);

  const beginPointer = (event: PointerEvent<HTMLElement>) => { if (event.pointerType !== 'mouse') return; pointerStart.current = event.clientX; dragged.current = false; };
  const endPointer = (event: PointerEvent<HTMLElement>) => {
    if (event.pointerType !== 'mouse') return;
    if (pointerStart.current === null) return;
    const delta = event.clientX - pointerStart.current;
    if (Math.abs(delta) > 46) { dragged.current = true; delta < 0 ? next() : previous(); }
    pointerStart.current = null;
  };
  const swipeStart = (event: TouchEvent<HTMLElement>) => { pointerStart.current = event.changedTouches[0]?.clientX ?? null; dragged.current = false; };
  const swipeEnd = (event: TouchEvent<HTMLElement>) => {
    if (pointerStart.current === null) return;
    const delta = (event.changedTouches[0]?.clientX ?? pointerStart.current) - pointerStart.current;
    if (Math.abs(delta) > 42) { dragged.current = true; delta < 0 ? next() : previous(); }
    pointerStart.current = null;
  };

  if (!count) return null;
  const current = images[index]!;
  const counter = String(index + 1).padStart(2, '0') + ' / ' + String(count).padStart(2, '0');
  return <section className="gallery" aria-labelledby="gallery-title">
    <div className="gallery__heading"><h2 id="gallery-title" className="mono">{t('project.gallery')}</h2><span className="mono">{counter}</span></div>
    <div className="gallery__frame" role="group" aria-roledescription="carousel" aria-label={t('project.gallery')} tabIndex={0} onKeyDown={(event) => {
      if (event.key === 'ArrowLeft') { event.preventDefault(); previous(); }
      if (event.key === 'ArrowRight') { event.preventDefault(); next(); }
    }} onPointerDown={beginPointer} onPointerUp={endPointer} onTouchStart={swipeStart} onTouchEnd={swipeEnd}>
      <button type="button" className="gallery__image-button" onClick={() => { if (!dragged.current) setOpen(true); }} aria-label={t('project.imageCount', { current: index + 1, total: count })} data-cursor={t('project.gallery') + ' →'}>
        <img src={current.imageUrl} alt={current.alt || title} loading="lazy" draggable={false} />
      </button>
      {count > 1 && <div className="gallery__controls"><button type="button" onClick={previous} aria-label={t('project.previous')}>← <span>{t('project.previous')}</span></button><span className="mono">{counter}</span><button type="button" onClick={next} aria-label={t('project.nextImage')}><span>{t('project.nextImage')}</span> →</button></div>}
    </div>
    {open && <div className="lightbox" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setOpen(false)}>
      <div className="lightbox__dialog" role="dialog" aria-modal="true" aria-label={t('project.gallery')} ref={modalRef}>
        <button type="button" ref={closeRef} className="lightbox__close" onClick={() => setOpen(false)} aria-label={t('project.closeGallery')}>×</button>
        {count > 1 && <button type="button" className="lightbox__prev" onClick={previous} aria-label={t('project.previous')}>←</button>}
        <figure><img src={current.imageUrl} alt={current.alt || title} /><figcaption className="mono">{t('project.imageCount', { current: index + 1, total: count })}</figcaption></figure>
        {count > 1 && <button type="button" className="lightbox__next" onClick={next} aria-label={t('project.nextImage')}>→</button>}
      </div>
    </div>}
  </section>;
}
