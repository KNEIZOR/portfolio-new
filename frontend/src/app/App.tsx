import { lazy, Suspense, useEffect, useLayoutEffect, useState } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import i18n, { isLocale, supportedLocales } from './i18n';
import { updateSeo } from './seo';
import Preloader from '../components/Preloader';
import SiteFrame from '../components/SiteFrame';
import HomePage from '../pages/HomePage';
import NotFoundPage from '../pages/NotFoundPage';

const AdminApp = lazy(() => import('../pages/admin/AdminApp'));
const ProjectPage = lazy(() => import('../pages/ProjectPage'));

function ProjectRoute() {
  const { t } = useTranslation();
  return <Suspense fallback={<div className="route-loader">{t('project.loading')}</div>}><ProjectPage /></Suspense>;
}

function getInitialLocale() {
  const saved = localStorage.getItem('denis-locale');
  if (saved && isLocale(saved)) return saved;
  for (const language of navigator.languages ?? [navigator.language]) {
    const match = language.toLowerCase().split('-')[0];
    if (supportedLocales.includes(match as (typeof supportedLocales)[number])) return match;
  }
  return 'en';
}

function RootRedirect() { return <Navigate to={'/' + getInitialLocale()} replace />; }

function AdminGate() {
  const { t, i18n } = useTranslation();
  useEffect(() => {
    updateSeo((isLocale(i18n.language) ? i18n.language : 'en'), '/admin', 'Admin — DENIS.DEV', t('admin.title'), true);
  }, [i18n, t]);
  return <Suspense fallback={<div className="route-loader">{t('common.loading')}</div>}><AdminApp /></Suspense>;
}

function GlobalFallback() {
  const location = useLocation();
  const { i18n } = useTranslation();
  const match = location.pathname.split('/')[1];
  return <NotFoundPage locale={isLocale(match) ? match : (isLocale(i18n.language) ? i18n.language : 'en')} />;
}

export default function App() {
  const [preloading, setPreloading] = useState(true);
  useLayoutEffect(() => {
    const routeLocale = window.location.pathname.split('/')[1];
    if (isLocale(routeLocale)) return;
    const locale = getInitialLocale();
    localStorage.setItem('denis-locale', locale);
    if (i18n.language !== locale) void i18n.changeLanguage(locale);
  }, []);
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add('js-ready');
    return () => root.classList.remove('js-ready');
  }, []);
  return <div className={preloading ? 'app-shell app-shell--loading' : 'app-shell app-shell--ready'}>
    {preloading && <Preloader onDone={() => setPreloading(false)} />}
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      {/* Keep admin URLs more specific than /:locale/projects/:slug below.
          Otherwise React Router can interpret "admin" as a locale and show
          the public 404 for routes such as /admin/projects/new. */}
      <Route path="/admin" element={<AdminGate />} />
      <Route path="/admin/projects" element={<AdminGate />} />
      <Route path="/admin/projects/new" element={<AdminGate />} />
      <Route path="/admin/projects/:projectId/edit" element={<AdminGate />} />
      <Route path="/admin/settings" element={<AdminGate />} />
      <Route path="/:locale" element={<SiteFrame />}>
        <Route index element={<HomePage />} />
        <Route path="projects/:slug" element={<ProjectRoute />} />
        <Route path="*" element={<GlobalFallback />} />
      </Route>
      <Route path="*" element={<GlobalFallback />} />
    </Routes>
  </div>;
}
