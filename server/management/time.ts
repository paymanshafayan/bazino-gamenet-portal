/** Venue-local wall clocks are converted to UTC once, when the order is quoted. */
export const DEFAULT_TIMEZONE = 'Asia/Famagusta';
export function digits(v: unknown): string { return String(v ?? '').replace(/[۰-۹٠-٩]/g, d => String('۰۱۲۳۴۵۶۷۸۹'.includes(d) ? '۰۱۲۳۴۵۶۷۸۹'.indexOf(d) : '٠١٢٣٤٥٦٧٨٩'.indexOf(d))); }
export function zonedParts(time: number | Date, timeZone = DEFAULT_TIMEZONE) {
  const p = new Intl.DateTimeFormat('en-CA', { timeZone, year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', second:'2-digit', hourCycle:'h23' }).formatToParts(time);
  const o: any = {}; for (const x of p) if (x.type !== 'literal') o[x.type] = Number(x.value); return o;
}
export function dayAt(time: number | Date, zone = DEFAULT_TIMEZONE): string {
  const p = zonedParts(time, zone); return `${p.year}-${String(p.month).padStart(2,'0')}-${String(p.day).padStart(2,'0')}`;
}
export function plusDay(day: string, count = 1): string { return new Date(Date.parse(`${day}T12:00:00Z`)+count*86400000).toISOString().slice(0,10); }
function jalali(jy:number,jm:number,jd:number):string {
  jy += 1595; let days=-355668+365*jy+Math.floor(jy/33)*8+Math.floor(((jy%33)+3)/4)+jd+(jm<7?(jm-1)*31:((jm-7)*30)+186);
  let gy=400*Math.floor(days/146097); days%=146097;
  if(days>36524){gy+=100*Math.floor(--days/36524);days%=36524;if(days>=365)days++;}
  gy+=4*Math.floor(days/1461);days%=1461;if(days>365){gy+=Math.floor((days-1)/365);days=(days-1)%365;}
  let gd=days+1; const leap=(gy%4===0&&gy%100!==0)||gy%400===0; const months=[31,leap?29:28,31,30,31,30,31,31,30,31,30,31];let gm=1;
  while(gm<12&&gd>months[gm-1])gd-=months[gm++-1];
  return `${gy}-${String(gm).padStart(2,'0')}-${String(gd).padStart(2,'0')}`;
}
export function parseDay(raw: unknown, now = Date.now(), zone = DEFAULT_TIMEZONE): string {
  let value=digits(raw).trim();
  if (!value || /^(امروز|today|bugün|сегодня)$/i.test(value)) return dayAt(now,zone);
  if (/^(فردا|tomorrow|yarın|завтра)$/i.test(value)) return plusDay(dayAt(now,zone));
  const m=value.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if(!m) throw new Error('INVALID_DATE');
  const y=Number(m[1]),mo=Number(m[2]),d=Number(m[3]);
  if(y>=1300&&y<1500) value=jalali(y,mo,d); else value=`${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`;
  const t=Date.parse(`${value}T12:00:00Z`);
  if(!Number.isFinite(t)||new Date(t).toISOString().slice(0,10)!==value||mo<1||mo>12||d<1||d>31)throw new Error('INVALID_DATE');
  return value;
}
export function localInstant(day:string, time:string, zone=DEFAULT_TIMEZONE):number {
  const m=digits(time).match(/^(\d{1,2}):(\d{2})$/);
  if(!m||Number(m[1])>23||Number(m[2])>59)throw new Error('INVALID_TIME');
  const target=Date.parse(`${day}T${m[1].padStart(2,'0')}:${m[2]}:00Z`); let guess=target;
  if(!Number.isFinite(target))throw new Error('INVALID_DATE');
  for(let i=0;i<4;i++) { const p=zonedParts(guess,zone); const actual=Date.UTC(p.year,p.month-1,p.day,p.hour,p.minute,p.second); const delta=target-actual; if(!delta)return guess;guess+=delta; }
  throw new Error('NONEXISTENT_LOCAL_TIME');
}
export function bookingWindow(p:any, now=Date.now(), zone=DEFAULT_TIMEZONE) {
  if(p.startsAt&&p.endsAt) {
    const start=Date.parse(p.startsAt),end=Date.parse(p.endsAt);
    if(!Number.isFinite(start)||!Number.isFinite(end)||end<=start||end-start>86400000)throw new Error('INVALID_TIME_RANGE');
    return {startsAt:new Date(start).toISOString(),endsAt:new Date(end).toISOString(),date:dayAt(start,zone)};
  }
  const date=parseDay(p.date,now,zone),st=digits(p.startTime||''),et=digits(p.endTime||'');
  const start=localInstant(date,st,zone); let end=localInstant(date,et,zone);
  if(end<start)end=localInstant(plusDay(date),et,zone);
  if(end<=start||end-start>86400000)throw new Error('INVALID_TIME_RANGE');
  return {startsAt:new Date(start).toISOString(),endsAt:new Date(end).toISOString(),date};
}
export const overlaps=(a:string,b:string,c:string,d:string)=>Date.parse(a)<Date.parse(d)&&Date.parse(c)<Date.parse(b);
