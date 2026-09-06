import React, { useState } from 'react';
import { useOps, useResource, Screen, Notice, Money, Badge, SyncState } from './context';
import { Dialog, PaymentDialog } from './Payment';
import type { Receipt } from './types';

export function TournamentsConsole() {
  const { api, t, can, language, timezone } = useOps();
  const list = useResource<any[]>('/tournaments');
  const [selected, setSelected] = useState('');
  const detail = useResource<any>(selected ? `/tournaments/${selected}` : null);
  const [reg, setReg] = useState<any>(null);
  const [bracket, setBracket] = useState(false);
  const [pay, setPay] = useState<any>(null);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [resultFor, setResultFor] = useState<any>(null);
  const [scheduleFor, setScheduleFor] = useState<any>(null);
  const [pairFor, setPairFor] = useState<any>(null);
  const [metaFor, setMetaFor] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const stations = useResource<any>('/order-context');
  const [season, setSeason] = useState<any>(null);
  React.useEffect(() => { fetch('/api/season-ranking').then(r => r.ok ? r.json() : null).then(setSeason).catch(() => {}); }, [selected]);

  const kindLabel = (k: string) => k === 'special' ? t('ویژه', 'Special', 'Özel', 'Особый') : t('هفتگی', 'Weekly', 'Haftalık', 'Еженед.');

  async function act(fn: () => Promise<any>) {
    setBusy(true); setError('');
    try { await fn(); await list.reload(); await detail.reload(); } catch (e: any) { setError(e.code || e.message); } finally { setBusy(false); }
  }

  const teamState = (tm: any) => tm.checkedIn ? <Badge tone="good">{t('حاضر', 'Checked in', 'Geldi', 'Прибыл')}</Badge> : tm.paid ? <Badge tone="warn">{t('پرداخت‌شده، نیامده', 'Paid, absent', 'Ödedi, gelmedi', 'Оплачено, нет')}</Badge> : <Badge tone="bad">{t('پرداخت‌نشده', 'Unpaid', 'Ödenmedi', 'Не оплачено')}</Badge>;

  return <Screen title={t('مدیریت مسابقات', 'Tournament management', 'Turnuva yönetimi', 'Управление турнирами')}
    subtitle={t('ثبت‌نام حضوری/آنلاین، حضور، پرداخت، براکت حذفی با BYE و ثبت نتیجه روی ایستگاه.', 'Walk-in/online registration, attendance, payment, BYE knockout bracket and station results.', 'Yerinde/çevrimiçi kayıt, yoklama, ödeme, BYE’li eleme bracketı ve istasyon sonuçları.', 'Регистрация, явка, оплата, олимпийская сетка с BYE и результаты на станциях.')}
    actions={<><SyncState lastSync={list.lastSync} error={list.error} />{can('tournaments') && <button className="ops-primary" onClick={() => setReg({})}>{t('ثبت‌نام حضوری تیم', 'Register walk-in team', 'Yerinde takım kaydı', 'Регистрация команды')}</button>}</>}>
    <Notice error={error || list.error || detail.error} />

    {!selected && <div className="ops-grid">{(list.data || []).map(tr => <article className="ops-card" key={tr.id} data-tournament-row={tr.id}>
      <div className="ops-row"><h3>{tr.title}</h3><span className="ops-row" style={{ gap: 6 }}><Badge tone={tr.kind === 'special' ? 'info' : 'good'}>{kindLabel(tr.kind || 'weekly')}</Badge><Badge tone={tr.status === 'active' || tr.status === 'upcoming' ? 'good' : 'neutral'}>{tr.status}</Badge></span></div>
      <p className="ops-muted">{tr.game} · {tr.startDate}{tr.signupMode === 'info_only' ? ` · ${t('فقط اطلاع‌رسانی', 'Info only', 'Sadece duyuru', 'Только инфо')}` : ''}</p>
      <p><Money amount={tr.registrationFee} /> · {t('تیم', 'teams', 'takım', 'команд')}: {tr.teamCount || tr.registeredTeamsCount}/{tr.maxTeams} · {t('حاضر', 'in', 'geldi', 'явка')}: {tr.checkedIn}</p>
      {tr.bracketTotal > 0 && <p className="ops-small">{t('براکت', 'Bracket', 'Bracket', 'Сетка')}: {tr.bracketDone}/{tr.bracketTotal}</p>}
      <button onClick={() => setSelected(tr.id)}>{t('مدیریت', 'Manage', 'Yönet', 'Управлять')}</button>
    </article>)}{!(list.data || []).length && <div className="ops-empty">{t('تورنومنتی نیست.', 'No tournaments.', 'Turnuva yok.', 'Турниров нет.')}</div>}</div>}

    {detail.data && <div className="ops-stack">
      <div className="ops-card">
        <div className="ops-row"><h3>{detail.data.title}</h3><button className="ops-quiet" onClick={() => setSelected('')}>×</button></div>
        <p className="ops-muted">{detail.data.game} · {detail.data.startDate} · <Money amount={detail.data.registrationFee} /> · <Badge tone={detail.data.kind === 'special' ? 'info' : 'good'}>{kindLabel(detail.data.kind || 'weekly')}</Badge>{detail.data.finalized ? ` · 🏆 ${detail.data.champion || ''}` : ''}</p>
        <div className="ops-actions">
          <button disabled={busy} onClick={() => act(async () => { await api(`/tournaments/${detail.data.id}/bracket`, 'POST', {}); setBracket(true); })}>{t('ساخت/بازسازی براکت', 'Generate bracket', 'Bracket oluştur', 'Создать сетку')}</button>
          <button onClick={() => setPairFor({ pairs: [['', '']] })}>{t('پیرینگ دستی زنده', 'Manual live pairing', 'Canlı eşleştirme', 'Ручная жеребьёвка')}</button>
          <button onClick={() => setMetaFor({ kind: detail.data.kind || 'weekly', signupMode: detail.data.signupMode || 'open', rules: detail.data.rules || '', prizes: detail.data.prizes || {} })}>{t('نوع/قوانین/جوایز', 'Kind/rules/prizes', 'Tür/kurallar/ödül', 'Тип/правила/призы')}</button>
          <button className="ops-primary" disabled={busy || !detail.data.bracket?.length} onClick={() => act(async () => { await api(`/tournaments/${detail.data.id}/finalize`, 'POST', {}); })}>{t('نهایی‌سازی و امتیاز فصل', 'Finalize & season points', 'Bitir ve puan ver', 'Завершить и начислить')}</button>
          <button onClick={() => setBracket(b => !b)}>{bracket ? t('بستن براکت', 'Hide bracket', 'Bracket gizle', 'Скрыть сетку') : t('نمایش براکت', 'Show bracket', 'Bracket göster', 'Показать сетку')}</button>
        </div>
        <p className="ops-small ops-muted">{t('براکت خودکار از تیم‌های حاضر و پرداخت‌شده؛ یا روز مسابقه با پیرینگ دستی بلافاصله روی نمایش تلویزیون زنده می‌شود. ویژه‌ها ثبت‌نام آنلاین ندارند.', 'Auto bracket from checked-in, paid teams — or do manual pairings live on match day; they go to the TV instantly. Special events have no online signup.', 'Otomatik bracket gelmiş/ödemiş takımlardan; ya da maç günü canlı eşleştirme anında TV’ye düşer. Özel turnuvalarda çevrimiçi kayıt yok.', 'Авто-сетка из явившихся оплаченных — либо ручная жеребьёвка в день матча, мгновенно на ТВ. У особых нет онлайн-регистрации.')}</p>
      </div>

      {season && <div className="ops-card">
        <h3>{t('جدول فصل', 'Season standings', 'Sezon puan durumu', 'Таблица сезона')} — {season.name} {season.year} <span className="ops-muted ops-small">({season.daysLeft} {t('روز مانده', 'days left', 'gün kaldı', 'дн. осталось')})</span></h3>
        <div className="ops-table-wrap"><table><thead><tr><th>#</th><th>{t('بازیکن', 'Player', 'Oyuncu', 'Игрок')}</th><th>W</th><th>2nd</th><th>{t('امتیاز', 'Points', 'Puan', 'Очки')}</th></tr></thead>
          <tbody>{(season.standings || []).map((s: any, i: number) => <tr key={s.playerKey}><td>{i + 1}</td><td><b>{s.name}</b></td><td>{s.wins}</td><td>{s.seconds}</td><td className="ops-money">{s.points}</td></tr>)}</tbody></table></div>
        <p className="ops-small ops-muted">{t('هفتگی ۵/۲/۱ · ویژه ۱۰/۴/۲ — فقط رتبه‌بندی، جدا از اعتبار خرید.', 'Weekly 5/2/1 · Special 10/4/2 — ranking only, separate from Credits.', 'Haftalık 5/2/1 · Özel 10/4/2 — sadece sıralama, Kredi’den ayrı.', 'Еженед. 5/2/1 · Особый 10/4/2 — только рейтинг, отдельно от кредитов.')}</p>
      </div>}

      <div className="ops-card">
        <h3>{t('تیم‌ها', 'Teams', 'Takımlar', 'Команды')} ({detail.data.teams.length})</h3>
        <div className="ops-table-wrap"><table><thead><tr><th>#</th><th>{t('تیم', 'Team', 'Takım', 'Команда')}</th><th>{t('کاپیتان', 'Captain', 'Kaptan', 'Капитан')}</th><th>{t('وضعیت', 'Status', 'Durum', 'Статус')}</th><th></th></tr></thead>
          <tbody>{detail.data.teams.map((tm: any) => <tr key={tm.teamName} data-team-row={tm.teamName}>
            <td>{tm.seed}</td><td><b>{tm.teamName}</b><div className="ops-code">{tm.orderId || ''}</div></td><td>{tm.captainName || tm.captainUsername || '—'}<div className="ops-small ops-muted">{tm.phone || ''}</div></td>
            <td>{teamState(tm)}</td>
            <td><div className="ops-actions">
              {!tm.paid && <button className="ops-primary" disabled={busy || !tm.orderId} onClick={() => setPay({ team: tm, amount: detail.data.registrationFee, orderId: tm.orderId })}>{t('دریافت وجه', 'Collect', 'Tahsil et', 'Принять оплату')}</button>}
              {tm.paid && <button disabled={busy} onClick={() => act(async () => api(`/tournaments/${detail.data.id}/checkin`, 'POST', { teamName: tm.teamName, checkedIn: !tm.checkedIn }))}>{tm.checkedIn ? t('لغو حضور', 'Undo check-in', 'Gelmedi işaretle', 'Отменить явку') : t('ثبت حضور', 'Check in', 'Giriş yap', 'Отметить явку')}</button>}
            </div></td>
          </tr>)}</tbody></table></div>
      </div>

      {bracket && detail.data.bracket?.length > 0 && <div className="ops-card">
        <h3>{t('براکت حذفی', 'Knockout bracket', 'Eleme bracketı', 'Олимпийская сетка')}</h3>
        {[...new Set<number>(detail.data.bracket.map((m: any) => Number(m.round)))].sort((a:number, b:number) => a - b).map((round:number) => <div key={round} className="ops-stack" style={{ marginBottom: 14 }}>
          <div className="ops-caption">{t('دور', 'Round', 'Tur', 'Раунд')} {round}</div>
          <div className="ops-grid">{detail.data.bracket.filter((m: any) => m.round === round).sort((a: any, b: any) => a.position - b.position).map((m: any) => <div className="ops-match" key={m.id} data-match={m.id}>
            <div className={m.winnerId === m.teamA ? 'ops-money' : ''}>{m.teamA || '—'}{m.scoreA !== undefined ? ` ${m.scoreA}` : ''}</div>
            <div className={m.winnerId === m.teamB ? 'ops-money' : ''}>{m.teamB || (m.status === 'done' ? t('BYE', 'BYE', 'BYE', 'BYE') : '—')}{m.scoreB !== undefined ? ` ${m.scoreB}` : ''}</div>
            <div className="ops-small ops-muted">{m.stationName || ''}{m.startsAt ? new Date(m.startsAt).toLocaleString(language, { timeZone: timezone, month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}</div>
            {m.teamA && m.teamB && m.status !== 'done' && <div className="ops-actions">
              <button disabled={busy} onClick={() => setScheduleFor(m)}>{t('زمان/ایستگاه', 'Schedule', 'Ayarla', 'Назначить')}</button>
              <button className="ops-primary" disabled={busy} onClick={() => setResultFor(m)}>{t('ثبت نتیجه', 'Result', 'Sonuç', 'Результат')}</button>
            </div>}
            {m.status === 'done' && !m.teamB && <Badge tone="info">BYE</Badge>}
          </div>)}</div>
        </div>)}
      </div>}
    </div>}

    {reg && <Dialog title={t('ثبت‌نام حضوری تیم', 'Register walk-in team', 'Yerinde takım kaydı', 'Регистрация команды')} onClose={() => setReg(null)}>
      <form onSubmit={e => { e.preventDefault(); void act(async () => { const r = await api(`/tournaments/${selected || reg.tournamentId}/register`, 'POST', reg); setReg(null); if (r.orderId) setPay({ team: r.team, amount: detail.data?.registrationFee || reg.fee, orderId: r.orderId }); }); }}>
        {!selected && <label>{t('تورنومنت', 'Tournament', 'Turnuva', 'Турнир')}<select required value={reg.tournamentId || ''} onChange={e => setReg({ ...reg, tournamentId: e.target.value })}><option value="">—</option>{(list.data || []).map((tr: any) => <option key={tr.id} value={tr.id}>{tr.title}</option>)}</select></label>}
        <label>{t('نام تیم', 'Team name', 'Takım adı', 'Название команды')}<input required maxLength={120} value={reg.teamName || ''} onChange={e => setReg({ ...reg, teamName: e.target.value })} data-reg-team /></label>
        <label>{t('نام کاپیتان', 'Captain name', 'Kaptan adı', 'Имя капитана')}<input maxLength={120} value={reg.captainName || ''} onChange={e => setReg({ ...reg, captainName: e.target.value })} /></label>
        <label>{t('تلفن', 'Phone', 'Telefon', 'Телефон')}<input dir="ltr" maxLength={30} value={reg.phone || ''} onChange={e => setReg({ ...reg, phone: e.target.value })} /></label>
        <Notice error={error} />
        <button className="ops-primary" disabled={busy}>{t('ثبت و ادامه به دریافت وجه', 'Register & collect', 'Kaydet ve tahsil et', 'Зарегистрировать и к оплате')}</button>
      </form>
    </Dialog>}

    {pay && <PaymentDialog title={t('دریافت ورودی تورنومنت', 'Tournament entry payment', 'Turnuva kayıt ödemesi', 'Оплата участия')} amount={pay.amount} onClose={() => setPay(null)} onSubmit={async b => {
      const r = await api(`/onsite-orders/${pay.orderId}/settle`, 'POST', b);
      setReceipt(r.receipt || null); setPay(null);
      await detail.reload();
    }} />}
    {receipt && <ReceiptViewWrapper receipt={receipt} onClose={() => setReceipt(null)} />}

    {resultFor && <Dialog title={t('ثبت نتیجه', 'Enter result', 'Sonuç gir', 'Результат матча')} onClose={() => setResultFor(null)}>
      <form onSubmit={e => { e.preventDefault(); void act(async () => { await api(`/tournaments/${detail.data.id}/matches/${resultFor.id}/result`, 'POST', { scoreA: resultFor.scoreA, scoreB: resultFor.scoreB }); setResultFor(null); }); }}>
        <div className="ops-form-grid">
          <label>{resultFor.teamA}<input type="number" min="0" required value={resultFor.scoreA ?? ''} onChange={e => setResultFor({ ...resultFor, scoreA: e.target.value })} data-score-a /></label>
          <label>{resultFor.teamB}<input type="number" min="0" required value={resultFor.scoreB ?? ''} onChange={e => setResultFor({ ...resultFor, scoreB: e.target.value })} data-score-b /></label>
        </div>
        <p className="ops-muted ops-small">{t('تساوی مجاز نیست؛ برنده به دور بعد صعود می‌کند.', 'Draws are not allowed; the winner advances.', 'Beraberlik yok; kazanan tur atlar.', 'Ничья не допускается; победитель проходит дальше.')}</p>
        <Notice error={error} />
        <button className="ops-primary" disabled={busy}>{t('ثبت', 'Save', 'Kaydet', 'Сохранить')}</button>
      </form>
    </Dialog>}

    {metaFor && <Dialog title={t('نوع، قوانین و جوایز رویداد', 'Kind, rules & prizes', 'Tür, kurallar ve ödüller', 'Тип, правила, призы')} onClose={() => setMetaFor(null)}>
      <form onSubmit={e => { e.preventDefault(); void act(async () => { await api(`/tournaments/${detail.data.id}/meta`, 'POST', { kind: metaFor.kind, signupMode: metaFor.signupMode, rules: metaFor.rules, prizes: metaFor.prizes }); setMetaFor(null); }); }}>
        <label>{t('نوع رویداد', 'Event kind', 'Etkinlik türü', 'Тип события')}
          <select value={metaFor.kind} onChange={e => setMetaFor({ ...metaFor, kind: e.target.value })}>
            <option value="weekly">{t('هفتگی', 'Weekly', 'Haftalık', 'Еженедельный')}</option>
            <option value="special">{t('ویژه (امتیاز ۱۰/۴/۲)', 'Special (10/4/2)', 'Özel (10/4/2)', 'Особый (10/4/2)')}</option>
          </select></label>
        <label>{t('وضعیت ثبت‌نام', 'Signup', 'Kayıt', 'Регистрация')}
          <select value={metaFor.signupMode} onChange={e => setMetaFor({ ...metaFor, signupMode: e.target.value })}>
            <option value="open">{t('ثبت‌نام باز', 'Open registration', 'Kayıt açık', 'Регистрация открыта')}</option>
            <option value="info_only">{t('فقط اطلاع‌رسانی (بدون ثبت‌نام آنلاین)', 'Info only (no online signup)', 'Sadece duyuru', 'Только инфо')}</option>
          </select></label>
        <label>{t('قوانین رویداد', 'Event rules', 'Kurallar', 'Правила')}
          <textarea rows={4} value={metaFor.rules || ''} onChange={e => setMetaFor({ ...metaFor, rules: e.target.value })} data-event-rules /></label>
        <div className="ops-form-grid">
          <label>🥇 {t('جایزه اول', '1st prize', '1.lik ödülü', '1-е место')}<input value={metaFor.prizes?.first || ''} onChange={e => setMetaFor({ ...metaFor, prizes: { ...metaFor.prizes, first: e.target.value } })} data-prize-first /></label>
          <label>🥈 {t('جایزه دوم', '2nd prize', '2.lik ödülü', '2-е место')}<input value={metaFor.prizes?.second || ''} onChange={e => setMetaFor({ ...metaFor, prizes: { ...metaFor.prizes, second: e.target.value } })} /></label>
          <label>🥉 {t('جایزه سوم', '3rd prize', '3.lük ödülü', '3-е место')}<input value={metaFor.prizes?.third || ''} onChange={e => setMetaFor({ ...metaFor, prizes: { ...metaFor.prizes, third: e.target.value } })} /></label>
        </div>
        <Notice error={error} />
        <button className="ops-primary" disabled={busy}>{t('ذخیره', 'Save', 'Kaydet', 'Сохранить')}</button>
      </form>
    </Dialog>}

    {pairFor && <Dialog title={t('پیرینگ دستی زنده', 'Manual live pairing', 'Canlı eşleştirme', 'Ручная жеребьёвка')} onClose={() => setPairFor(null)}>
      <p className="ops-muted ops-small">{t('نام تیم‌ها را جفت‌به‌جفت وارد کنید؛ BYE و صعود خودکار انجام و بلافاصله روی تلویزیون پخش می‌شود. حداکثر ۳۲ بازیکن/تیم.', 'Enter team names pair by pair; BYEs and auto-advance are handled and pushed live to the TV instantly. Up to 32 players/teams.', 'Takımları çift çift girin; BYE ve otomatik tur atlama yapılır ve anında TV’ye yansır. En fazla 32.', 'Вводите команды парами; BYE и авто-проход обрабатываются и сразу идут на ТВ. До 32 игроков.')}</p>
      <form onSubmit={e => { e.preventDefault(); void act(async () => {
        const pairs = pairFor.pairs.map((p: string[]) => [p[0]?.trim(), p[1]?.trim()].filter(Boolean)).filter((p: string[]) => p.length);
        await api(`/tournaments/${detail.data.id}/pair`, 'POST', { pairs });
        setPairFor(null); setBracket(true);
      }); }}>
        {pairFor.pairs.map((p: string[], i: number) => <div key={i} className="ops-form-grid" style={{ alignItems: 'end' }}>
          <label>{i + 1} - A<input value={p[0] || ''} data-pair-a onChange={e => { const cp = [...pairFor.pairs]; cp[i] = [e.target.value, p[1] || '']; setPairFor({ ...pairFor, pairs: cp }); }} placeholder="Team / player" /></label>
          <label>B<input value={p[1] || ''} data-pair-b onChange={e => { const cp = [...pairFor.pairs]; cp[i] = [p[0] || '', e.target.value]; setPairFor({ ...pairFor, pairs: cp }); }} placeholder="Team / BYE (boş = BYE)" /></label>
          <button type="button" className="ops-quiet" onClick={() => setPairFor({ ...pairFor, pairs: pairFor.pairs.filter((_: any, j: number) => j !== i) })}>×</button>
        </div>)}
        <div className="ops-actions">
          <button type="button" onClick={() => setPairFor({ ...pairFor, pairs: [...pairFor.pairs, ['', '']] })}>{t('افزودن جفت', 'Add pair', 'Çift ekle', 'Добавить пару')}</button>
        </div>
        <Notice error={error} />
        <button className="ops-primary" disabled={busy}>{t('ساخت براکت و پخش زنده', 'Draw & go live', 'Kur ve yayına al', 'Сыграть вживую')}</button>
      </form>
    </Dialog>}

    {scheduleFor && <Dialog title={t('زمان و ایستگاه بازی', 'Match time & station', 'Maç saati ve istasyon', 'Время и станция')} onClose={() => setScheduleFor(null)}>
      <form onSubmit={e => { e.preventDefault(); void act(async () => { await api(`/tournaments/${detail.data.id}/matches/${scheduleFor.id}/schedule`, 'POST', { stationId: scheduleFor.stationId, startsAt: scheduleFor.startsAt, endsAt: scheduleFor.endsAt }); setScheduleFor(null); }); }}>
        <label>{t('ایستگاه', 'Station', 'İstasyon', 'Станция')}<select required value={scheduleFor.stationId || ''} onChange={e => setScheduleFor({ ...scheduleFor, stationId: e.target.value })}><option value="">—</option>{(stations.data?.stations || []).map((s: any) => <option key={s.id} value={s.id}>{s.data.name}</option>)}</select></label>
        <label>{t('شروع', 'Start', 'Başlangıç', 'Начало')}<input type="datetime-local" required value={scheduleFor.startsAtLocal || ''} onChange={e => setScheduleFor({ ...scheduleFor, startsAtLocal: e.target.value, startsAt: new Date(e.target.value).toISOString() })} /></label>
        <label>{t('پایان', 'End', 'Bitiş', 'Конец')}<input type="datetime-local" value={scheduleFor.endsAtLocal || ''} onChange={e => setScheduleFor({ ...scheduleFor, endsAtLocal: e.target.value, endsAt: new Date(e.target.value).toISOString() })} /></label>
        <Notice error={error} />
        <button className="ops-primary" disabled={busy}>{t('ثبت', 'Save', 'Kaydet', 'Сохранить')}</button>
      </form>
    </Dialog>}
  </Screen>;
}

// Wrapper to avoid a circular import concern; ReceiptView lives in Payment.tsx.
import { ReceiptView } from './Payment';
function ReceiptViewWrapper({ receipt, onClose }: { receipt: Receipt; onClose: () => void }) {
  return <ReceiptView receipt={receipt} onClose={onClose} />;
}
