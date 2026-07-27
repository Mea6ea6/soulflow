import { Home, Calendar, Users, FolderOpen, User, Settings, Sparkles } from 'lucide-react';
import type { TabId, NavItem } from '../types/index.tsx';

interface SidebarProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

const navItems: NavItem[] = [
  { id: 'home', label: 'Главная' },
  { id: 'calendar', label: 'Календарь' },
  { id: 'clients', label: 'Клиенты' },
  { id: 'documents', label: 'Документы' },
];

const bottomNavItems: NavItem[] = [
  { id: 'profile', label: 'Профиль' },
  { id: 'settings', label: 'Настройки' },
];

const icons: Record<TabId, React.ElementType> = {
  home: Home,
  calendar: Calendar,
  clients: Users,
  documents: FolderOpen,
  profile: User,
  settings: Settings,
};

function NavButton({ item, active, onClick }: { item: NavItem; active: boolean; onClick: () => void }) {
  const Icon = icons[item.id];
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 w-full px-4 py-2.5 rounded-lg text-sm font-medium transition-colors
        ${active
          ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300'
          : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'}`}
    >
      <Icon size={18} />
      <span>{item.label}</span>
    </button>
  );
}

export default function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  return (
    <aside className="w-64 h-screen flex flex-col bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 px-3 py-4">
      <div className="flex items-center gap-2 px-3 mb-8">
        <Sparkles className="text-indigo-600 dark:text-indigo-400" size={22} />
        <span className="text-lg font-bold text-gray-800 dark:text-gray-100">SoulFlow</span>
      </div>

      <nav className="flex-1 flex flex-col gap-1">
        {navItems.map((item) => (
          <NavButton
            key={item.id}
            item={item}
            active={activeTab === item.id}
            onClick={() => onTabChange(item.id)}
          />
        ))}
      </nav>

      <div className="border-t border-gray-200 dark:border-gray-800 my-3" />

      <div className="flex flex-col gap-1">
        {bottomNavItems.map((item) => (
          <NavButton
            key={item.id}
            item={item}
            active={activeTab === item.id}
            onClick={() => onTabChange(item.id)}
          />
        ))}
      </div>
    </aside>
  );
}