import { useEffect, useLayoutEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ApiError, api, type AdminProject } from '../../app/api';
import { supportedLocales, type Locale } from '../../app/i18n';
import type { Completeness } from '../../app/types';
import AdminProjectEditor from './AdminProjectEditor';

type AdminUser = { id: string; email: string };
type Toast = { id: number; message: string };

function AdminLogin({ onLogin }: { onLogin: (user: AdminUser) => void }) {
  const { t, i18n } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const changeLanguage = (locale: Locale) => { localStorage.setItem('denis-locale', locale); void i18n.changeLanguage(locale); };
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setError(''); setLoading(true);
    try { const result = await api.login(email, password); onLogin(result.user); }
    catch (reason) { setError(reason instanceof ApiError && reason.status === 401 ? t('admin.loginFailed') : (reason instanceof ApiError && reason.status === 429 ? t('admin.rateLimited') : t('admin.networkError'))); }
    finally { setLoading(false); }
  };
  return <main className="admin-login">
    <div className="admin-login__language" aria-label={t('admin.language')}>{supportedLocales.map((locale) => <button key={locale} type="button" className={i18n.language === locale ? 'is-active' : ''} onClick={() => changeLanguage(locale)}>{locale.toUpperCase()}</button>)}</div>
    <Link to={'/' + (supportedLocales.includes(i18n.language as Locale) ? i18n.language : 'en')} className="admin-login__brand">DENIS<span>.</span>DEV</Link>
    <div className="admin-login__card"><span className="mono admin-eyebrow">PRIVATE AREA / 01</span><h1>{t('admin.title')}</h1><p>{t('admin.subtitle')}</p>
      <form onSubmit={(event) => void submit(event)}>
        <label className="admin-field"><span>{t('admin.email')}</span><input type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
        <label className="admin-field"><span>{t('admin.password')}</span><input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
        {error && <p className="admin-login__error" role="alert">{error}</p>}
        <button className="admin-button admin-button--primary" disabled={loading}>{loading ? t('admin.signingIn') : t('admin.signIn')} <span>→</span></button>
      </form>
    </div><span className="admin-login__foot mono">DENIS.DEV · {t('hero.location')}</span>
  </main>;
}

function TranslationStatus({ completeness, project }: { completeness?: Completeness; project: AdminProject }) {
  return <div className="admin-language-status">{supportedLocales.map((locale) => {
    const translation = project.translations.find((item) => item.locale === locale);
    const complete = completeness?.[locale] ?? Boolean(translation?.title.trim() && translation.shortDescription.trim() && translation.fullDescription.trim());
    return <span key={locale} className={complete ? 'is-complete' : 'is-missing'}>{locale.toUpperCase()} {complete ? '✓' : '—'}</span>;
  })}</div>;
}

function ProjectRows({ projects, onDelete }: { projects: AdminProject[]; onDelete: (project: AdminProject) => void }) {
  const { t, i18n } = useTranslation();
  const locale = supportedLocales.includes(i18n.language as Locale) ? i18n.language : 'en';
  const currentTitle = (project: AdminProject) => project.translations.find((item) => item.locale === locale)?.title || project.translations.find((item) => item.locale === 'en')?.title || '—';
  const date = (value: string) => new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(value));
  return <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>{t('admin.thumbnail')}</th><th>{t('admin.titleColumn')}</th><th>{t('admin.slug')}</th><th>{t('admin.status')}</th><th>{t('admin.languages')}</th><th>{t('admin.created')}</th><th>{t('admin.updated')}</th><th>{t('admin.actions')}</th></tr></thead><tbody>
    {projects.map((project) => <tr key={project.id}><td><div className="admin-table__thumb">{project.coverImage && <img src={project.coverImage} alt="" loading="lazy" />}</div></td><td><strong>{currentTitle(project)}</strong></td><td className="mono">{project.slug}</td><td><span className={'admin-status admin-status--' + project.status.toLowerCase()}>{project.status === 'PUBLISHED' ? t('admin.published') : t('admin.drafts')}</span></td><td><TranslationStatus completeness={project.completeness} project={project} /></td><td>{date(project.createdAt)}</td><td>{date(project.updatedAt)}</td><td><div className="admin-table__actions"><Link to={'/admin/projects/' + project.id + '/edit'} aria-label={t('admin.editAction')}>{t('admin.editAction')}</Link>{project.status === 'PUBLISHED' && <Link to={'/' + locale + '/projects/' + project.slug} target="_blank" aria-label={t('admin.view')}>{t('admin.view')}</Link>}<button type="button" onClick={() => onDelete(project)} aria-label={t('admin.delete')}>{t('admin.delete')}</button></div></td></tr>)}
  </tbody></table></div>;
}

function Dashboard({ user, projects, onNavigate, onDelete }: { user: AdminUser; projects: AdminProject[]; onNavigate: (path: string) => void; onDelete: (project: AdminProject) => void }) {
  const { t } = useTranslation();
  const total = projects.length;
  const published = projects.filter((project) => project.status === 'PUBLISHED').length;
  const drafts = total - published;
  const all = projects.length * 3;
  const translated = projects.reduce((count, project) => count + Object.values(project.completeness ?? {}).filter(Boolean).length, 0);
  const completeness = all ? Math.round(translated / all * 100) : 0;
  const recent = [...projects].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 5);
  return <div className="admin-dashboard"><div className="admin-page-heading"><div><span className="mono admin-eyebrow">DENIS.DEV / ADMIN</span><h1>{t('admin.welcome')}</h1><p>{user.email}</p></div><button className="admin-button admin-button--primary" type="button" onClick={() => onNavigate('/admin/projects/new')}>+ {t('admin.addProject')}</button></div>
    <div className="admin-metrics"><article><span className="mono">{t('admin.total')}</span><strong>{String(total).padStart(2, '0')}</strong></article><article><span className="mono">{t('admin.published')}</span><strong>{String(published).padStart(2, '0')}</strong></article><article><span className="mono">{t('admin.drafts')}</span><strong>{String(drafts).padStart(2, '0')}</strong></article><article><span className="mono">{t('admin.translationCompleteness')}</span><strong>{completeness}<i>%</i></strong><span className="admin-progress"><i style={{ width: completeness + '%' }} /></span></article></div>
    <section className="admin-list-section"><div className="admin-section-heading"><h2>{t('admin.recent')}</h2><button className="admin-text-button" type="button" onClick={() => onNavigate('/admin/projects')}>{t('admin.projects')} <span>→</span></button></div>{recent.length ? <ProjectRows projects={recent} onDelete={onDelete} /> : <div className="admin-empty"><span className="mono">✳</span><p>{t('admin.empty')}</p></div>}</section>
  </div>;
}

function ProjectList({ projects, onDelete }: { projects: AdminProject[]; onDelete: (project: AdminProject) => void }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  return <div className="admin-project-list"><div className="admin-page-heading"><div><span className="mono admin-eyebrow">CMS / INDEX</span><h1>{t('admin.projects')}</h1></div><button className="admin-button admin-button--primary" type="button" onClick={() => navigate('/admin/projects/new')}>+ {t('admin.addProject')}</button></div>{projects.length ? <ProjectRows projects={projects} onDelete={onDelete} /> : <div className="admin-empty"><span className="mono">✳</span><p>{t('admin.empty')}</p><button className="admin-button admin-button--quiet" type="button" onClick={() => navigate('/admin/projects/new')}>{t('admin.new')} ↗</button></div>}</div>;
}

function SettingsPage({ user }: { user: AdminUser }) {
  const { t, i18n } = useTranslation();
  return <div className="admin-settings"><div className="admin-page-heading"><div><span className="mono admin-eyebrow">DENIS.DEV / CONFIG</span><h1>{t('admin.settings')}</h1></div></div><section><h2>{t('admin.email')}</h2><p>{user.email}</p></section><section><h2>{t('admin.language')}</h2><div className="admin-tabs">{supportedLocales.map((locale) => <button key={locale} type="button" className={i18n.language === locale ? 'is-active' : ''} onClick={() => { localStorage.setItem('denis-locale', locale); void i18n.changeLanguage(locale); }}>{locale.toUpperCase()}</button>)}</div></section></div>;
}

function AdminShell({ user, onLogout, children }: { user: AdminUser; onLogout: () => void; children: ReactNode }) {
  const { t } = useTranslation();
  const location = useLocation();
  const links = [
    { path: '/admin', label: t('admin.dashboard'), icon: '↗' },
    { path: '/admin/projects', label: t('admin.projects'), icon: '▤' },
    { path: '/admin/projects/new', label: t('admin.addProject'), icon: '+' },
    { path: '/admin/settings', label: t('admin.settings'), icon: '◉' },
  ];
  return <div className="admin-layout"><aside className="admin-sidebar"><Link to="/admin" className="admin-sidebar__brand">DENIS<span>.</span>DEV</Link><span className="admin-sidebar__tag mono">ADMIN / CMS</span><nav aria-label={t('admin.navigation')}>{links.map((link) => {
    const active = location.pathname === link.path || (link.path !== '/admin' && link.path !== '/admin/projects/new' && location.pathname.startsWith(link.path + '/'));
    return <Link key={link.path} to={link.path} className={active ? 'is-active' : ''}><span className="mono">{link.icon}</span>{link.label}</Link>;
  })}</nav><div className="admin-sidebar__bottom"><Link to="/en" target="_blank">{t('admin.backToSite')} <span>↗</span></Link><button type="button" onClick={onLogout}>{t('admin.logout')} <span>→</span></button><span className="admin-sidebar__email">{user.email}</span></div></aside><main className="admin-main">{children}</main></div>;
}

export default function AdminApp() {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [checking, setChecking] = useState(true);
  const [projects, setProjects] = useState<AdminProject[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [pendingDelete, setPendingDelete] = useState<AdminProject | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [loadError, setLoadError] = useState('');

  const notify = (message: string) => {
    const id = Date.now() + Math.random();
    setToasts((current) => [...current, { id, message }]);
    window.setTimeout(() => setToasts((current) => current.filter((item) => item.id !== id)), 3600);
  };

  useLayoutEffect(() => {
    const saved = localStorage.getItem('denis-locale');
    if (saved && supportedLocales.includes(saved as Locale)) void i18n.changeLanguage(saved);
  }, [i18n]);

  useEffect(() => {
    let active = true;
    api.me().then((result) => { if (active) setUser(result.user); }).catch(() => { if (active) setUser(null); }).finally(() => active && setChecking(false));
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!user) return;
    let active = true;
    api.adminProjects().then((result) => { if (active) { setProjects(result); setLoadError(''); } }).catch((error) => {
      if (active) { setLoadError(error instanceof ApiError && error.status === 401 ? t('admin.loginFailed') : t('admin.networkError')); }
    });
    return () => { active = false; };
  }, [user, location.pathname, t]);

  const logout = async () => { await api.logout().catch(() => undefined); setUser(null); setProjects([]); navigate('/admin'); };
  const deleteProject = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await api.deleteProject(pendingDelete.id);
      setProjects((current) => current.filter((project) => project.id !== pendingDelete.id));
      notify(t('admin.deletedToast'));
    } catch { notify(t('admin.networkError')); }
    finally { setDeleting(false); setPendingDelete(null); }
  };

  if (checking) return <div className="admin-loading"><span className="mono">DENIS.DEV</span><i /></div>;
  if (!user) return <AdminLogin onLogin={setUser} />;

  const segments = location.pathname.split('/').filter(Boolean);
  const content = segments[1] === 'projects' && segments[2] === 'new'
    ? <AdminProjectEditor onToast={notify} />
    : segments[1] === 'projects' && segments[2] && segments[3] === 'edit'
      ? <AdminProjectEditor key={segments[2]} onToast={notify} />
      : segments[1] === 'projects'
        ? <ProjectList projects={projects} onDelete={setPendingDelete} />
        : segments[1] === 'settings'
          ? <SettingsPage user={user} />
          : <Dashboard user={user} projects={projects} onNavigate={(path) => navigate(path)} onDelete={setPendingDelete} />;

  const pendingName = pendingDelete?.translations.find((item) => item.locale === i18n.language)?.title || pendingDelete?.translations.find((item) => item.locale === 'en')?.title;
  return <AdminShell user={user} onLogout={() => void logout()}><>
    {loadError && <div className="admin-alert" role="alert">{loadError}</div>}{content}
    {pendingDelete && <div className="admin-modal" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setPendingDelete(null)}><div className="admin-modal__panel admin-confirm" role="alertdialog" aria-modal="true" aria-labelledby="list-delete-title"><button type="button" className="admin-modal__close" onClick={() => setPendingDelete(null)} aria-label={t('common.close')}>×</button><span className="mono admin-eyebrow">DENIS.DEV / CMS</span><h2 id="list-delete-title">{t('admin.confirmDelete')}</h2><p>{pendingName}</p><p>{t('admin.deleteWarning')}</p><div><button type="button" className="admin-button admin-button--quiet" onClick={() => setPendingDelete(null)}>{t('admin.cancel')}</button><button type="button" className="admin-button admin-button--danger" disabled={deleting} onClick={() => void deleteProject()}>{t('admin.deleteProject')}</button></div></div></div>}
    <div className="admin-toasts" aria-live="polite">{toasts.map((toast) => <div className="admin-toast" key={toast.id}>{toast.message}<span>✓</span></div>)}</div>
  </></AdminShell>;
}
