import React, { useState, useMemo } from 'react';
import { L } from '../../utils/i18n';
import type { AdminSection } from '../../utils/routes';
import { pathFromAdminSection } from '../../utils/routes';
import { ADMIN_GROUPS, SECTION_ICONS, groupForSection } from './adminGroups';
import { ADMIN_SECTION_META } from '../AdminPanelTab';
import {
  LayoutDashboard,
  Gamepad2,
  Users,
  Megaphone,
  Palette,
  Brain,
  BarChart3,
  Sparkles,
  Monitor,
  Coffee,
  ShoppingBag,
  Trophy,
  Swords,
  Newspaper,
  Send,
  Ticket,
  MessageSquare,
  Mail,
  Database,
  Images,
  Smartphone,
  Sliders,
  FileClock,
  KeyRound,
  Presentation,
  LifeBuoy,
  Wallet,
  Handshake,
  MessageCircleMore,
  ChevronDown,
  ChevronUp,
  Search,
  Settings,
  X,
} from 'lucide-react';

const ICON_MAP: Record<string, React.ComponentType<any>> = {
  LayoutDashboard,
  Gamepad2,
  Users,
  Megaphone,
  Palette,
  Brain,
  BarChart3,
  Sparkles,
  Monitor,
  Coffee,
  ShoppingBag,
  Trophy,
  Swords,
  Newspaper,
  Send,
  Ticket,
  MessageSquare,
  Mail,
  Database,
  Images,
  Smartphone,
  Sliders,
  FileClock,
  KeyRound,
  Presentation,
  LifeBuoy,
  Wallet,
  Handshake,
  MessageCircleMore,
};

interface Props {
  activeSection?: AdminSection;
  active?: AdminSection;
  setActiveSection?: (s: AdminSection) => void;
  onSelect?: (s: AdminSection) => void;
  language: 'fa' | 'en' | 'ru' | 'tr';
  dir: 'rtl' | 'ltr';
  openTicketCount?: number;
  query?: string;
  setQuery?: (q: string) => void;
}

export default function AdminSidebar(props: Props) {
  const activeSection = (props.activeSection || props.active || 'dashboard') as AdminSection;
  const setActiveSection = (props.setActiveSection || props.onSelect || (()=>{})) as (s: AdminSection) => void;
  const { language, dir, openTicketCount = 0, query = '', setQuery } = props;
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>(() => {
    // همه باز به جز advanced که بسته باشد برای تمیزی
    return { advanced: true };
  });

  const activeGroup = useMemo(() => groupForSection(activeSection), [activeSection]);

  // auto-expand group containing active section
  React.useEffect(() => {
    if (activeGroup && collapsedGroups[activeGroup.id]) {
      setCollapsedGroups(prev => ({ ...prev, [activeGroup.id]: false }));
    }
  }, [activeSection]);

  const filteredGroups = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ADMIN_GROUPS;
    return ADMIN_GROUPS.map(g => {
      const matchedSections = g.sections.filter(sec => {
        const meta = ADMIN_SECTION_META[sec];
        const hay = [sec, meta.fa, meta.en, meta.ru, meta.tr, meta.keywords].join(' ').toLowerCase();
        return hay.includes(q);
      });
      if (matchedSections.length === 0) {
        const groupHay = [g.fa, g.en, g.descFa, g.descEn].join(' ').toLowerCase();
        if (!groupHay.includes(q)) return null;
        return g;
      }
      return { ...g, sections: matchedSections };
    }).filter(Boolean) as typeof ADMIN_GROUPS;
  }, [query]);

  const toggleGroup = (id: string) => {
    setCollapsedGroups(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="flex flex-col gap-3 bg-[#0e1020] border border-white/10 rounded-[20px] p-3 h-fit sticky top-4">
      {/* Header */}
      <div className="px-3 py-3 rounded-xl bg-gradient-to-br from-primary/15 to-violet-500/10 border border-white/5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary text-black flex items-center justify-center">
            <Settings className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h3 className="text-[13px] font-black text-white leading-none">
              {L(language, { fa: 'مدیریت بازینو', en: 'Bazino Control', ru: 'Управление Bazino', tr: 'Bazino Yönetim' })}
            </h3>
            <p className="text-[10px] text-white/60 mt-1 font-mono">v2 • grouped • clean</p>
          </div>
        </div>
        {setQuery && (
          <div className="relative mt-3">
            <Search className={`w-3.5 h-3.5 text-white/30 absolute top-1/2 -translate-y-1/2 ${dir === 'rtl' ? 'right-2.5' : 'left-2.5'}`} />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={L(language, { fa: 'جستجو... مثلاً کلید، تم، کافه', en: 'Search... e.g. keys, theme, cafe', ru: 'Поиск...', tr: 'Ara...' })}
              className={`w-full bg-black/40 border border-white/10 rounded-lg py-2 text-[11px] text-white placeholder:text-white/30 outline-none focus:border-primary/40 ${dir === 'rtl' ? 'pr-8 pl-3' : 'pl-8 pr-3'}`}
            />
            {query && (
              <button onClick={() => setQuery('')} className={`absolute top-1/2 -translate-y-1/2 ${dir === 'rtl' ? 'left-2' : 'right-2'} text-white/40 hover:text-white`}>
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Groups */}
      <div className="flex flex-col gap-2">
        {filteredGroups.map(group => {
          const GroupIcon = ICON_MAP[group.icon] || LayoutDashboard;
          const isCollapsed = !!collapsedGroups[group.id];
          const isActiveGroup = activeGroup?.id === group.id;
          return (
            <div key={group.id} className={`rounded-xl border transition-all ${isActiveGroup ? 'bg-white/[0.03] border-white/10' : 'bg-transparent border-transparent'}`}>
              <button
                onClick={() => toggleGroup(group.id)}
                className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-left ${dir === 'rtl' ? 'text-right' : ''} hover:bg-white/[0.04] transition-colors`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0
                    ${group.color === 'emerald' ? 'bg-emerald-500/15 text-emerald-400' : ''}
                    ${group.color === 'cyan' ? 'bg-cyan-500/15 text-cyan-400' : ''}
                    ${group.color === 'amber' ? 'bg-amber-500/15 text-amber-400' : ''}
                    ${group.color === 'violet' ? 'bg-violet-500/15 text-violet-400' : ''}
                    ${group.color === 'fuchsia' ? 'bg-fuchsia-500/15 text-fuchsia-400' : ''}
                    ${group.color === 'blue' ? 'bg-blue-500/15 text-blue-400' : ''}
                  `}>
                    <GroupIcon className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[12px] font-black text-white leading-none truncate">{L(language, { fa: group.fa, en: group.en, ru: group.ru, tr: group.tr })}</div>
                    <div className="text-[10px] text-white/40 truncate mt-1">{L(language, { fa: group.descFa, en: group.descEn, ru: group.descEn, tr: group.descEn })}</div>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-[10px] font-mono bg-white/5 text-white/40 px-1.5 py-0.5 rounded-full">{group.sections.length}</span>
                  {isCollapsed ? <ChevronDown className="w-3.5 h-3.5 text-white/30" /> : <ChevronUp className="w-3.5 h-3.5 text-white/30" />}
                </div>
              </button>

              {!isCollapsed && (
                <div className="px-2 pb-2 pt-1 flex flex-col gap-1">
                  {group.sections.map(sec => {
                    const meta = ADMIN_SECTION_META[sec];
                    const IconComp = ICON_MAP[SECTION_ICONS[sec]] || BarChart3;
                    const isActive = activeSection === sec;
                    return (
                      <button
                        key={sec}
                        onClick={() => setActiveSection(sec)}
                        className={`group flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12px] font-bold transition-all w-full text-left ${dir === 'rtl' ? 'text-right' : ''}
                          ${isActive ? 'bg-primary text-black shadow-[0_0_12px_rgba(255,184,0,0.25)]' : 'text-white/60 hover:text-white hover:bg-white/5'}
                        `}
                      >
                        <IconComp className={`w-4 h-4 shrink-0 ${isActive ? 'text-black' : 'text-white/40 group-hover:text-white/80'}`} />
                        <span className="truncate flex-1">{L(language, meta)}</span>
                        {sec === 'tickets' && openTicketCount > 0 && (
                          <span className={`text-[10px] rounded-full px-1.5 py-0.5 min-w-[18px] text-center font-black ${isActive ? 'bg-black text-primary' : 'bg-rose-500 text-white'}`}>{openTicketCount}</span>
                        )}
                        <span className={`text-[9px] font-mono opacity-40 hidden lg:inline ${isActive ? 'text-black' : ''}`} dir="ltr">{pathFromAdminSection(sec)}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer hint */}
      <div className="px-3 py-2.5 rounded-xl bg-white/[0.02] border border-white/5">
        <p className="text-[10px] leading-relaxed text-white/30">
          {L(language, {
            fa: 'نکته برای صاحب گیم‌نت: هر گروه یک کار مشخص دارد. اگر دنبال کلید API هستید برو «هوش و فنی → مرکز کلیدها». همه کلیدها یک‌جا هستند.',
            en: 'Tip for owner: each group has one job. Looking for API keys? Go to Intelligence → Keys Center. All keys in one place.',
            ru: 'Подсказка: каждая группа — одна задача. API-ключи — в «ИИ и техника → Центр ключей».',
            tr: 'İpucu: her grubun tek bir işi var. API anahtarları mı? Zeka ve Teknik → Anahtar Merkezi.',
          })}
        </p>
      </div>
    </div>
  );
}
