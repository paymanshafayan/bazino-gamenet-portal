import React, { useState } from 'react';
import { useOps, useResource, Screen, Notice, Money, Badge, SyncState } from './context';
import { Dialog } from './Payment';

const SCOPES = [
  ['reservation', 'رزرو ایستگاه', 'Station reservation', 'İstasyon rezervasyonu', 'Бронь станции'],
  ['cafe', 'کافه', 'Café', 'Kafe', 'Кафе'],
  ['shop', 'فروشگاه', 'Shop', 'Mağaza', 'Магазин'],
  ['tournament', 'تورنومنت', 'Tournament', 'Turnuva', 'Турнир'],
] as const;
const WEEKDAYS = [
  ['1', 'دوشنبه'], ['2', 'سه‌شنبه'], ['3', 'چهارشنبه'], ['4', 'پنجشنبه'], ['5', 'جمعه'], ['6', 'شنبه'], ['0', 'یکشنبه'],
];
const STATION_TYPES = ['PS5_VIP', 'PS5_REGULAR', 'PS4', 'PC_GAMING', 'VR', 'BILLIARDS'];

export function PromotionsConsole() {
  const { api, t, can, language } = useOps();
  const coupons = useResource<any[]>('/coupons');
  const hours = useResource<any[]>('/special-hours');
  const [tab, setTab] = useState<'coupons' | 'hours'>('coupons');
  const [edit, setEdit] = useState<any>(null);
  const [hourEdit, setHourEdit] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function act(fn: () => Promise<any>) {
    setBusy(true); setError(''); setSuccess('');
    try { await fn(); await coupons.reload(); await hours.reload(); } catch (e: any) { setError(e.code || e.message); } finally { setBusy(false); }
  }

  return <Screen title={t('کوپن‌های تخفیف و ساعات ویژه', 'Coupons & special hours', 'Kuponlar ve özel saatler', 'Купоны и специальные часы')}
    subtitle={t('کوپن‌ها در تسویهٔ رزرو/کافه/فروشگاه/تورنومنت اعمال می‌شوند؛ ساعات رایگان/نیم‌بها روی زمان بازی محاسبه می‌شود.', 'Coupons apply at checkout; free/half-price hours price play time segment-by-segment.', 'Kuponlar ödemede uygulanır; ücretsiz/yarım saatler oyun süresini dilim dilim fiyatlar.', 'Купоны применяются при оплате; бесплатные/льготные часы тарифицируют время по сегментам.')}
    actions={<SyncState lastSync={coupons.lastSync} error={coupons.error || hours.error} />}>
    <Notice error={error || coupons.error || hours.error} success={success} />
    <div className="ops-tabs" role="tablist">
      <button aria-selected={tab === 'coupons'} onClick={() => setTab('coupons')}>{t('کوپن‌های تخفیف', 'Discount coupons', 'İndirim kuponları', 'Купоны')} ({coupons.data?.length || 0})</button>
      <button aria-selected={tab === 'hours'} onClick={() => setTab('hours')}>{t('ساعات رایگان / نیم‌بها', 'Free / half-price hours', 'Ücretsiz / yarım saatler', 'Бесплатные / льготные часы')} ({hours.data?.length || 0})</button>
    </div>

    {tab === 'coupons' && <>
      {can('promotions') && <div className="ops-actions">
        <button className="ops-primary" onClick={() => setEdit({ kind: 'percent', value: 10, scopes: ['reservation'], minOrder: 0, maxUsage: 100, perUserMax: 1, active: true })}>{t('کوپن جدید', 'New coupon', 'Yeni kupon', 'Новый купон')}</button>
      </div>}
      <div className="ops-table-wrap"><table><thead><tr><th>{t('کد', 'Code', 'Kod', 'Код')}</th><th>{t('تخفیف', 'Discount', 'İndirim', 'Скидка')}</th><th>{t('بخش‌ها', 'Scopes', 'Bölümler', 'Разделы')}</th><th>{t('مصرف / سقف', 'Used / limit', 'Kullanım / limit', 'Исп. / лимит')}</th><th>{t('اعتبار', 'Validity', 'Geçerlilik', 'Срок')}</th><th>{t('وضعیت', 'Status', 'Durum', 'Статус')}</th><th></th></tr></thead>
        <tbody>{(coupons.data || []).map(c => <tr key={c.id} data-coupon-row={c.code}>
          <td><div className="ops-code">{c.code}</div>{c.ownerUsername && <Badge tone="info">{c.ownerUsername}</Badge>}</td>
          <td>{c.kind === 'percent' ? `${c.value}%` : <Money amount={c.value} />}{c.minOrder > 0 && <div className="ops-muted ops-small">{t('حداقل', 'min', 'min', 'мин')} <Money amount={c.minOrder} /></div>}</td>
          <td>{c.scopes.map((s: string) => <span key={s} style={{marginInlineEnd:4}}><Badge tone="info">{SCOPES.find(x => x[0] === s)?.[language === 'fa' ? 1 : 2] || s}</Badge></span>)}</td>
          <td>{c.usage} / {c.maxUsage} <span className="ops-muted">({t('هر کاربر', 'per user', 'kişi başı', 'на пользователя')} {c.perUserMax})</span></td>
          <td className="ops-small">{c.startsAt?.slice(0, 10)} → {c.endsAt ? c.endsAt.slice(0, 10) : '—'}</td>
          <td><Badge tone={c.active ? 'good' : 'bad'}>{c.active ? t('فعال', 'Active', 'Aktif', 'Активен') : t('غیرفعال', 'Inactive', 'Pasif', 'Выключен')}</Badge></td>
          <td><div className="ops-actions">{can('promotions') && <><button onClick={() => setEdit(c)}>{t('ویرایش', 'Edit', 'Düzenle', 'Изменить')}</button>
            <button className="ops-danger" disabled={busy} onClick={() => act(async () => { if (confirm(t('کوپن غیرفعال شود؟', 'Deactivate coupon?', 'Kupon pasiflensin mi?', 'Отключить купон?'))) await api(`/coupons/${c.id}/delete`, 'POST', {}); })}>{t('غیرفعال', 'Disable', 'Pasif', 'Выключить')}</button></>}</div></td>
        </tr>)}{!(coupons.data || []).length && <tr><td colSpan={7}>{t('کوپنی ساخته نشده است.', 'No coupons yet.', 'Henüz kupon yok.', 'Купонов нет.')}</td></tr>}</tbody></table></div>
    </>}

    {tab === 'hours' && <>
      {can('promotions') && <div className="ops-actions">
        <button className="ops-primary" onClick={() => setHourEdit({ mode: 'half', percent: 50, weekdays: [], stationTypes: [], startHour: 14, startMinute: 0, endHour: 17, endMinute: 0, active: true })}>{t('ساعت ویژه جدید', 'New special hour', 'Yeni özel saat', 'Новые специальные часы')}</button>
      </div>}
      <div className="ops-grid">{(hours.data || []).filter(h => h.name).map(h => <article className="ops-card" key={h.id} data-hour-row={h.id}>
        <div className="ops-row"><h3>{h.name}</h3><Badge tone={h.active ? 'good' : 'bad'}>{h.active ? t('فعال', 'Active', 'Aktif', 'Активен') : t('غیرفعال', 'Inactive', 'Pasif', 'Выключен')}</Badge></div>
        <p><Badge tone={h.mode === 'free' ? 'good' : h.mode === 'half' ? 'warn' : 'info'}>{h.mode === 'free' ? t('رایگان', 'Free', 'Ücretsiz', 'Бесплатно') : h.mode === 'half' ? t('نیم‌بها', 'Half price', 'Yarı fiyat', 'Полцены') : `٪${h.percent} تخفیف`}</Badge></p>
        <p className="ops-code" dir="ltr">{String(h.startHour).padStart(2, '0')}:{String(h.startMinute).padStart(2, '0')} – {String(h.endHour).padStart(2, '0')}:{String(h.endMinute).padStart(2, '0')}{h.startHour === h.endHour ? ' (24h)' : ''}</p>
        <p className="ops-small ops-muted">{h.weekdays.length ? h.weekdays.map((d: number) => WEEKDAYS.find(w => Number(w[0]) === d)?.[1]).join('، ') : t('همه روزها', 'Every day', 'Her gün', 'Ежедневно')}</p>
        <p className="ops-small ops-muted">{h.stationTypes.length ? h.stationTypes.join('، ') : t('همه ایستگاه‌ها', 'All stations', 'Tüm istasyonlar', 'Все станции')}</p>
        {can('promotions') && <div className="ops-actions"><button onClick={() => setHourEdit(h)}>{t('ویرایش', 'Edit', 'Düzenle', 'Изменить')}</button>
          <button className="ops-danger" disabled={busy} onClick={() => act(async () => { if (confirm(t('ساعت ویژه غیرفعال شود؟', 'Disable special hour?', 'Özel saat pasiflensin mi?', 'Отключить специальные часы?'))) await api(`/special-hours/${h.id}/delete`, 'POST', {}); })}>{t('حذف', 'Delete', 'Sil', 'Удалить')}</button></div>}
      </article>)}{!(hours.data || []).some(h => h.name) && <div className="ops-empty">{t('ساعت ویژه‌ای تعریف نشده است.', 'No special hours defined.', 'Özel saat tanımlı değil.', 'Специальные часы не заданы.')}</div>}</div>
    </>}

    {edit && <Dialog title={edit.id ? t('ویرایش کوپن', 'Edit coupon', 'Kupon düzenle', 'Изменить купон') : t('کوپن جدید', 'New coupon', 'Yeni kupon', 'Новый купон')} onClose={() => setEdit(null)}>
      <form onSubmit={e => { e.preventDefault(); void act(async () => { await api('/coupons', 'POST', edit); setEdit(null); setSuccess(t('کوپن ذخیره شد.', 'Coupon saved.', 'Kupon kaydedildi.', 'Купон сохранён.')); }); }}>
        <div className="ops-form-grid">
          <label>{t('کد', 'Code', 'Kod', 'Код')}<input value={edit.code || ''} required maxLength={30} onChange={e => setEdit({ ...edit, code: e.target.value })} data-coupon-code /></label>
          <label>{t('نوع', 'Type', 'Tür', 'Тип')}<select value={edit.kind} onChange={e => setEdit({ ...edit, kind: e.target.value })}><option value="percent">{t('درصدی', 'Percent', 'Yüzde', 'Процент')}</option><option value="fixed">{t('مبلغ ثابت (TL)', 'Fixed amount (TL)', 'Sabit tutar (TL)', 'Фикс. сумма')}</option></select></label>
          <label>{t('مقدار', 'Value', 'Değer', 'Значение')}<input type="number" min="0" step="0.01" required value={edit.value} onChange={e => setEdit({ ...edit, value: e.target.value })} /></label>
          <label>{t('حداقل سفارش (TL)', 'Min order (TL)', 'Min. sipariş (TL)', 'Мин. заказ')}<input type="number" min="0" step="0.01" value={edit.minOrder} onChange={e => setEdit({ ...edit, minOrder: e.target.value })} /></label>
          <label>{t('سقف مصرف کل', 'Total usage limit', 'Toplam kullanım', 'Общий лимит')}<input type="number" min="1" required value={edit.maxUsage} onChange={e => setEdit({ ...edit, maxUsage: e.target.value })} /></label>
          <label>{t('سقف هر کاربر', 'Per-user limit', 'Kişi başı limit', 'Лимит на пользователя')}<input type="number" min="1" required value={edit.perUserMax} onChange={e => setEdit({ ...edit, perUserMax: e.target.value })} /></label>
          <label>{t('شروع اعتبار', 'Valid from', 'Başlangıç', 'Действует с')}<input type="date" value={edit.startsAt ? edit.startsAt.slice(0, 10) : ''} onChange={e => setEdit({ ...edit, startsAt: e.target.value ? new Date(e.target.value).toISOString() : '' })} /></label>
          <label>{t('پایان اعتبار', 'Valid until', 'Bitiş', 'Действует до')}<input type="date" value={edit.endsAt ? edit.endsAt.slice(0, 10) : ''} onChange={e => setEdit({ ...edit, endsAt: e.target.value ? new Date(e.target.value + 'T23:59:59').toISOString() : '' })} /></label>
          <label className="ops-span">{t('بخش‌های مجاز', 'Allowed sections', 'İzinli bölümler', 'Разрешённые разделы')}
            <div className="ops-chip-selector">{SCOPES.map(([key, fa, en]) => <label key={key}><input type="checkbox" checked={edit.scopes.includes(key)} onChange={e => setEdit({ ...edit, scopes: e.target.checked ? [...edit.scopes, key] : edit.scopes.filter((s: string) => s !== key) })} />{language === 'fa' ? fa : en}</label>)}</div></label>
          <label className="ops-check"><input type="checkbox" checked={edit.active} onChange={e => setEdit({ ...edit, active: e.target.checked })} /><span>{t('فعال باشد', 'Active', 'Aktif', 'Активен')}</span></label>
        </div>
        <Notice error={error} />
        <button className="ops-primary" disabled={busy}>{t('ذخیره', 'Save', 'Kaydet', 'Сохранить')}</button>
      </form>
    </Dialog>}

    {hourEdit && <Dialog title={hourEdit.id ? t('ویرایش ساعت ویژه', 'Edit special hour', 'Özel saat düzenle', 'Изменить часы') : t('ساعت ویژه جدید', 'New special hour', 'Yeni özel saat', 'Новые часы')} onClose={() => setHourEdit(null)}>
      <form onSubmit={e => { e.preventDefault(); void act(async () => { await api('/special-hours', 'POST', hourEdit); setHourEdit(null); setSuccess(t('ساعت ویژه ذخیره شد.', 'Special hour saved.', 'Özel saat kaydedildi.', 'Часы сохранены.')); }); }}>
        <div className="ops-form-grid">
          <label className="ops-span">{t('نام', 'Name', 'Ad', 'Название')}<input required maxLength={120} value={hourEdit.name || ''} onChange={e => setHourEdit({ ...hourEdit, name: e.target.value })} placeholder={t('مثلاً ساعات رایگان جمعه', 'e.g. Free Friday hours', 'Örn. Ücretsiz Cuma', 'Напр. бесплатная пятница')} /></label>
          <label>{t('حالت', 'Mode', 'Mod', 'Режим')}<select value={hourEdit.mode} onChange={e => setHourEdit({ ...hourEdit, mode: e.target.value, percent: e.target.value === 'free' ? 100 : e.target.value === 'half' ? 50 : hourEdit.percent })}><option value="free">{t('رایگان', 'Free', 'Ücretsiz', 'Бесплатно')}</option><option value="half">{t('نیم‌بها', 'Half price', 'Yarı fiyat', 'Полцены')}</option><option value="percent">{t('درصد تخفیف', 'Discount percent', 'Yüzde indirim', 'Процент скидки')}</option></select></label>
          {hourEdit.mode === 'percent' && <label>{t('درصد', 'Percent', 'Yüzde', 'Процент')}<input type="number" min="1" max="100" required value={hourEdit.percent} onChange={e => setHourEdit({ ...hourEdit, percent: e.target.value })} /></label>}
          <label>{t('ساعت شروع', 'Start hour', 'Başlangıç saati', 'Начало')}<input type="time" required value={`${String(hourEdit.startHour).padStart(2, '0')}:${String(hourEdit.startMinute).padStart(2, '0')}`} onChange={e => { const [h, m] = e.target.value.split(':').map(Number); setHourEdit({ ...hourEdit, startHour: h, startMinute: m }); }} /></label>
          <label>{t('ساعت پایان', 'End hour', 'Bitiş saati', 'Конец')}<input type="time" required value={`${String(hourEdit.endHour).padStart(2, '0')}:${String(hourEdit.endMinute).padStart(2, '0')}`} onChange={e => { const [h, m] = e.target.value.split(':').map(Number); setHourEdit({ ...hourEdit, endHour: h, endMinute: m }); }} /><span className="ops-muted ops-small">{t('ساعت برابر = تمام شبانه‌روز', 'Equal start/end = whole day', 'Eşit saat = tüm gün', 'Равное время = сутки')}</span></label>
          <label className="ops-span">{t('روزهای هفته (خالی = همه)', 'Weekdays (empty = all)', 'Haftanın günleri (boş = hepsi)', 'Дни недели (пусто = все)')}
            <div className="ops-chip-selector">{WEEKDAYS.map(([val, fa]) => <label key={val}><input type="checkbox" checked={hourEdit.weekdays.includes(Number(val))} onChange={e => setHourEdit({ ...hourEdit, weekdays: e.target.checked ? [...hourEdit.weekdays, Number(val)] : hourEdit.weekdays.filter((d: number) => d !== Number(val)) })} />{fa}</label>)}</div></label>
          <label className="ops-span">{t('نوع ایستگاه (خالی = همه)', 'Station types (empty = all)', 'İstasyon türü (boş = hepsi)', 'Типы станций (пусто = все)')}
            <div className="ops-chip-selector">{STATION_TYPES.map(s => <label key={s}><input type="checkbox" checked={hourEdit.stationTypes.includes(s)} onChange={e => setHourEdit({ ...hourEdit, stationTypes: e.target.checked ? [...hourEdit.stationTypes, s] : hourEdit.stationTypes.filter((x: string) => x !== s) })} /><span dir="ltr">{s}</span></label>)}</div></label>
          <label className="ops-check"><input type="checkbox" checked={hourEdit.active} onChange={e => setHourEdit({ ...hourEdit, active: e.target.checked })} /><span>{t('فعال باشد', 'Active', 'Aktif', 'Активен')}</span></label>
        </div>
        <Notice error={error} />
        <button className="ops-primary" disabled={busy}>{t('ذخیره', 'Save', 'Kaydet', 'Сохранить')}</button>
      </form>
    </Dialog>}
  </Screen>;
}
