import { motion } from 'motion/react';
import {
  HouseIcon, CalendarBlankIcon, UsersIcon, FolderOpenIcon, UserIcon, GearIcon,
  SparkleIcon, CaretLineLeftIcon, CaretLineRightIcon,
} from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import type { TabId, NavItem } from '../types';

interface SidebarProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen?: boolean;
}

const ICONS: Record<TabId, React.ElementType> = {
  home: HouseIcon,
  calendar: CalendarBlankIcon,
  clients: UsersIcon,
  documents: FolderOpenIcon,
  profile: UserIcon,
  settings: GearIcon,
};

function NavButton({
  item,
  active,
  isCollapsed,
  onClick,
}: {
  item: NavItem;
  active: boolean;
  isCollapsed: boolean;
  onClick: () => void;
}) {
  const Icon = ICONS[item.id];
  return (
    <button
      onClick={onClick}
      title={isCollapsed ? item.label : undefined}
      className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-md text-sm font-medium transition-colors duration-200 ${
        active
          ? 'bg-primary-tint text-primary'
          : 'text-text-secondary hover:bg-surface-hover'
      } ${isCollapsed ? 'justify-center' : ''}`}
    >
      <Icon size={20} weight={active ? 'fill' : 'regular'} className="shrink-0" />
      {!isCollapsed && <span className="truncate">{item.label}</span>}
    </button>
  );
}

export default function Sidebar({ activeTab, onTabChange, isCollapsed, onToggleCollapse, isMobileOpen }: SidebarProps) {
  const { t } = useTranslation();

  const navItems: NavItem[] = [
    { id: 'home', label: t('nav.home') },
    { id: 'calendar', label: t('nav.calendar') },
    { id: 'clients', label: t('nav.clients') },
    { id: 'documents', label: t('nav.documents') },
  ];

  const bottomNavItems: NavItem[] = [
    { id: 'profile', label: t('nav.profile') },
    { id: 'settings', label: t('nav.settings') },
  ];

  return (
    <motion.aside
      initial={false}
      animate={{ width: isCollapsed ? 72 : 260 }}
      transition={{ type: 'spring', mass: 1, stiffness: 180, damping: 20 }}
      className={`h-screen flex flex-col bg-surface border-r border-border px-3 py-4 shrink-0
        md:relative md:translate-x-0
        fixed z-40 top-0 left-0 transition-transform duration-300
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
    >
      <div className={`flex items-center gap-2 px-2 mb-8 ${isCollapsed ? 'justify-center' : ''}`}>
        <SparkleIcon size={22} weight="fill" className="text-primary shrink-0" />
        {!isCollapsed && (
          <span className="text-lg font-semibold text-text-primary font-display">
            {t('brand.soulFlow')}
          </span>
        )}
      </div>

      <nav className="flex-1 flex flex-col gap-1">
        {navItems.map((item) => (
          <NavButton
            key={item.id}
            item={item}
            active={activeTab === item.id}
            isCollapsed={isCollapsed}
            onClick={() => onTabChange(item.id)}
          />
        ))}
      </nav>

      <div className="border-t border-border my-3" />

      <div className="flex flex-col gap-1">
        {bottomNavItems.map((item) => (
          <NavButton
            key={item.id}
            item={item}
            active={activeTab === item.id}
            isCollapsed={isCollapsed}
            onClick={() => onTabChange(item.id)}
          />
        ))}
      </div>

      {/* Кнопка сворачивания — скрыта на мобильных, там сайдбар управляется гамбургером */}
      <button
        onClick={onToggleCollapse}
        className="hidden md:flex items-center justify-center mt-3 py-2 rounded-md bg-surface-hover text-text-secondary hover:bg-border hover:text-text-primary transition-colors"
      >
        {isCollapsed ? <CaretLineRightIcon size={18} /> : <CaretLineLeftIcon size={18} />}
      </button>
    </motion.aside>
  );
}