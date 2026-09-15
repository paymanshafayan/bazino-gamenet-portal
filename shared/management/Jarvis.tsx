import React, { useState } from 'react';
import { useOps, useResource, Screen, Notice, Badge, SyncState } from './context';

export function JarvisConsole() {
  const { api, t } = useOps();
  const status = useResource<any>('/jarvis/status');
  const [testInput, setTestInput] = useState('');
  const [testResult, setTestResult] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function runTest() {
    setBusy(true);
    setError('');
    setTestResult(null);
    try {
      const data = await api('/jarvis/test', 'POST', { message: testInput || 'سلام جارویس، وضعیت سیستم چطوره؟' });
      setTestResult(data);
    } catch (e: any) {
      setError(e?.message || e?.code || 'test failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen
      title={t('جارویس — دستیار هوشمند مدیر', 'Jarvis — Admin AI Assistant', 'Jarvis — Yönetici AI', 'Джарвис — ИИ-помощник')}
      subtitle={t(
        'جارویس به ۳۴ مهارت برای مدیریت تورنمنت، بلاگ، اسلایدر، پیامک، تیکت و ... مجهز است. وضعیت اتصال و تست سریع را اینجا ببینید.',
        'Jarvis has 34 skills for tournaments, blog, sliders, messaging, tickets, etc. Check connection status and run a quick test here.',
        'Jarvis turnuva, blog, slider, mesaj, bilet vb. için 34 yeteneğe sahip. Bağlantı durumunu ve hızlı testi burada görün.',
        'У Jarvis 34 навыка для турниров, блога, слайдера, сообщений, тикетов и т.д. Статус и быстрый тест — здесь.'
      )}
      actions={<SyncState lastSync={status.lastSync} error={status.error} />}
    >
      <Notice error={error || (status.error as any)} />
      <div className="ops-grid">
        <article className="ops-card">
          <h3>{t('وضعیت جارویس', 'Jarvis status', 'Jarvis durumu', 'Статус Jarvis')}</h3>
          <p className="ops-small ops-muted">
            {t('اتصال به Groq / OpenRouter / Gemini و تعداد مهارت‌های فعال', 'Groq / OpenRouter / Gemini connection and active skills count', 'Groq / OpenRouter / Gemini bağlantısı ve aktif yetenek sayısı', 'Подключение Groq / OpenRouter / Gemini и активные навыки')}
          </p>
          <pre className="ops-code" style={{ whiteSpace: 'pre-wrap', maxHeight: 240, overflow: 'auto' }}>
            {JSON.stringify(status.data || {}, null, 2)}
          </pre>
          <div className="ops-actions">
            <button onClick={() => status.reload()} disabled={busy}>{t('بروزرسانی', 'Refresh', 'Yenile', 'Обновить')}</button>
          </div>
        </article>

        <article className="ops-card">
          <h3>{t('تست سریع', 'Quick test', 'Hızlı test', 'Быстрый тест')}</h3>
          <div className="ops-form-grid">
            <label className="ops-span">
              {t('پیام تست', 'Test message', 'Test mesajı', 'Тестовое сообщение')}
              <input
                value={testInput}
                onChange={e => setTestInput(e.target.value)}
                placeholder={t('مثلاً: لیست تورنمنت‌های فعال را بده', 'e.g. list active tournaments', 'örn. aktif turnuvaları listele', 'напр. список активных турниров')}
              />
            </label>
          </div>
          <div className="ops-actions">
            <button className="ops-primary" onClick={runTest} disabled={busy}>
              {busy ? t('در حال اجرا...', 'Running...', 'Çalışıyor...', 'Выполняется...') : t('اجرای تست', 'Run test', 'Testi çalıştır', 'Запустить тест')}
            </button>
          </div>
          {testResult && (
            <pre className="ops-code" style={{ whiteSpace: 'pre-wrap', marginTop: 12, maxHeight: 360, overflow: 'auto' }}>
              {JSON.stringify(testResult, null, 2)}
            </pre>
          )}
        </article>

        <article className="ops-card">
          <h3>{t('مهارت‌های جارویس (۳۴ مورد)', 'Jarvis skills (34)', 'Jarvis yetenekleri (34)', 'Навыки Jarvis (34)')}</h3>
          <ul className="ops-small" style={{ lineHeight: 1.8 }}>
            <li><Badge tone="good">tournaments</Badge> — {t('ساخت/ویرایش/حذف تورنمنت، ثبت نتیجه، چک‌این', 'create/edit/delete tournament, results, check-in', 'turnuva oluştur/düzenle/sil, sonuç, check-in', 'создать/изменить/удалить турнир, результаты, check-in')}</li>
            <li><Badge tone="good">blog</Badge> — {t('نوشتن و انتشار مقاله بلاگ', 'write & publish blog article', 'blog yazısı yaz ve yayınla', 'написать и опубликовать статью')}</li>
            <li><Badge tone="good">slider</Badge> — {t('مدیریت اسلایدر صفحه اصلی و اپ', 'home & app slider management', 'ana sayfa ve uygulama slider yönetimi', 'управление слайдером')}</li>
            <li><Badge tone="good">cafe/shop/systems</Badge> — {t('مدیریت منو و موجودی', 'menu & stock management', 'menü ve stok yönetimi', 'управление меню и запасами')}</li>
            <li><Badge tone="info">messaging/tickets/wallet</Badge> — {t('پیامک گروهی، تیکت، کیف پول', 'bulk SMS, tickets, wallet', 'toplu SMS, bilet, cüzdan', 'рассылки, тикеты, кошелёк')}</li>
          </ul>
          <p className="ops-small ops-muted">
            {t('برای لیست کامل، به مستندات جارویس مراجعه کنید.', 'See Jarvis docs for full list.', 'Tam liste için Jarvis belgelerine bakın.', 'Полный список — в документации Jarvis.')}
          </p>
        </article>
      </div>
    </Screen>
  );
}
