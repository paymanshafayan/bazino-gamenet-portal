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
  wpMode?: boolean;
}

/**
 * WordPress admin sidebar — exact replica style
 * - width 160px, bg #1d2327
 * - menu item 34px, icon 20px, text 14px, color #eee
 * - hover: bg #2c3338, color #72aee6
 * - active: bg #3858e9 or #2271b1, color white, left border 4px #72aee6 or #00a0d2
 * - submenu: bg #2c3338, items 34px, text 13px
 * - separators: border-top #2c3338
 */
export default function AdminSidebar(props: Props) {
  const activeSection = (props.activeSection || props.active || 'dashboard') as AdminSection;
  const setActiveSection = (props.setActiveSection || props.onSelect || (()=>{})) as (s: AdminSection) => void;
  const { language, dir, openTicketCount = 0, query = '', setQuery } = props;
  const wpMode = props.wpMode !== false; // default true now — WordPress style

  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>(() => {
    return { advanced: true };
  });

  const activeGroup = useMemo(() => groupForSection(activeSection), [activeSection]);

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

  if (wpMode) {
    // WORDPRESS STYLE SIDEBAR
    return (
      <div id="adminmenumain" className="w-[160px] shrink-0 bg-[#1d2327] min-h-[calc(100vh-32px)] flex flex-col select-none" dir={dir}>
        <style>{`
          #adminmenumain { font-family: -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif; }
          .wp-menu-name { font-size: 14px; line-height: 1.4; }
          .wp-submenu-item { font-size: 13px; line-height: 1.4; }
        `}</style>

        {/* WP Search box in sidebar like WP admin */}
        {setQuery && (
          <div className="p-2 border-b border-[#2c3338]">
            <div className="relative">
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder={L(language, { fa: 'جستجوی منو...', en: 'Search menu...', ru: 'Поиск меню...', tr: 'Menü ara...' })}
                className="w-full bg-[#2c3338] border border-[#2c3338] focus:border-[#72aee6] rounded text-[12px] text-[#eee] placeholder:text-[#a7aaad] outline-none py-1.5 px-2"
              />
              {query && (
                <button onClick={() => setQuery('')} className="absolute top-1/2 -translate-y-1/2 right-1.5 text-[#a7aaad] hover:text-white">
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        )}

        <div id="adminmenu" className="flex-1 py-1">
          {filteredGroups.map((group, gi) => {
            const GroupIcon = ICON_MAP[group.icon] || LayoutDashboard;
            const isCollapsed = !!collapsedGroups[group.id];
            const isActiveGroup = activeGroup?.id === group.id;
            const hasActiveChild = group.sections.includes(activeSection);

            return (
              <div key={group.id} className={`wp-menu-group ${gi !== 0 ? 'border-t border-[#2c3338] mt-1 pt-1' : ''}`}>
                {/* Group header — like WP menu top level */}
                <button
                  onClick={() => toggleGroup(group.id)}
                  className={`wp-menu-top w-full flex items-center gap-2 px-2 py-0 h-[34px] text-left transition-colors group
                    ${dir === 'rtl' ? 'text-right flex-row-reverse' : ''}
                    ${hasActiveChild ? 'bg-[#3858e9] text-white' : isActiveGroup ? 'bg-[#2c3338] text-[#72aee6]' : 'text-[#eee] hover:bg-[#2c3338] hover:text-[#72aee6]'}
                  `}
                  style={{ borderLeft: hasActiveChild ? (dir === 'rtl' ? 'none' : '4px solid #72aee6') : '4px solid transparent', borderRight: hasActiveChild && dir === 'rtl' ? '4px solid #72aee6' : '4px solid transparent' }}
                >
                  <GroupIcon className={`w-5 h-5 shrink-0 ${hasActiveChild ? 'text-white' : 'text-[#a7aaad] group-hover:text-[#72aee6]'}`} />
                  <span className="wp-menu-name flex-1 truncate font-normal">{L(language, { fa: group.fa, en: group.en, ru: group.ru, tr: group.tr })}</span>
                  <span className="flex items-center gap-1 shrink-0">
                    <span className="text-[10px] font-mono bg-[#2c3338] text-[#a7aaad] px-1 py-0.5 rounded">{group.sections.length}</span>
                    <ChevronDown className={`w-3 h-3 text-[#a7aaad] transition-transform ${isCollapsed ? '' : 'rotate-180'}`} />
                  </span>
                </button>

                {/* Submenu — like wp-submenu */}
                {!isCollapsed && (
                  <ul className="wp-submenu bg-[#2c3338] py-1 m-0 list-none">
                    {group.sections.map(sec => {
                      const meta = ADMIN_SECTION_META[sec];
                      const IconComp = ICON_MAP[SECTION_ICONS[sec]] || BarChart3;
                      const isActive = activeSection === sec;
                      return (
                        <li key={sec} className="m-0 p-0">
                          <button
                            onClick={() => setActiveSection(sec)}
                            className={`wp-submenu-item w-full flex items-center gap-2 h-[34px] px-3 text-left transition-colors
                              ${dir === 'rtl' ? 'text-right flex-row-reverse pr-6' : 'pl-6'}
                              ${isActive ? 'bg-[#3858e9] text-white font-semibold' : 'text-[#c3c4c7] hover:text-[#72aee6] hover:bg-[#1d2327] font-normal'}
                            `}
                          >
                            <IconComp className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-[#a7aaad]'}`} />
                            <span className="truncate flex-1">{L(language, meta)}</span>
                            {sec === 'tickets' && openTicketCount > 0 && (
                              <span className={`text-[10px] rounded-full px-1.5 py-0.5 min-w-[18px] text-center font-bold ${isActive ? 'bg-white text-[#3858e9]' : 'bg-[#d63638] text-white'}`}>{openTicketCount}</span>
                            )}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer — WP style */}
        <div className="border-t border-[#2c3338] p-3">
          <p className="text-[11px] leading-[1.4] text-[#a7aaad]">
            {L(language, {
              fa: 'راهنما: برای کلید API برو «هوش و فنی → مرکز کلیدها». همه کلیدها یک‌جا هستند.',
              en: 'Tip: API keys? Go to Intelligence → Keys Center.',
              ru: 'Подсказка: API-ключи — в «ИИ и техника → Центр ключей».',
              tr: 'İpucu: API anahtarları Zeka ve Teknik → Anahtar Merkezi.',
            })}
          </p>
          <div className="mt-2 flex items-center gap-1.5 text-[10px] text-[#646970] font-mono">
            <span className="w-2 h-2 rounded-full bg-[#00a32a] inline-block"></span>
            WP-Style v2 • 160px
          </div>
        </div>
      </div>
    );
  }

  // Fallback old style (should not be used now)
  return (
    <div className="flex flex-col gap-3 bg-[#0e1020] border border-white/10 rounded-[20px] p-3 h-fit sticky top-4">
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
      </div>
    </div>
  );
}
