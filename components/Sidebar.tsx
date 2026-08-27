import React, { useState, useRef, useEffect } from 'react';
import {
  LayoutGrid, Activity, Database, Calendar, CalendarDays, Wallet, FileText, Settings,
  ArrowRightLeft, Calculator, ExternalLink, ChevronDown, PanelRightClose, PanelRightOpen, X
} from 'lucide-react';
import { GroupKey, ALL_GROUPS } from './Jadwal';

export type SidebarView = 'scheduler' | 'demonomer' | 'silo' | 'jadwalShift' | 'jadwal' | 'kas' | 'catatan' | 'unitConverter';

/** View yang punya sub-menu grup shift. */
export type GroupedView = 'jadwal' | 'kas';

interface MenuItemBase {
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  activeBg: string;
  activeRing: string;
  iconColor: string;
  hasGroups?: boolean;
}

interface InternalMenuItem extends MenuItemBase {
  id: SidebarView;
}

interface ExternalMenuItem extends MenuItemBase {
  id: 'payrollCalculator';
  href: string;
}

type MenuItem = InternalMenuItem | ExternalMenuItem;

interface MenuSection {
  title: string;
  items: MenuItem[];
}

/* Kelas Tailwind sengaja ditulis literal — Tailwind v4 memindai teks sumber,
   string yang dirakit saat runtime tidak akan ikut ter-generate. */
const SECTIONS: MenuSection[] = [
  {
    title: 'Proses',
    items: [
      { id: 'scheduler', label: 'POLYMER',   Icon: LayoutGrid, activeBg: 'bg-blue-600', activeRing: 'ring-blue-400', iconColor: 'text-blue-500' },
      { id: 'demonomer', label: 'DEMONOMER', Icon: Activity,   activeBg: 'bg-teal-600', activeRing: 'ring-teal-400', iconColor: 'text-teal-500' },
      { id: 'silo',      label: 'SILO',      Icon: Database,   activeBg: 'bg-cyan-600', activeRing: 'ring-cyan-400', iconColor: 'text-cyan-500' },
    ],
  },
  {
    title: 'Operasional',
    items: [
      { id: 'jadwalShift', label: 'JADWAL SHIFT', Icon: CalendarDays, activeBg: 'bg-rose-500', activeRing: 'ring-rose-300', iconColor: 'text-rose-500' },
      { id: 'jadwal',  label: 'JADWAL BACKUP', Icon: Calendar, activeBg: 'bg-amber-500',   activeRing: 'ring-amber-300',   iconColor: 'text-amber-500',   hasGroups: true },
      { id: 'kas',     label: 'KAS GRUP',      Icon: Wallet,   activeBg: 'bg-violet-600',  activeRing: 'ring-violet-400',  iconColor: 'text-violet-500',  hasGroups: true },
      { id: 'catatan', label: 'CATATAN',       Icon: FileText, activeBg: 'bg-emerald-600', activeRing: 'ring-emerald-400', iconColor: 'text-emerald-500' },
    ],
  },
  {
    title: 'Alat',
    items: [
      {
        id: 'payrollCalculator',
        label: 'PAYROLL CALCULATOR',
        Icon: Calculator,
        activeBg: 'bg-sky-600',
        activeRing: 'ring-sky-400',
        iconColor: 'text-sky-500',
        href: 'https://payroll-calculator-three.vercel.app/',
      },
      {
        id: 'unitConverter',
        label: 'KONVERSI UNIT',
        Icon: ArrowRightLeft,
        activeBg: 'bg-cyan-600',
        activeRing: 'ring-cyan-400',
        iconColor: 'text-cyan-500',
      },
    ],
  },
];

const GROUP_DOT: Record<GroupKey, string> = {
  'GRUP A': 'bg-blue-600',
  'GRUP B': 'bg-emerald-600',
  'GRUP C': 'bg-purple-600',
  'GRUP D': 'bg-amber-500',
};

const GROUP_ACTIVE: Record<GroupKey, string> = {
  'GRUP A': 'bg-blue-600 text-white',
  'GRUP B': 'bg-emerald-600 text-white',
  'GRUP C': 'bg-purple-600 text-white',
  'GRUP D': 'bg-amber-500 text-slate-950',
};

interface SidebarProps {
  currentView: SidebarView;
  currentGroup: GroupKey | null;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onSelectView: (view: SidebarView) => void;
  onSelectGroup: (view: GroupedView, group: GroupKey) => void;
  isSettingsOpen: boolean;
  onToggleSettings: () => void;
  /** Di bawah 1024px sidebar jadi drawer yang menutupi layar. */
  isMobile?: boolean;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView, currentGroup, collapsed, onToggleCollapsed,
  onSelectView, onSelectGroup, isSettingsOpen, onToggleSettings,
  isMobile = false, mobileOpen = false, onMobileClose,
}) => {
  /* Rail ikon hanya untuk desktop. Di drawer, menu selalu tampil penuh. */
  const isRail = collapsed && !isMobile;

  /* Accordion: hanya satu sub-menu boleh terbuka. */
  const [openMenu, setOpenMenu] = useState<GroupedView | null>(
    currentView === 'jadwal' || currentView === 'kas' ? currentView : null
  );
  const [flyoutTop, setFlyoutTop] = useState(0);
  const navRef = useRef<HTMLElement | null>(null);

  /* Rail terlipat: sub-menu jadi flyout, tutup saat klik di luar. */
  useEffect(() => {
    if (!isRail || !openMenu) return;
    const onDocClick = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setOpenMenu(null);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [isRail, openMenu]);

  useEffect(() => {
    if (isRail) setOpenMenu(null);
  }, [isRail]);

  const handleParentClick = (item: InternalMenuItem, el: HTMLButtonElement) => {
    if (item.hasGroups) {
      /* Klik induk HANYA buka/tutup sub-menu — halaman tidak berpindah. */
      const id = item.id as GroupedView;
      if (isRail && navRef.current) {
        setFlyoutTop(el.getBoundingClientRect().top - navRef.current.getBoundingClientRect().top);
      }
      setOpenMenu(prev => (prev === id ? null : id));
      return;
    }
    /* Menu tanpa grup: sub-menu yang terbuka ikut tertutup. */
    setOpenMenu(null);
    onSelectView(item.id);
    if (isMobile) onMobileClose?.();
  };

  const handleGroupClick = (view: GroupedView, group: GroupKey) => {
    setOpenMenu(view);
    onSelectGroup(view, group);
    if (isMobile) onMobileClose?.();
  };

  const renderGroupButton = (item: MenuItem, group: GroupKey, compact: boolean) => {
    const isActive = currentView === item.id && currentGroup === group;
    return (
      <button
        key={group}
        type="button"
        onClick={() => handleGroupClick(item.id as GroupedView, group)}
        className={`w-full flex items-center gap-2 px-2.5 rounded-lg font-black uppercase tracking-wide cursor-pointer transition-colors ${
          compact ? 'py-2 text-[12px]' : isMobile ? 'py-3 text-[12px]' : 'py-2 text-[11px]'
        } ${
          isActive
            ? GROUP_ACTIVE[group]
            : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
        }`}
      >
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isActive ? 'bg-white' : GROUP_DOT[group]}`} />
        {group}
      </button>
    );
  };

  const flyoutItem = isRail && openMenu
    ? SECTIONS.flatMap(s => s.items).find(i => i.id === openMenu)
    : null;

  return (
    <>
      {/* Latar gelap drawer. Klik di luar menutup menu. */}
      {isMobile && (
        <div
          onClick={onMobileClose}
          aria-hidden="true"
          className={`fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm transition-opacity duration-200 ${
            mobileOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        />
      )}

    <nav
      ref={navRef}
      aria-label="Navigasi Utama"
      aria-hidden={isMobile && !mobileOpen}
      className={
        isMobile
          ? `fixed top-0 right-0 bottom-0 z-[95] w-[272px] max-w-[85vw] bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 flex flex-col shadow-2xl transition-transform duration-200 ease-out ${
              mobileOpen ? 'translate-x-0' : 'translate-x-full'
            }`
          : 'sticky top-1 self-start shrink-0 relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col shadow-sm transition-[width] duration-200 ease-out'
      }
      style={isMobile ? undefined : {
        width: isRail ? 58 : 236,
        height: 'calc(var(--app-viewport-height, 100vh) - 0.5rem)',
      }}
    >
      {/* Tombol lipat */}
      <div className="shrink-0 p-2 border-b border-slate-200 dark:border-slate-800">
        <button
          type="button"
          onClick={isMobile ? onMobileClose : onToggleCollapsed}
          title={isMobile ? 'Tutup menu' : isRail ? 'Tampilkan menu' : 'Sembunyikan menu'}
          className={`w-full flex items-center gap-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 cursor-pointer ${
            isRail ? 'justify-center px-0 py-2' : 'px-2.5 py-3 lg:py-2'
          }`}
        >
          {isMobile
            ? <X className="w-[18px] h-[18px] shrink-0 text-slate-600 dark:text-slate-300" />
            : isRail
              ? <PanelRightOpen className="w-[18px] h-[18px] shrink-0 text-slate-600 dark:text-slate-300" />
              : <PanelRightClose className="w-[18px] h-[18px] shrink-0 text-slate-600 dark:text-slate-300" />}
          {!isRail && (
            <span className="text-[12px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">
              {isMobile ? 'Tutup' : 'Sembunyikan'}
            </span>
          )}
        </button>
      </div>

      {/* Daftar menu */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-2 flex flex-col gap-0.5">
        {SECTIONS.map(section => (
          <React.Fragment key={section.title}>
            {isRail ? (
              <div className="my-1.5 mx-2 h-px bg-slate-200 dark:bg-slate-700" />
            ) : (
              <div className="px-2.5 pt-3 pb-1 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                {section.title}
              </div>
            )}

            {section.items.map(item => {
              const isActive = currentView === item.id;
              const isExpanded = openMenu === item.id;
              const { Icon } = item;
              const itemClassName = `w-full flex items-center gap-2.5 rounded-xl font-black text-[12px] uppercase tracking-wide cursor-pointer transition-colors ${
                isMobile ? 'py-3.5' : 'py-2.5'
              } ${
                isRail ? 'justify-center px-0' : 'px-2.5'
              } ${
                isActive
                  ? `${item.activeBg} ${item.activeRing} text-white ring-1 shadow-sm`
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`;
              const itemContent = (
                <>
                  <Icon className={`w-[18px] h-[18px] shrink-0 ${isActive ? 'text-white' : item.iconColor}`} />
                  {!isRail && (
                    <>
                      <span className="flex-1 text-left">{item.label}</span>
                      {'href' in item ? (
                        <ExternalLink
                          aria-hidden="true"
                          className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-slate-500"
                        />
                      ) : item.hasGroups ? (
                        <ChevronDown
                          className={`w-4 h-4 shrink-0 transition-transform duration-200 ${
                            isExpanded ? '' : '-rotate-90'
                          } ${isActive ? 'text-white' : 'text-slate-400'}`}
                        />
                      ) : null}
                    </>
                  )}
                </>
              );

              return (
                <React.Fragment key={item.id}>
                  {'href' in item ? (
                    <a
                      id={`nav-${item.id}`}
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={`${item.label} — buka di tab baru`}
                      aria-label={`${item.label} — buka di tab baru`}
                      onClick={() => {
                        setOpenMenu(null);
                        if (isMobile) onMobileClose?.();
                      }}
                      className={itemClassName}
                    >
                      {itemContent}
                    </a>
                  ) : (
                    <button
                      type="button"
                      id={`nav-${item.id}`}
                      title={item.label}
                      onClick={(e) => handleParentClick(item, e.currentTarget)}
                      className={itemClassName}
                    >
                      {itemContent}
                    </button>
                  )}

                  {/* Sub-menu grup shift */}
                  {item.hasGroups && isExpanded && !isRail && (
                    <div className="ml-4 mt-1 mb-1 pl-2.5 border-l-2 border-slate-200 dark:border-slate-700 flex flex-col gap-0.5">
                      {ALL_GROUPS.map(g => renderGroupButton(item, g, false))}
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </React.Fragment>
        ))}

        {/* Sistem */}
        {isRail ? (
          <div className="my-1.5 mx-2 h-px bg-slate-200 dark:bg-slate-700" />
        ) : (
          <div className="px-2.5 pt-3 pb-1 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
            Sistem
          </div>
        )}
        <button
          type="button"
          id="nav-setting"
          title={isSettingsOpen ? 'Tutup Pengaturan' : 'Buka Pengaturan'}
          onClick={() => {
            setOpenMenu(null);
            onToggleSettings();
            /* Tanpa ini modal pengaturan terbuka di balik drawer. */
            if (isMobile) onMobileClose?.();
          }}
          className={`w-full flex items-center gap-2.5 rounded-xl font-black text-[12px] uppercase tracking-wide cursor-pointer transition-colors ${
                      isMobile ? 'py-3.5' : 'py-2.5'
                    } ${
            isRail ? 'justify-center px-0' : 'px-2.5'
          } ${
            isSettingsOpen
              ? 'bg-blue-600 ring-blue-400 text-white ring-1 shadow-sm'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Settings className={`w-[18px] h-[18px] shrink-0 transition-transform duration-300 ${
            isSettingsOpen ? 'rotate-90 text-white' : 'text-blue-500'
          }`} />
          {!isRail && <span className="flex-1 text-left">PENGATURAN</span>}
        </button>
      </div>

      {/* Flyout sub-menu saat rail terlipat */}
      {flyoutItem && (
        <div
          className="absolute right-[calc(100%+8px)] z-50 w-[190px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl p-1.5"
          style={{ top: flyoutTop }}
        >
          <div className="px-2 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400">
            {flyoutItem.label}
          </div>
          {ALL_GROUPS.map(g => renderGroupButton(flyoutItem, g, true))}
        </div>
      )}
    </nav>
    </>
  );
};
