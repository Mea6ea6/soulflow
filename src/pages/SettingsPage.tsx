import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { SignOutIcon, DownloadSimpleIcon, UploadSimpleIcon, TrashIcon } from '@phosphor-icons/react';
import { useAuth } from '../hooks/useAuthHook';
import { useTheme } from '../context/useThemeHook';
import { useToast } from '../hooks/useToastHook';
import { useAppSettings, updateAppSettings } from '../hooks/useDB';
import { exportAllData, downloadExport, importAllData, clearAllData } from '../utils/exportImport';
import type { ThemeId } from '../types';
import ChangePasswordModal from '../components/ChangePasswordModal';
import ChangeEmailModal from '../components/ChangeEmailModal';

const APP_VERSION = '0.1.0';

const THEMES: { id: ThemeId; labelKey: string }[] = [
  { id: 'aurora', labelKey: 'settings.themeAurora' },
  { id: 'dawn', labelKey: 'settings.themeDawn' },
  { id: 'dusk', labelKey: 'settings.themeDusk' },
  { id: 'ink', labelKey: 'settings.themeInk' },
  { id: 'hearth', labelKey: 'settings.themeHearth' },
];

export default function SettingsPage() {
  const { t, i18n } = useTranslation();
  const { logout, userProfile, updateProfile } = useAuth();
  const { theme, setTheme } = useTheme();
  const { showToast } = useToast();
  const appSettings = useAppSettings();

  const [name, setName] = useState(userProfile?.name ?? '');
  const [description, setDescription] = useState(userProfile?.description ?? '');
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    if (appSettings) {
      i18n.changeLanguage(appSettings.language);
    }
  }, [appSettings, i18n]);

  const handleSaveProfile = async () => {
    await updateProfile({ name, description });
    showToast('success', t('common.save'));
  };

  const handleThemeChange = (newTheme: ThemeId) => {
    setTheme(newTheme);
  };

  const handleLanguageChange = async (language: 'ru' | 'en') => {
    await updateAppSettings({ language });
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const blob = await exportAllData();
      downloadExport(blob);
      showToast('success', t('settings.exportData'));
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
      showToast('success', t('settings.importSuccess'));
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : t('settings.importError'));
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
      <h1 className="text-2xl font-display font-semibold text-text-primary mb-6">
        {t('settings.title')}
      </h1>

      <div className="flex flex-col gap-8">
        {/* Профиль */}
        <section>
          <h2 className="text-sm font-semibold text-text-primary mb-3">
            {t('settings.profileSection')}
          </h2>
          <div className="flex flex-col gap-3">
            <div>
              <label className="text-sm text-text-secondary mb-1 block">
                {t('settings.fullName')}
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-md border border-border bg-surface text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <button
                  onClick={handleSaveProfile}
                  disabled={name === userProfile?.name}
                  className="px-4 py-2 rounded-md bg-primary hover:bg-primary-hover disabled:opacity-50 text-white text-sm font-medium transition-colors"
                >
                  {t('common.save')}
                </button>
              </div>
            </div>

            <div>
              <label className="text-sm text-text-secondary mb-1 block">
                {t('auth.email')}
              </label>
              <div className="flex items-center justify-between px-3 py-2 rounded-md border border-border bg-surface-hover">
                <span className="text-sm text-text-secondary">{userProfile?.email}</span>
                <button
                  onClick={() => setIsEmailModalOpen(true)}
                  className="text-sm text-primary hover:underline"
                >
                  {t('settings.changeEmail')}
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Безопасность */}
        <section>
          <h2 className="text-sm font-semibold text-text-primary mb-3">
            {t('settings.securitySection')}
          </h2>
          <button
            onClick={() => setIsPasswordModalOpen(true)}
            className="px-4 py-2 rounded-md border border-border text-sm font-medium text-text-secondary hover:bg-surface-hover transition-colors"
          >
            {t('settings.changePassword')}
          </button>
        </section>

        {/* Внешний вид */}
        <section>
          <h2 className="text-sm font-semibold text-text-primary mb-3">
            {t('settings.appearanceSection')}
          </h2>
          <div className="flex flex-wrap gap-2">
            {THEMES.map((th) => (
              <button
                key={th.id}
                onClick={() => handleThemeChange(th.id)}
                className={`px-4 py-2 rounded-md text-sm font-medium border transition-colors ${
                  theme === th.id
                    ? 'border-primary bg-primary-tint text-primary'
                    : 'border-border text-text-secondary hover:bg-surface-hover'
                }`}
              >
                {t(th.labelKey)}
              </button>
            ))}
          </div>
        </section>

        {/* Язык */}
        <section>
          <h2 className="text-sm font-semibold text-text-primary mb-3">
            {t('settings.languageSection')}
          </h2>
          <div className="flex gap-2">
            <button
              onClick={() => handleLanguageChange('ru')}
              className={`px-4 py-2 rounded-md text-sm font-medium border transition-colors ${
                appSettings?.language === 'ru'
                  ? 'border-primary bg-primary-tint text-primary'
                  : 'border-border text-text-secondary hover:bg-surface-hover'
              }`}
            >
              Русский
            </button>
            <button
              onClick={() => handleLanguageChange('en')}
              className={`px-4 py-2 rounded-md text-sm font-medium border transition-colors ${
                appSettings?.language === 'en'
                  ? 'border-primary bg-primary-tint text-primary'
                  : 'border-border text-text-secondary hover:bg-surface-hover'
              }`}
            >
              English
            </button>
          </div>
        </section>

        {/* О приложении */}
        <section>
          <h2 className="text-sm font-semibold text-text-primary mb-3">
            {t('settings.aboutSection')}
          </h2>
          <label className="text-sm text-text-secondary mb-1 block">
            {t('settings.description')}
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 rounded-md border border-border bg-surface text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary resize-none mb-2"
          />
          <button
            onClick={handleSaveProfile}
            disabled={description === userProfile?.description}
            className="px-4 py-2 rounded-md bg-primary hover:bg-primary-hover disabled:opacity-50 text-white text-sm font-medium transition-colors"
          >
            {t('common.save')}
          </button>
          <p className="text-xs text-text-tertiary mt-3">
            {t('settings.version')}: {APP_VERSION}
          </p>
        </section>

        {/* Данные */}
        <section>
          <h2 className="text-sm font-semibold text-text-primary mb-3">
            {t('settings.dataSection')}
          </h2>
          <div className="flex flex-col gap-2">
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="flex items-center gap-2 px-4 py-2 rounded-md border border-border text-sm font-medium text-text-secondary hover:bg-surface-hover transition-colors w-fit"
            >
              <DownloadSimpleIcon size={16} />
              {t('settings.exportData')}
            </button>

            <label className="flex items-center gap-2 px-4 py-2 rounded-md border border-border text-sm font-medium text-text-secondary hover:bg-surface-hover transition-colors w-fit cursor-pointer">
              <UploadSimpleIcon size={16} />
              {t('settings.importData')}
              <input type="file" accept=".json" onChange={handleImport} className="hidden" />
            </label>

            <button
              onClick={handleClearData}
              className="flex items-center gap-2 px-4 py-2 rounded-md border border-error/30 text-sm font-medium text-error hover:bg-error/10 transition-colors w-fit"
            >
              <TrashIcon size={16} />
              {t('settings.clearData')}
            </button>
          </div>
        </section>

        {/* Выйти */}
        <section>
          <button
            onClick={logout}
            className="flex items-center gap-2 px-4 py-2 rounded-md bg-error/10 text-error text-sm font-medium hover:bg-error/20 transition-colors"
          >
            <SignOutIcon size={16} />
            {t('auth.logout')}
          </button>
        </section>
      </div>

      {isPasswordModalOpen && <ChangePasswordModal onClose={() => setIsPasswordModalOpen(false)} />}
      {isEmailModalOpen && <ChangeEmailModal onClose={() => setIsEmailModalOpen(false)} />}
    </div>
  );
}