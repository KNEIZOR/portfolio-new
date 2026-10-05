import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

export default function Preloader({ onDone }: { onDone: () => void }) {
  const { t } = useTranslation();
  const [progress, setProgress] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const [gone, setGone] = useState(false);
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const start = performance.now();
    const duration = reduced ? 280 : 940;
    let frame = 0;
    const update = (now: number) => {
      const value = Math.min(100, Math.round((now - start) / duration * 100));
      setProgress(value);
      if (value < 100) frame = requestAnimationFrame(update);
      else setTimeout(() => setLeaving(true), 100);
    };
    frame = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frame);
  }, []);
  if (gone) return null;
  return <div className={'preloader' + (leaving ? ' preloader--out' : '')} onTransitionEnd={(event) => {
    if (leaving && event.target === event.currentTarget) { setGone(true); onDone(); }
  }} aria-label={t('common.loading')} aria-live="polite">
    <div className="preloader__inner"><span className="mono">DENIS.DEV</span><span className="preloader__number mono">{String(progress).padStart(2, '0')} <i>→</i> 100</span></div>
    <div className="preloader__line"><span style={{ transform: 'scaleX(' + progress / 100 + ')' }} /></div>
  </div>;
}
