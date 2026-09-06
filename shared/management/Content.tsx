import React, { useState } from 'react';
import { useOps, useResource, Screen, Notice, Badge, SyncState } from './context';
import { Dialog } from './Payment';

const DESTS = [
  ['blog', 'بلاگ سایت', 'Website blog', 'Site blogu', 'Блог сайта'],
  ['instagram', 'اینستاگرام', 'Instagram', 'Instagram', 'Instagram'],
  ['telegram', 'تلگرام', 'Telegram', 'Telegram', 'Telegram'],
] as const;

const STATUS_TONE: Record<string, string> = { draft: 'neutral', generating: 'warn', review: 'info', approved: 'info', scheduled: 'info', publishing: 'warn', published: 'good', partial: 'warn', failed: 'bad', cancelled: 'neutral' };
const STATUS_FA: Record<string, string> = { draft: 'پیش‌نویس', generating: 'در حال تولید', review: 'نیازمند بازبینی', approved: 'تأییدشده', scheduled: 'زمان‌بندی‌شده', publishing: 'در حال انتشار', published: 'منتشرشده', partial: 'بخشی منتشر شد', failed: 'ناموفق', cancelled: 'لغوشده' };

export function ContentConsole() {
  const { api, t, can, language } = useOps();
  const list = useResource<any[]>('/content', 7000);
  const [edit, setEdit] = useState<any>(null);
  const [genFor, setGenFor] = useState<any>(null);
  const [review, setReview] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function act(fn: () => Promise<any>) {
    setBusy(true); setError(''); setSuccess('');
    try { await fn(); await list.reload(); } catch (e: any) { setError(e.code || e.message); } finally { setBusy(false); }
  }

  return <Screen title={t('محتوا، سوشیال مدیا و صف انتشار', 'Content, social & publish queue', 'İçerik, sosyal medya ve yayın kuyruğu', 'Контент, соцсети и очередь публикаций')}
    subtitle={t('تولید با Manus، بازبینی مدیر، زمان‌بندی و انتشار جداگانه برای بلاگ/اینستاگرام/تلگرام. پیش‌نویس هرگز عمومی نمی‌شود.', 'Manus generation, manager review, scheduling and per-channel publishing. Drafts never go public.', 'Manus ile üretim, yönetici onayı, zamanlama ve kanal bazında yayın. Taslak asla herkese açık olmaz.', 'Генерация через Manus, проверка, планирование и публикация по каналам. Черновики не публикуются.')}
    actions={<><SyncState lastSync={list.lastSync} error={list.error} />{can('content') && <button className="ops-primary" onClick={() => setEdit({ title: '', destinations: ['blog'], versions: {} })}>{t('محتوای جدید', 'New content', 'Yeni içerik', 'Новый материал')}</button>}</>}>
    <Notice error={error || list.error} success={success} />
    <div className="ops-table-wrap"><table><thead><tr><th>{t('عنوان', 'Title', 'Başlık', 'Заголовок')}</th><th>{t('کانال‌ها', 'Channels', 'Kanallar', 'Каналы')}</th><th>{t('وضعیت', 'Status', 'Durum', 'Статус')}</th><th>{t('زمان انتشار', 'Scheduled', 'Yayın zamanı', 'Время публикации')}</th><th></th></tr></thead>
      <tbody>{(list.data || []).map(c => <tr key={c.id} data-content-row={c.id}>
        <td><b>{c.title}</b><div className="ops-code">{c.id}</div></td>
        <td>{DESTS.map(([key, fa]) => { const d = c.destinations?.[key]; return d ? <div key={key} className="ops-small">{language === 'fa' ? fa : key}: <Badge tone={STATUS_TONE[d.status] || 'neutral'}>{STATUS_FA[d.status] || d.status}{d.error ? ` (${d.error})` : ''}</Badge></div> : null; })}</td>
        <td><Badge tone={STATUS_TONE[c.status] || 'neutral'}>{STATUS_FA[c.status] || c.status}</Badge></td>
        <td className="ops-small">{c.scheduledAt ? new Date(c.scheduledAt).toLocaleString(language) : '—'}</td>
        <td><div className="ops-actions">
          <button onClick={() => setReview(c)}>{t('بازبینی/تولید', 'Review / generate', 'Gözden geçir / üret', 'Просмотр / генерация')}</button>
          {can('publish') && ['review', 'approved', 'scheduled'].includes(c.status) && <button className="ops-primary" disabled={busy} onClick={() => act(async () => { const when = prompt(t('زمان انتشار (YYYY-MM-DD HH:MM، خالی = همین حالا)', 'Publish time (empty = now)', 'Yayın zamanı (boş = şimdi)', 'Время (пусто = сейчас)')); await api(`/content/${c.id}/schedule`, 'POST', when ? { scheduledAt: new Date(when.replace(' ', 'T')).toISOString() } : { publishNow: true }); setSuccess(t('در صف انتشار قرار گرفت.', 'Queued for publishing.', 'Yayın kuyruğuna alındı.', 'Поставлено в очередь.')); })}>{t('زمان‌بندی انتشار', 'Schedule publish', 'Yayın zamanla', 'Запланировать')}</button>}
          {can('publish') && !['published', 'cancelled'].includes(c.status) && <button className="ops-danger" disabled={busy} onClick={() => act(async () => { if (confirm(t('لغو شود؟', 'Cancel?', 'İptal?', 'Отменить?'))) await api(`/content/${c.id}/cancel`, 'POST', {}); })}>{t('لغو', 'Cancel', 'İptal', 'Отмена')}</button>}
        </div></td>
      </tr>)}{!(list.data || []).length && <tr><td colSpan={5}>{t('محتوایی نیست.', 'No content yet.', 'İçerik yok.', 'Материалов нет.')}</td></tr>}</tbody></table></div>

    {edit && <Dialog title={t('محتوای جدید', 'New content', 'Yeni içerik', 'Новый материал')} onClose={() => setEdit(null)}>
      <form onSubmit={e => { e.preventDefault(); void act(async () => {
        const versions: any = {};
        for (const [key, fa, en] of DESTS) { const v = edit.versions[key]; if (v?.body) versions[key] = { title: v.title || edit.title, body: v.body, language: v.language || 'fa' }; }
        await api('/content', 'POST', { title: edit.title, destinations: edit.destinations, versions });
        setEdit(null); setSuccess(t('پیش‌نویس ساخته شد.', 'Draft created.', 'Taslak oluşturuldu.', 'Черновик создан.'));
      }); }}>
        <label>{t('عنوان/موضوع', 'Title / topic', 'Başlık / konu', 'Заголовок / тема')}<input required maxLength={200} value={edit.title} onChange={e => setEdit({ ...edit, title: e.target.value })} data-content-title /></label>
        <label>{t('کانال‌های مقصد', 'Destination channels', 'Hedef kanallar', 'Каналы')}
          <div className="ops-chip-selector">{DESTS.map(([key, fa, en]) => <label key={key}><input type="checkbox" checked={edit.destinations.includes(key)} onChange={e => setEdit({ ...edit, destinations: e.target.checked ? [...edit.destinations, key] : edit.destinations.filter((d: string) => d !== key) })} />{language === 'fa' ? fa : en}</label>)}</div></label>
        <p className="ops-muted ops-small">{t('می‌توانید بعد از ساخت، متن را با Manus تولید کنید یا دستی بنویسید.', 'After creating you can generate text with Manus or write it manually.', 'Oluşturduktan sonra metni Manus ile üretebilir veya elle yazabilirsiniz.', 'После создания текст можно сгенерировать через Manus или написать вручную.')}</p>
        <Notice error={error} />
        <button className="ops-primary" disabled={busy}>{t('ساخت پیش‌نویس', 'Create draft', 'Taslak oluştur', 'Создать черновик')}</button>
      </form>
    </Dialog>}

    {review && <Dialog title={review.title} onClose={() => setReview(null)}>
      <div className="ops-stack">
        {DESTS.map(([key, fa, en]) => {
          const dest = review.destinations?.[key]; const v = review.versions?.[key];
          if (!dest) return null;
          return <div className="ops-card" key={key} data-dest={key}>
            <div className="ops-row"><h3>{language === 'fa' ? fa : en}</h3><Badge tone={STATUS_TONE[dest.status] || 'neutral'}>{STATUS_FA[dest.status] || dest.status}</Badge></div>
            <label>{t('عنوان', 'Title', 'Başlık', 'Заголовок')}<input value={v?.title || ''} onChange={e => setReview({ ...review, versions: { ...review.versions, [key]: { ...(v || { body: '', language: 'fa' }), title: e.target.value } } })} /></label>
            <label>{t('متن', 'Body', 'Metin', 'Текст')}<textarea rows={6} value={v?.body || ''} onChange={e => setReview({ ...review, versions: { ...review.versions, [key]: { ...(v || { title: '', language: 'fa' }), body: e.target.value } } })} /></label>
            <div className="ops-actions">
              {can('content') && <button disabled={busy} onClick={() => setGenFor({ id: review.id, dest: key })}>{t('تولید/بازنویسی با Manus', 'Generate with Manus', 'Manus ile üret', 'Сгенерировать через Manus')}</button>}
              {can('content') && <button disabled={busy} onClick={() => act(async () => { await api(`/content/${review.id}`, 'POST', { version: review.version, versions: { [key]: review.versions[key] } }); setSuccess(t('متن ذخیره شد.', 'Text saved.', 'Metin kaydedildi.', 'Текст сохранён.')); })}>{t('ذخیره متن', 'Save text', 'Metni kaydet', 'Сохранить текст')}</button>}
              {can('publish') && v?.body && dest.status !== 'published' && <button className="ops-primary" disabled={busy} onClick={() => act(async () => { await api(`/content/${review.id}/approve`, 'POST', { destination: key }); setSuccess(t('نسخه تأیید شد.', 'Version approved.', 'Sürüm onaylandı.', 'Версия одобрена.')); })}>{t('تأیید نسخه', 'Approve version', 'Sürümü onayla', 'Одобрить версию')}</button>}
              {dest.error && <p className="ops-error ops-small">{dest.error}</p>}
            </div>
          </div>;
        })}
      </div>
    </Dialog>}

    {genFor && <Dialog title={t('تولید محتوا با Manus', 'Generate with Manus', 'Manus ile üret', 'Генерация через Manus')} onClose={() => setGenFor(null)}>
      <form onSubmit={e => { e.preventDefault(); void act(async () => {
        const fd = new FormData(e.currentTarget);
        try { await api(`/content/${genFor.id}/generate`, 'POST', { destination: genFor.dest, prompt: fd.get('prompt'), language: fd.get('language'), category: fd.get('category') }); setGenFor(null); setReview(null); setSuccess(t('درخواست تولید به Manus ارسال شد؛ نتیجه پس از تکمیل به صف بازمی‌گردد.', 'Manus task created; the result returns to the queue when ready.', 'Manus görevi oluşturuldu; sonuç tamamlanınca kuyruğa döner.', 'Задача отправлена в Manus; результат вернётся в очередь по вебхуку.')); }
        catch (e: any) { setError(e.code === 'INTEGRATION_NOT_CONFIGURED' ? t('کلید API مانوس تنظیم نشده است.', 'Manus API key is not configured.', 'Manus API anahtarı ayarlı değil.', 'Ключ Manus не настроен.') : e.code); }
      }); }}>
        <label>{t('زبان', 'Language', 'Dil', 'Язык')}<select name="language"><option value="fa">فارسی</option><option value="en">English</option><option value="tr">Türkçe</option><option value="ru">Русский</option></select></label>
        <label>{t('دسته', 'Category', 'Kategori', 'Категория')}<input name="category" maxLength={80} placeholder={t('مثلاً: تورنومنت، تخفیف، معرفی بازی', 'e.g. tournament, discount, game review', 'Örn. turnuva, indirim, oyun tanıtımı', 'Напр. турнир, скидка, обзор игры')} /></label>
        <label>{t('دستور/توضیح به Manus', 'Prompt for Manus', 'Manus için talimat', 'Промпт для Manus')}<textarea name="prompt" required maxLength={4000} placeholder={t('مثلاً: پستی جذاب برای جمعه رایگان با لحن هیجانی و ۳ هشتگ', 'Write an exciting post about free Friday with 3 hashtags…', 'Ücretsiz Cuma için heyecanlı bir gönderi, 3 hashtag…', 'Напишите пост о бесплатной пятнице, 3 хэштега…')} /></label>
        <Notice error={error} />
        <button className="ops-primary" disabled={busy}>{t('ارسال به Manus', 'Send to Manus', 'Manus’a gönder', 'Отправить в Manus')}</button>
      </form>
    </Dialog>}
  </Screen>;
}
