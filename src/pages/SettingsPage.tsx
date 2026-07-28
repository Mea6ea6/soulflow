import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { LogOut, Download, Upload, Trash2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuthHook';
import { useAppSettings, updateAppSettings } from '../hooks/useDB';
import { exportAllData, downloadExport, importAllData, clearAllData } from '../utils/exportImport';
import ChangePasswordModal from '../components/ChangePasswordModal';
import ChangeEmailModal from '../components/ChangeEmailModal';

const APP_VERSION = '0.1.0';

export default function SettingsPage() {
  const { t, i18n } = useTranslation();
  const { logout, userProfile, updateProfile } = useAuth();
  const appSettings = useAppSettings();

  const [name, setName] = useState(userProfile?.name ?? '');
  const [description, setDescription] = useState(userProfile?.description ?? '');
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [importMessage, setImportMessage] = useState<string | null>(null);

  useEffect(() => {
    if (appSettings) {
      i18n.changeLanguage(appSettings.language);
    }
  }, [appSettings, i18n]);

  const handleSaveProfile = async () => {
    await updateProfile({ name, description });
  };

  const handleThemeChange = async (theme: 'light' | 'dark') => {
    await updateAppSettings({ theme });
  };

  const handleLanguageChange = async (language: 'ru' | 'en') => {
    await updateAppSettings({ language });
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const blob = await exportAllData();
      downloadExport(blob);
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm(t('settings.importConfirm'))) {
      e.target.value = '';
      return;
    }

    try {
      await importAllData(file);
      setImportMessage(t('settings.importSuccess'));
    } catch (err) {
      setImportMessage(err instanceof Error ? err.message : t('settings.importError'));
    } finally {
      e.target.value = '';
    }
  };

  const handleClearData = async () => {
    if (!confirm(t('settings.clearConfirm'))) return;
    if (!confirm(t('settings.clearConfirmAgain'))) return;
    await clearAllData();
    window.location.reload();
  };

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold text-gray-800 dark:text-gray-100 mb-6">
        {t('settings.title')}
      </h1>

      <div className="flex flex-col gap-8">
        {/* Профиль */}
        <section>
          <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-3">
            {t('settings.profileSection')}
          </h2>
          <div className="flex flex-col gap-3">
            <div>
              <label className="text-sm text-gray-600 dark:text-gray-400 mb-1 block">
                {t('settings.fullName')}
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  onClick={handleSaveProfile}
                  disabled={name === userProfile?.name}
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium"
                >
                  {t('common.save')}
                </button>
              </div>
            </div>

            <div>
              <label className="text-sm text-gray-600 dark:text-gray-400 mb-1 block">
                {t('auth.email')}
              </label>
              <div className="flex items-center justify-between px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                <span className="text-sm text-gray-700 dark:text-gray-300">{userProfile?.email}</span>
                <button
                  onClick={() => setIsEmailModalOpen(true)}
                  className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  {t('settings.changeEmail')}
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Безопасность */}
        <section>
          <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-3">
            {t('settings.securitySection')}
          </h2>
          <button
            onClick={() => setIsPasswordModalOpen(true)}
            className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            {t('settings.changePassword')}
          </button>
        </section>

        {/* Внешний вид */}
        <section>
          <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-3">
            {t('settings.appearanceSection')}
          </h2>
          <div className="flex gap-2">
            <button
              onClick={() => handleThemeChange('light')}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                appSettings?.theme === 'light'
                  ? 'border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300'
                  : 'border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              {t('settings.light')}
            </button>
            <button
              onClick={() => handleThemeChange('dark')}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                appSettings?.theme === 'dark'
                  ? 'border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300'
                  : 'border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              {t('settings.dark')}
            </button>
          </div>
        </section>

        {/* Язык */}
        <section>
          <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-3">
            {t('settings.languageSection')}
          </h2>
          <div className="flex gap-2">
            <button
              onClick={() => handleLanguageChange('ru')}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                appSettings?.language === 'ru'
                  ? 'border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300'
                  : 'border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              Русский
            </button>
            <button
              onClick={() => handleLanguageChange('en')}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                appSettings?.language === 'en'
                  ? 'border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300'
                  : 'border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              English
            </button>
          </div>
        </section>

        {/* О приложении */}
        <section>
          <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-3">
            {t('settings.aboutSection')}
          </h2>
          <label className="text-sm text-gray-600 dark:text-gray-400 mb-1 block">
            {t('settings.description')}
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none mb-2"
          />
          <button
            onClick={handleSaveProfile}
            disabled={description === userProfile?.description}
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium"
          >
            {t('common.save')}
          </button>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-3">
            {t('settings.version')}: {APP_VERSION}
          </p>
        </section>

        {/* Данные */}
        <section>
          <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-3">
            {t('settings.dataSection')}
          </h2>
          <div className="flex flex-col gap-2">
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 w-fit"
            >
              <Download size={16} />
              {t('settings.exportData')}
            </button>

            <label className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 w-fit cursor-pointer">
              <Upload size={16} />
              {t('settings.importData')}
              <input type="file" accept=".json" onChange={handleImport} className="hidden" />
            </label>

            {importMessage && (
              <p className="text-sm text-gray-600 dark:text-gray-400">{importMessage}</p>
            )}

            <button
              onClick={handleClearData}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-red-200 dark:border-red-900 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 w-fit"
            >
              <Trash2 size={16} />
              {t('settings.clearData')}
            </button>
          </div>
        </section>

        {/* Выйти */}
        <section>
          <button
            onClick={logout}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 text-sm font-medium hover:bg-red-100 dark:hover:bg-red-500/20"
          >
            <LogOut size={16} />
            {t('auth.logout')}
          </button>
        </section>
      </div>

      {isPasswordModalOpen && <ChangePasswordModal onClose={() => setIsPasswordModalOpen(false)} />}
      {isEmailModalOpen && <ChangeEmailModal onClose={() => setIsEmailModalOpen(false)} />}
    </div>
  );
}