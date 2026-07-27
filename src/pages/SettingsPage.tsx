import { LogOut } from 'lucide-react';
import { useAuth } from '../hooks/useAuthHook';

export default function SettingsPage() {
  const { logout, userProfile } = useAuth();

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-800 dark:text-gray-100 mb-6">Настройки</h1>

      {userProfile && (
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          Вы вошли как {userProfile.email}
        </p>
      )}

      <button
        onClick={logout}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 text-sm font-medium hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors"
      >
        <LogOut size={16} />
        Выйти
      </button>
    </div>
  );
}