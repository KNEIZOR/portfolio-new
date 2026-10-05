import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ApiError, api, type AdminProject } from '../../app/api';
import type { Locale, ProjectPayload, Translation } from '../../app/types';
import { supportedLocales } from '../../app/i18n';

type ImageDraft = { imageUrl: string; alt: Record<Locale, string> };
type Draft = {
  slug: string; category: string; year: number; role: string; client: string;
  liveUrl: string; githubUrl: string; coverImage: string; status: 'DRAFT' | 'PUBLISHED';
  technologies: string; translations: Translation[]; images: ImageDraft[];
};

const blankTranslation = (locale: Locale): Translation => ({ locale, title: '', shortDescription: '', fullDescription: '', challenge: '', solution: '', technicalApproach: '', seoTitle: '', seoDescription: '', features: [] });
const emptyDraft = (): Draft => ({ slug: '', category: '', year: new Date().getFullYear(), role: '', client: '', liveUrl: '', githubUrl: '', coverImage: '', status: 'DRAFT', technologies: '', translations: supportedLocales.map(blankTranslation), images: [] });
const localeNames: Record<Locale, string> = { en: 'EN', ru: 'RU', hy: 'HY' };

function fromProject(project: AdminProject): Draft {
  const translations = supportedLocales.map((locale) => {
    const source = project.translations.find((item) => item.locale === locale);
    return {
      ...blankTranslation(locale), ...source,
      features: project.features?.map((feature) => feature.translations.find((item) => item.locale === locale)?.text ?? '') ?? [],
    };
  });
  const images = project.images.map((image) => ({ imageUrl: image.imageUrl, alt: {
    en: image.altTranslations?.find((item) => item.locale === 'en')?.alt ?? '',
    ru: image.altTranslations?.find((item) => item.locale === 'ru')?.alt ?? '',
    hy: image.altTranslations?.find((item) => item.locale === 'hy')?.alt ?? '',
  } }));
  const technologies = Array.isArray(project.technologies) ? project.technologies.map((item) => typeof item === 'string' ? item : item.technology.name).join(', ') : '';
  return { slug: project.slug, category: project.category, year: project.year, role: project.role, client: project.client ?? '', liveUrl: project.liveUrl ?? '', githubUrl: project.githubUrl ?? '', coverImage: project.coverImage ?? '', status: project.status, technologies, translations, images };
}

export default function AdminProjectEditor({ onToast }: { onToast: (message: string) => void }) {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [locale, setLocale] = useState<Locale>('en');
  const [loading, setLoading] = useState(Boolean(id));
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const coverInput = useRef<HTMLInputElement>(null);
  const draggingIndex = useRef<number | null>(null);

  useEffect(() => {
    const preferred = localStorage.getItem('denis-locale');
    if (preferred && supportedLocales.includes(preferred as Locale)) setLocale(preferred as Locale);
  }, []);

  useEffect(() => {
    if (!id) { setDraft(emptyDraft()); setLoading(false); return; }
    let active = true;
    setLoading(true);
    api.adminProject(id).then((project) => { if (active) setDraft(fromProject(project)); }).catch((reason: unknown) => {
      if (active) setError(reason instanceof ApiError && reason.status === 404 ? t('admin.notFound') : t('admin.networkError'));
    }).finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [id, t]);

  const update = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setError('');
    setDraft((current) => ({ ...current, [key]: value }));
  };
  const updateTranslation = <K extends Exclude<keyof Translation, 'locale'>>(key: K, value: Translation[K]) => {
    setError('');
    setDraft((current) => ({
      ...current,
      translations: current.translations.map((item) => item.locale === locale ? { ...item, [key]: value } : item),
    }));
  };
  const translation = draft.translations.find((item) => item.locale === locale) ?? blankTranslation(locale);
  const toPayload = (status: Draft['status'], publishAnyway = false): ProjectPayload => ({
    slug: draft.slug, category: draft.category, year: Number(draft.year), role: draft.role,
    client: draft.client.trim() || null, liveUrl: draft.liveUrl.trim() || null, githubUrl: draft.githubUrl.trim() || null,
    coverImage: draft.coverImage || null, status, technologies: draft.technologies.split(',').map((item) => item.trim()).filter(Boolean),
    translations: draft.translations, images: draft.images, publishAnyway,
  });

  const upload = async (files: File[], target: 'cover' | 'gallery') => {
    if (!files.length) return;
    setUploading(true); setError('');
    try {
      const result = await api.upload(target === 'cover' ? files.slice(0, 1) : files);
      if (target === 'cover') update('coverImage', result.urls[0] ?? '');
      else update('images', [...draft.images, ...result.urls.map((imageUrl) => ({ imageUrl, alt: { en: '', ru: '', hy: '' } }))]);
      onToast(t('admin.uploadedToast'));
    } catch {
      setError(t('admin.uploadError'));
    } finally { setUploading(false); }
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>, target: 'cover' | 'gallery') => {
    void upload(Array.from(event.target.files ?? []), target);
    event.target.value = '';
  };
  const handleDrop = (event: DragEvent<HTMLDivElement>, target: 'cover' | 'gallery') => {
    event.preventDefault();
    const files = Array.from(event.dataTransfer.files).filter((file) => file.type.startsWith('image/'));
    void upload(files, target);
  };

  const save = async (status: Draft['status'] = draft.status, publishAnyway = false) => {
    const missingProjectFields = [
      !draft.slug.trim() && t('admin.slug'),
      !draft.category.trim() && t('admin.category'),
      (!Number.isInteger(draft.year) || draft.year < 1990 || draft.year > 2100) && t('admin.year'),
      !draft.role.trim() && t('admin.role'),
    ].filter((field): field is string => Boolean(field));
    if (missingProjectFields.length) {
      setError(t('admin.invalidFields', { fields: missingProjectFields.join(', ') }));
      return;
    }
    if (status === 'PUBLISHED') {
      const english = draft.translations.find((item) => item.locale === 'en');
      const missingEnglishFields = [
        !english?.title.trim() && t('admin.name'),
        !english?.shortDescription.trim() && t('admin.shortDescription'),
        !english?.fullDescription.trim() && t('admin.fullDescription'),
      ].filter((field): field is string => Boolean(field));
      if (missingEnglishFields.length) {
        setLocale('en');
        setError(t('admin.publishEnglishRequired', { fields: missingEnglishFields.join(', ') }));
        return;
      }
    }
    setSaving(true); setError('');
    try {
      const payload = toPayload(status, publishAnyway);
      const saved = id ? await api.updateProject(id, payload) : await api.createProject(payload);
      update('status', status);
      onToast(status === 'PUBLISHED' ? t('admin.publishedToast') : (id ? t('admin.savedToast') : t('admin.draftToast')));
      if (!id) navigate('/admin/projects/' + saved.id + '/edit', { replace: true });
    } catch (reason) {
      if (reason instanceof ApiError && reason.code === 'MISSING_TRANSLATIONS' && !publishAnyway) {
        setError('MISSING_TRANSLATIONS');
      } else if (reason instanceof ApiError && reason.code === 'EN_TRANSLATION_REQUIRED') {
        setLocale('en');
        const english = draft.translations.find((item) => item.locale === 'en');
        const missingEnglishFields = [
          !english?.title.trim() && t('admin.name'),
          !english?.shortDescription.trim() && t('admin.shortDescription'),
          !english?.fullDescription.trim() && t('admin.fullDescription'),
        ].filter((field): field is string => Boolean(field));
        setError(t('admin.publishEnglishRequired', { fields: missingEnglishFields.join(', ') }));
      } else if (reason instanceof ApiError && reason.code === 'VALIDATION_ERROR') {
        const labels: Record<string, string> = {
          slug: t('admin.slug'), category: t('admin.category'), year: t('admin.year'), role: t('admin.role'),
          client: t('admin.client'), liveUrl: t('admin.liveUrl'), githubUrl: t('admin.githubUrl'),
          technologies: t('admin.technologies'), translations: t('admin.translations'), images: t('admin.gallery'),
        };
        const fields = Object.keys(reason.details?.fieldErrors ?? {}).map((field) => labels[field] ?? field);
        setError(fields.length ? t('admin.invalidFields', { fields: fields.join(', ') }) : t('admin.validationError'));
      } else if (reason instanceof ApiError && reason.code === 'CONFLICT') {
        setError(t('admin.slugTaken'));
      } else if (reason instanceof ApiError && reason.code === 'SAVE_TIMEOUT') {
        setError(t('admin.saveTimeout'));
      } else setError(t('admin.saveError'));
    } finally { setSaving(false); }
  };

  const moveImage = (from: number, to: number) => {
    if (to < 0 || to >= draft.images.length) return;
    const images = [...draft.images];
    const [item] = images.splice(from, 1);
    if (item) images.splice(to, 0, item);
    update('images', images);
  };

  const submitDelete = async () => {
    if (!id) return;
    setSaving(true);
    try { await api.deleteProject(id); onToast(t('admin.deletedToast')); navigate('/admin/projects'); }
    catch { setError(t('admin.networkError')); }
    finally { setSaving(false); setDeleteConfirm(false); }
  };

  if (loading) return <div className="admin-skeleton" aria-busy="true"><span /><span /><span /></div>;
  if (error && !draft.slug && id) return <div className="admin-alert" role="alert">{error}</div>;

  return <div className="admin-editor">
    <div className="admin-page-heading"><div><span className="mono admin-eyebrow">{id ? 'CMS / EDIT' : 'CMS / NEW'}</span><h1>{id ? t('admin.edit') : t('admin.new')}</h1></div><div className="admin-heading-actions">{id && <button type="button" className="admin-button admin-button--quiet" onClick={() => setDeleteConfirm(true)}>{t('admin.delete')}</button>}<button type="button" className="admin-button admin-button--quiet" onClick={() => setPreview(true)}>{t('admin.preview')}</button></div></div>
    {error && <div className={'admin-alert' + (error === 'MISSING_TRANSLATIONS' ? ' admin-alert--warning' : '')} role="alert">
      {error === 'MISSING_TRANSLATIONS' ? <><strong>{t('admin.missingTranslations')}</strong><span>{t('admin.missingDescription')}</span><div><button type="button" className="admin-button admin-button--quiet" onClick={() => setError('')}>{t('admin.cancel')}</button><button type="button" className="admin-button admin-button--primary" disabled={saving} onClick={() => void save('PUBLISHED', true)}>{t('admin.publishAnyway')}</button></div></> : error}
    </div>}

    <section className="admin-form-section"><div className="admin-form-section__head"><span className="mono">01</span><h2>{t('admin.settings')}</h2></div><div className="admin-form-grid">
      <label className="admin-field admin-field--wide"><span>{t('admin.slug')} *</span><input value={draft.slug} onChange={(event) => update('slug', event.target.value.toLowerCase().replace(/\s+/g, '-'))} placeholder="nova-studio" required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" /></label>
      <label className="admin-field"><span>{t('admin.category')} *</span><input value={draft.category} onChange={(event) => update('category', event.target.value)} required /></label>
      <label className="admin-field"><span>{t('admin.year')} *</span><input type="number" min="1990" max="2100" value={draft.year} onChange={(event) => update('year', Number(event.target.value))} required /></label>
      <label className="admin-field"><span>{t('admin.role')} *</span><input value={draft.role} onChange={(event) => update('role', event.target.value)} required /></label>
      <label className="admin-field"><span>{t('admin.client')}</span><input value={draft.client} onChange={(event) => update('client', event.target.value)} /></label>
      <label className="admin-field"><span>{t('admin.liveUrl')}</span><input type="url" value={draft.liveUrl} onChange={(event) => update('liveUrl', event.target.value)} placeholder="https://" /></label>
      <label className="admin-field"><span>{t('admin.githubUrl')}</span><input type="url" value={draft.githubUrl} onChange={(event) => update('githubUrl', event.target.value)} placeholder="https://github.com/" /></label>
      <label className="admin-field admin-field--wide"><span>{t('admin.technologies')}</span><input value={draft.technologies} onChange={(event) => update('technologies', event.target.value)} placeholder="React, TypeScript, Node.js" /><small>{t('admin.technologiesHint')}</small></label>
    </div></section>

    <section className="admin-form-section"><div className="admin-form-section__head"><span className="mono">02</span><h2>{t('admin.translations')}</h2></div><div className="admin-tabs" role="tablist" aria-label={t('admin.translations')}>{supportedLocales.map((item) => <button key={item} type="button" role="tab" aria-selected={locale === item} className={locale === item ? 'is-active' : ''} onClick={() => setLocale(item)}>{localeNames[item]} <span className={draft.translations.find((part) => part.locale === item)?.title ? 'translation-check' : 'translation-warning'}>{draft.translations.find((part) => part.locale === item)?.title ? '✓' : '—'}</span></button>)}</div>
      <div className="admin-form-grid" role="tabpanel">
        <label className="admin-field admin-field--wide"><span>{t('admin.name')} *</span><input value={translation.title} onChange={(event) => updateTranslation('title', event.target.value)} /></label>
        <label className="admin-field admin-field--wide"><span>{t('admin.shortDescription')} *</span><textarea rows={2} value={translation.shortDescription} onChange={(event) => updateTranslation('shortDescription', event.target.value)} /></label>
        <label className="admin-field admin-field--wide"><span>{t('admin.fullDescription')} *</span><textarea rows={5} value={translation.fullDescription} onChange={(event) => updateTranslation('fullDescription', event.target.value)} /></label>
        <label className="admin-field"><span>{t('admin.challenge')}</span><textarea rows={4} value={translation.challenge} onChange={(event) => updateTranslation('challenge', event.target.value)} /></label>
        <label className="admin-field"><span>{t('admin.solution')}</span><textarea rows={4} value={translation.solution} onChange={(event) => updateTranslation('solution', event.target.value)} /></label>
        <label className="admin-field admin-field--wide"><span>{t('admin.technicalApproach')}</span><textarea rows={4} value={translation.technicalApproach} onChange={(event) => updateTranslation('technicalApproach', event.target.value)} /></label>
        <label className="admin-field admin-field--wide"><span>{t('admin.features')}</span><textarea rows={4} value={translation.features.join('\n')} onChange={(event) => updateTranslation('features', event.target.value.split('\n'))} /><small>{t('admin.featureHint')}</small></label>
        <label className="admin-field"><span>{t('admin.seoTitle')}</span><input value={translation.seoTitle} onChange={(event) => updateTranslation('seoTitle', event.target.value)} /></label>
        <label className="admin-field"><span>{t('admin.seoDescription')}</span><textarea rows={2} value={translation.seoDescription} onChange={(event) => updateTranslation('seoDescription', event.target.value)} /></label>
      </div>
    </section>

    <section className="admin-form-section"><div className="admin-form-section__head"><span className="mono">03</span><h2>{t('admin.cover')} / {t('admin.gallery')}</h2></div>
      <div className="admin-media-grid">
        <div className="admin-media-block"><span className="admin-field__label">{t('admin.cover')}</span>
          <div className="admin-dropzone admin-dropzone--cover" onDragOver={(event) => event.preventDefault()} onDrop={(event) => handleDrop(event, 'cover')} onClick={() => coverInput.current?.click()} role="button" tabIndex={0} onKeyDown={(event) => event.key === 'Enter' && coverInput.current?.click()}>
            {draft.coverImage ? <><img src={draft.coverImage} alt={translation.title || t('admin.cover')} /><button type="button" onClick={(event) => { event.stopPropagation(); update('coverImage', ''); }} aria-label={t('admin.removeImage')}>×</button></> : <span>{t('admin.upload')}</span>}
          </div><input ref={coverInput} className="visually-hidden" type="file" accept=".jpg,.jpeg,.png,.webp,.avif,image/jpeg,image/png,image/webp,image/avif" onChange={(event) => handleFileChange(event, 'cover')} />
        </div>
        <div className="admin-media-block"><div className="admin-media-title"><span className="admin-field__label">{t('admin.gallery')}</span><button className="admin-button admin-button--quiet" type="button" onClick={() => fileInput.current?.click()}>{t('admin.upload')}</button></div>
          <div className="admin-dropzone admin-dropzone--gallery" onDragOver={(event) => event.preventDefault()} onDrop={(event) => handleDrop(event, 'gallery')}>
            {draft.images.length === 0 && <button type="button" onClick={() => fileInput.current?.click()}>{t('admin.upload')}</button>}
            <div className="admin-image-list">{draft.images.map((image, index) => <div key={image.imageUrl} className="admin-image-item" draggable onDragStart={() => { draggingIndex.current = index; }} onDragOver={(event) => event.preventDefault()} onDrop={() => {
              const from = draggingIndex.current; if (from !== null) moveImage(from, index); draggingIndex.current = null;
            }}>
              <div className="admin-image-item__thumb"><img src={image.imageUrl} alt="" loading="lazy" /><span className="mono">{String(index + 1).padStart(2, '0')}</span></div>
              <input aria-label={t('admin.altText') + ' ' + localeNames[locale]} placeholder={t('admin.altText')} value={image.alt[locale]} onChange={(event) => update('images', draft.images.map((item, itemIndex) => itemIndex === index ? { ...item, alt: { ...item.alt, [locale]: event.target.value } } : item))} />
              <div className="admin-image-item__actions"><button type="button" aria-label={t('admin.moveLeft')} disabled={index === 0} onClick={() => moveImage(index, index - 1)}>←</button><button type="button" aria-label={t('admin.moveRight')} disabled={index === draft.images.length - 1} onClick={() => moveImage(index, index + 1)}>→</button><button type="button" aria-label={t('admin.removeImage')} onClick={() => update('images', draft.images.filter((_, itemIndex) => itemIndex !== index))}>×</button></div>
            </div>)}</div>
          </div><input ref={fileInput} className="visually-hidden" multiple type="file" accept=".jpg,.jpeg,.png,.webp,.avif,image/jpeg,image/png,image/webp,image/avif" onChange={(event) => handleFileChange(event, 'gallery')} /><small>{uploading ? t('admin.uploading') : t('admin.uploadHint')}</small>
        </div>
      </div>
    </section>
    <div className="admin-editor__actions"><button type="button" className="admin-button admin-button--quiet" onClick={() => void save('DRAFT')} disabled={saving}>{saving ? t('admin.saving') : (draft.status === 'PUBLISHED' ? t('admin.unpublish') : t('admin.saveDraft'))}</button>{id && <button type="button" className="admin-button admin-button--quiet" onClick={() => void save()} disabled={saving}>{t('admin.saveChanges')}</button>}<button type="button" className="admin-button admin-button--primary" onClick={() => void save('PUBLISHED')} disabled={saving}>{saving ? t('admin.saving') : t('admin.publish')} <span>↗</span></button></div>

    {preview && <div className="admin-modal" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setPreview(false)}><div className="admin-modal__panel admin-preview" role="dialog" aria-modal="true" aria-label={t('admin.preview')}><button type="button" className="admin-modal__close" onClick={() => setPreview(false)} aria-label={t('common.close')}>×</button><span className="mono admin-eyebrow">{t('admin.preview')} · {localeNames[locale]}</span><h2>{translation.title || t('admin.name')}</h2><p className="admin-preview__short">{translation.shortDescription}</p>{draft.coverImage && <img src={draft.coverImage} alt={translation.title} />}{draft.images.length > 0 && <div className="admin-preview__gallery">{draft.images.map((image) => <img key={image.imageUrl} src={image.imageUrl} alt={image.alt[locale]} />)}</div>}<p>{translation.fullDescription}</p><div>{draft.technologies.split(',').map((item) => item.trim()).filter(Boolean).map((item) => <span key={item}>{item}</span>)}</div></div></div>}
    {deleteConfirm && <div className="admin-modal" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setDeleteConfirm(false)}><div className="admin-modal__panel admin-confirm" role="alertdialog" aria-modal="true" aria-labelledby="delete-title"><button type="button" className="admin-modal__close" onClick={() => setDeleteConfirm(false)} aria-label={t('common.close')}>×</button><span className="mono admin-eyebrow">DENIS.DEV / CMS</span><h2 id="delete-title">{t('admin.confirmDelete')}</h2><p>{t('admin.deleteWarning')}</p><div><button type="button" className="admin-button admin-button--quiet" onClick={() => setDeleteConfirm(false)}>{t('admin.cancel')}</button><button type="button" className="admin-button admin-button--danger" disabled={saving} onClick={() => void submitDelete()}>{t('admin.deleteProject')}</button></div></div></div>}
  </div>;
}
