import React from 'react';
import {
  LayoutGrid, Settings, ShieldCheck, Lock,
  Calculator, ExternalLink, PanelRightClose, PanelRightOpen, X
} from 'lucide-react';

export type SidebarView = 'scheduler';

interface MenuItemBase {
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  activeBg: string;
  activeRing: string;
  iconColor: string;
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
      { id: 'scheduler', label: 'POLYMER', Icon: LayoutGrid, activeBg: 'bg-blue-600', activeRing: 'ring-blue-400', iconColor: 'text-blue-500' },
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
    ],
  },
];

const formatLockCountdown = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

interface SidebarProps {
  currentView: SidebarView;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onSelectView: (view: SidebarView) => void;
  isSettingsOpen: boolean;
  onToggleSettings: () => void;
  settingsDisabled?: boolean;
  isSecurityModalOpen?: boolean;
  onOpenSecurityModal?: () => void;
  isPolymerUnlocked?: boolean;
  lockCountdown?: number;
  onLockNow?: () => void;
  /** Di bawah 1024px sidebar jadi drawer yang menutupi layar. */
  isMobile?: boolean;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  collapsed,
  onToggleCollapsed,
  onSelectView,
  isSettingsOpen,
  onToggleSettings,
  settingsDisabled = false,
  isSecurityModalOpen = false,
  onOpenSecurityModal,
  isPolymerUnlocked = false,
  lockCountdown = 300,
  onLockNow,
  isMobile = false,
  mobileOpen = false,
  onMobileClose,
}) => {
  /* Rail ikon hanya untuk desktop. Di drawer, menu selalu tampil penuh. */
  const isRail = collapsed && !isMobile;

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
        aria-label="Navigasi Utama"
        aria-hidden={isMobile && !mobileOpen}
        className={
          isMobile
            ? `fixed top-0 right-0 bottom-0 z-[95] w-[272px] max-w-[85vw] bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 flex flex-col shadow-2xl transition-transform duration-200 ease-out ${
                mobileOpen ? 'translate-x-0' : 'translate-x-full'
              }`
            : 'sticky top-1 z-[55] self-start shrink-0 relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col shadow-sm transition-[width] duration-200 ease-out'
        }
        style={
          isMobile
            ? undefined
            : {
                width: isRail ? 58 : 236,
                height: 'calc(var(--app-viewport-height, 100vh) - 0.5rem)',
              }
        }
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
            {isMobile ? (
              <X className="w-[18px] h-[18px] shrink-0 text-slate-600 dark:text-slate-300" />
            ) : isRail ? (
              <PanelRightOpen className="w-[18px] h-[18px] shrink-0 text-slate-600 dark:text-slate-300" />
            ) : (
              <PanelRightClose className="w-[18px] h-[18px] shrink-0 text-slate-600 dark:text-slate-300" />
            )}
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
                const { Icon } = item;
                const itemClassName = `w-full flex items-center gap-2.5 rounded-xl font-black text-[12px] uppercase tracking-wide cursor-pointer transition-colors ${
                  isMobile ? 'py-3.5' : 'py-2.5'
                } ${isRail ? 'justify-center px-0' : 'px-2.5'} ${
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
                        onClick={() => {
                          onSelectView(item.id);
                          if (isMobile) onMobileClose?.();
                        }}
                        className={itemClassName}
                      >
                        {itemContent}
                      </button>
                    )}
                  </React.Fragment>
                );
              })}
            </React.Fragment>
          ))}

          {/* Pengaturan dan halaman sistem */}
          {isRail ? (
            <div className="my-1.5 mx-2 h-px bg-slate-200 dark:bg-slate-700" />
          ) : (
            <div className="px-2.5 pt-3 pb-1 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
              Pengaturan
            </div>
          )}

          <button
            type="button"
            id="nav-setting"
            disabled={settingsDisabled}
            aria-disabled={settingsDisabled}
            title={
              settingsDisabled
                ? 'Pengaturan hanya dapat diubah dari desktop'
                : isSettingsOpen
                  ? 'Tutup Pengaturan'
                  : 'Buka Pengaturan'
            }
            onClick={() => {
              if (settingsDisabled) return;
              onToggleSettings();
              if (isMobile) onMobileClose?.();
            }}
            className={`w-full flex items-center gap-2.5 rounded-xl font-black text-[12px] uppercase tracking-wide transition-colors focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-inset ${
              isMobile ? 'py-3.5' : 'py-2.5'
            } ${isRail ? 'justify-center px-0' : 'px-2.5'} ${
              settingsDisabled
                ? 'cursor-not-allowed opacity-45 text-slate-400 dark:text-slate-600'
                : isSettingsOpen
                  ? 'bg-blue-600 ring-blue-400 text-white ring-1 shadow-sm'
                  : 'cursor-pointer text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Settings
              className={`w-[18px] h-[18px] shrink-0 transition-transform duration-300 ${
                isSettingsOpen ? 'rotate-90 text-white' : 'text-blue-500'
              }`}
            />
            {!isRail && (
              <span className="flex-1 text-left">
                PENGATURAN{settingsDisabled ? ' (DESKTOP)' : ''}
              </span>
            )}
          </button>

          {onOpenSecurityModal && (
            <button
              type="button"
              id="nav-security"
              title="Password"
              onClick={() => {
                onOpenSecurityModal();
                if (isMobile) onMobileClose?.();
              }}
              className={`w-full flex items-center gap-2.5 rounded-xl font-black text-[12px] uppercase tracking-wide cursor-pointer transition-colors focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-inset ${
                isMobile ? 'py-3.5' : 'py-2.5'
              } ${isRail ? 'justify-center px-0' : 'px-2.5'} ${
                isSecurityModalOpen
                  ? 'bg-indigo-600 ring-indigo-400 text-white ring-1 shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <ShieldCheck
                className={`w-[18px] h-[18px] shrink-0 ${
                  isSecurityModalOpen ? 'text-white' : 'text-indigo-500'
                }`}
              />
              {!isRail && <span className="flex-1 text-left">PASSWORD</span>}
            </button>
          )}

          {isPolymerUnlocked && onLockNow && (
            <button
              type="button"
              id="nav-lock-now"
              title={`Kunci Sekarang (Otomatis terkunci dalam ${formatLockCountdown(lockCountdown)})`}
              onClick={() => {
                onLockNow();
                if (isMobile) onMobileClose?.();
              }}
              className={`w-full flex items-center gap-2.5 rounded-xl font-black text-[12px] uppercase tracking-wide cursor-pointer transition-colors bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/50 border border-rose-200 dark:border-rose-800/60 mt-1 ${
                isMobile ? 'py-3.5' : 'py-2.5'
              } ${isRail ? 'justify-center px-0' : 'px-2.5'}`}
            >
              <Lock className="w-[18px] h-[18px] shrink-0 text-rose-500" />
              {!isRail && (
                <>
                  <span className="flex-1 text-left">KUNCI SEKARANG</span>
                  <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-rose-200/70 dark:bg-rose-900/70 text-rose-700 dark:text-rose-200">
                    {formatLockCountdown(lockCountdown)}
                  </span>
                </>
              )}
            </button>
          )}
        </div>
      </nav>
    </>
  );
};
