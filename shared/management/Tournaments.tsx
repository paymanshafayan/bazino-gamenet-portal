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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const stations = useResource<any>('/order-context');

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
      <div className="ops-row"><h3>{tr.title}</h3><Badge tone={tr.status === 'active' || tr.status === 'upcoming' ? 'good' : 'neutral'}>{tr.status}</Badge></div>
      <p className="ops-muted">{tr.game} · {tr.startDate}</p>
      <p><Money amount={tr.registrationFee} /> · {t('تیم', 'teams', 'takım', 'команд')}: {tr.teamCount || tr.registeredTeamsCount}/{tr.maxTeams} · {t('حاضر', 'in', 'geldi', 'явка')}: {tr.checkedIn}</p>
      {tr.bracketTotal > 0 && <p className="ops-small">{t('براکت', 'Bracket', 'Bracket', 'Сетка')}: {tr.bracketDone}/{tr.bracketTotal}</p>}
      <button onClick={() => setSelected(tr.id)}>{t('مدیریت', 'Manage', 'Yönet', 'Управлять')}</button>
    </article>)}{!(list.data || []).length && <div className="ops-empty">{t('تورنومنتی نیست.', 'No tournaments.', 'Turnuva yok.', 'Турниров нет.')}</div>}</div>}

    {detail.data && <div className="ops-stack">
      <div className="ops-card">
        <div className="ops-row"><h3>{detail.data.title}</h3><button className="ops-quiet" onClick={() => setSelected('')}>×</button></div>
        <p className="ops-muted">{detail.data.game} · {detail.data.startDate} · <Money amount={detail.data.registrationFee} /></p>
        <div className="ops-actions">
          <button disabled={busy} onClick={() => act(async () => { await api(`/tournaments/${detail.data.id}/bracket`, 'POST', {}); setBracket(true); })}>{t('ساخت/بازسازی براکت', 'Generate bracket', 'Bracket oluştur', 'Создать сетку')}</button>
          <button onClick={() => setBracket(b => !b)}>{bracket ? t('بستن براکت', 'Hide bracket', 'Bracket gizle', 'Скрыть сетку') : t('نمایش براکت', 'Show bracket', 'Bracket göster', 'Показать сетку')}</button>
        </div>
        <p className="ops-small ops-muted">{t('براکت از تیم‌های حاضر و پرداخت‌شده ساخته می‌شود.', 'Bracket is built from checked-in, paid teams.', 'Bracket, gelmiş ve ödemiş takımlardan kurulur.', 'Сетка строится из явившихся оплаченных команд.')}</p>
      </div>

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
