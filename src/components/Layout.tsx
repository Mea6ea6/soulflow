import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ListIcon, XIcon } from '@phosphor-icons/react';
import Sidebar from './Sidebar';
import type { TabId } from '../types';
import HomePage from '../pages/HomePage';
import CalendarPage from '../pages/CalendarPage';
import ClientsPage from '../pages/ClientsPage';
import DocumentsPage from '../pages/DocumentsPage';
import ProfilePage from '../pages/ProfilePage';
import SettingsPage from '../pages/SettingsPage';

const pageMap: Record<TabId, React.ComponentType> = {
  home: HomePage,
  calendar: CalendarPage,
  clients: ClientsPage,
  documents: DocumentsPage,
  profile: ProfilePage,
  settings: SettingsPage,
};

export default function Layout() {
  const [activeTab, setActiveTab] = useState<TabId>('home');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const ActivePage = pageMap[activeTab];

  const handleTabChange = (tab: TabId) => {
    setActiveTab(tab);
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-bg">
      {/* Затемнение фона на мобильных при открытом меню */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setIsMobileMenuOpen(false)}
            className="fixed inset-0 bg-black/40 z-30 md:hidden"
          />
        )}
      </AnimatePresence>

      <Sidebar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        isCollapsed={isCollapsed}
        onToggleCollapse={() => setIsCollapsed((v) => !v)}
        isMobileOpen={isMobileMenuOpen}
      />

      <main className="flex-1 overflow-y-auto">
        {/* Гамбургер — только на мобильных */}
        <div className="md:hidden flex items-center px-4 py-3 border-b border-border bg-surface sticky top-0 z-20">
          <button
            onClick={() => setIsMobileMenuOpen((v) => !v)}
            className="p-2 -ml-2 rounded-md text-text-secondary hover:bg-surface-hover"
          >
            {isMobileMenuOpen ? <XIcon size={22} /> : <ListIcon size={22} />}
          </button>
        </div>

        <div className="p-4 md:p-8 max-w-6xl mx-auto">
          <ActivePage />
        </div>
      </main>
    </div>
  );
}