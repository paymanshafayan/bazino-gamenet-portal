import React, { useState, useMemo, useRef, useEffect } from 'react';
import { L } from '../../utils/i18n';
import type { AdminSection } from '../../utils/routes';
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
  GripVertical,
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
  width: number;
  setWidth: (w: number) => void;
}

export default function AdminSidebar(props: Props) {
  const activeSection = (props.activeSection || props.active || 'dashboard') as AdminSection;
  const setActiveSection = (props.setActiveSection || props.onSelect || (()=>{})) as (s: AdminSection) => void;
  const { language, dir, openTicketCount = 0, query = '', setQuery, width, setWidth } = props;

  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>(() => {
    return { advanced: true };
  });

  const activeGroup = useMemo(() => groupForSection(activeSection), [activeSection]);

  useEffect(() => {
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

  // Resize logic
  const isResizing = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(width);

  const onMouseDown = (e: React.MouseEvent) => {
    isResizing.current = true;
    startX.current = e.clientX;
    startWidth.current = width;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isResizing.current) return;
      const delta = dir === 'rtl' ? startX.current - e.clientX : e.clientX - startX.current;
      const newWidth = Math.min(320, Math.max(160, startWidth.current + delta));
      setWidth(newWidth);
    };
    const onMouseUp = () => {
      if (isResizing.current) {
        isResizing.current = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [dir, setWidth]);

  return (
    <div
      id="adminmenumain"
      className="shrink-0 bg-[#1d2327] min-h-[calc(100vh-32px)] flex flex-col select-none relative"
      dir={dir}
      style={{ width: `${width}px` }}
    >
      <style>{`
        #adminmenumain { font-family: -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif; }
        .menu-name { font-size: 14px; line-height: 1.4; }
        .submenu-item { font-size: 13px; line-height: 1.4; }
      `}</style>

      {/* Sidebar search - optional secondary */}
      {setQuery && (
        <div className="p-2 border-b border-[#2c3338]">
          <div className="relative">
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={L(language, { fa: 'جستجوی منو...', en: 'Search menu...', ru: 'Поиск...', tr: 'Ara...' })}
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

      <div id="adminmenu" className="flex-1 py-1 overflow-y-auto">
        {filteredGroups.map((group, gi) => {
          const GroupIcon = ICON_MAP[group.icon] || LayoutDashboard;
          const isCollapsed = !!collapsedGroups[group.id];
          const hasActiveChild = group.sections.includes(activeSection);

          return (
            <div key={group.id} className={`menu-group ${gi !== 0 ? 'border-t border-[#2c3338] mt-1 pt-1' : ''}`}>
              <button
                onClick={() => toggleGroup(group.id)}
                className={`w-full flex items-center gap-2 px-2 py-0 h-[34px] text-left transition-colors group
                  ${dir === 'rtl' ? 'text-right flex-row-reverse' : ''}
                  ${hasActiveChild ? 'bg-[#3858e9] text-white' : 'text-[#eee] hover:bg-[#2c3338] hover:text-[#72aee6]'}
                `}
                style={{ borderLeft: hasActiveChild && dir !== 'rtl' ? '4px solid #72aee6' : '4px solid transparent', borderRight: hasActiveChild && dir === 'rtl' ? '4px solid #72aee6' : '4px solid transparent' }}
                title={L(language, { fa: group.fa, en: group.en, ru: group.ru, tr: group.tr })}
              >
                <GroupIcon className={`w-5 h-5 shrink-0 ${hasActiveChild ? 'text-white' : 'text-[#a7aaad] group-hover:text-[#72aee6]'}`} />
                <span className="flex-1 truncate font-normal text-[14px]">{L(language, { fa: group.fa, en: group.en, ru: group.ru, tr: group.tr })}</span>
                <span className="flex items-center gap-1 shrink-0">
                  <span className="text-[10px] font-mono bg-[#2c3338] text-[#a7aaad] px-1 py-0.5 rounded">{group.sections.length}</span>
                  <ChevronDown className={`w-3 h-3 text-[#a7aaad] transition-transform ${isCollapsed ? '' : 'rotate-180'}`} />
                </span>
              </button>

              {!isCollapsed && (
                <ul className="bg-[#2c3338] py-1 m-0 list-none">
                  {group.sections.map(sec => {
                    const meta = ADMIN_SECTION_META[sec];
                    const IconComp = ICON_MAP[SECTION_ICONS[sec]] || BarChart3;
                    const isActive = activeSection === sec;
                    return (
                      <li key={sec} className="m-0 p-0">
                        <button
                          onClick={() => setActiveSection(sec)}
                          className={`w-full flex items-center gap-2 h-[34px] px-3 text-left transition-colors
                            ${dir === 'rtl' ? 'text-right flex-row-reverse pr-6' : 'pl-6'}
                            ${isActive ? 'bg-[#3858e9] text-white font-semibold' : 'text-[#c3c4c7] hover:text-[#72aee6] hover:bg-[#1d2327] font-normal'}
                          `}
                          title={L(language, meta)}
                        >
                          <IconComp className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-[#a7aaad]'}`} />
                          <span className="truncate flex-1 text-[13px]">{L(language, meta)}</span>
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

      {/* Resize handle */}
      <div
        onMouseDown={onMouseDown}
        className={`absolute top-0 bottom-0 w-[6px] cursor-col-resize hover:bg-[#72aee6]/30 transition-colors flex items-center justify-center group ${dir === 'rtl' ? 'left-0' : 'right-0'}`}
        title={L(language, { fa: 'بکشید برای تغییر عرض', en: 'Drag to resize', ru: 'Перетащите для изменения ширины', tr: 'Genişliği değiştirmek için sürükleyin' })}
      >
        <div className="w-[2px] h-12 bg-[#2c3338] group-hover:bg-[#72aee6] rounded-full" />
        <GripVertical className="w-3 h-3 text-[#50575e] opacity-0 group-hover:opacity-100 absolute" />
      </div>

      {/* Footer */}
      <div className="border-t border-[#2c3338] p-3">
        <p className="text-[11px] leading-[1.4] text-[#a7aaad] truncate">
          {L(language, {
            fa: `عرض: ${width}px - بکشید`,
            en: `Width: ${width}px - drag edge`,
            ru: `Ширина: ${width}px`,
            tr: `Genişlik: ${width}px`,
          })}
        </p>
      </div>
    </div>
  );
}
