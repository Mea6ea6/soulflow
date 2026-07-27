import { useState } from 'react';
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
  const ActivePage = pageMap[activeTab];

  return (
    <div className="flex bg-gray-50 dark:bg-gray-950 min-h-screen">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="flex-1 p-8 overflow-y-auto">
        <ActivePage />
      </main>
    </div>
  );
}