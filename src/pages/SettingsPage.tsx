import { useState, useEffect, useRef, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  SignOutIcon, DownloadSimpleIcon, UploadSimpleIcon, TrashIcon, CameraIcon,
  UserIcon, ShieldCheckIcon, PaintBrushIcon, HardDrivesIcon, CaretRightIcon,
  FolderOpenIcon, ArrowClockwiseIcon, EnvelopeSimpleIcon, LockIcon,
} from '@phosphor-icons/react';
import { useAuth } from '../hooks/useAuthHook';
import { useTheme } from '../hooks/useThemeHook';
import { useToast } from '../hooks/useToastHook';
import { useBackup } from '../hooks/useBackupHook';
import { useAppSettings, updateAppSettings } from '../hooks/useDB';
import { exportAllData, downloadExport, importAllData, clearAllData } from '../utils/exportImport';
import { processAvatarFile, AvatarProcessingError } from '../utils/avatarImage';
import type { ThemeId } from '../types';
import Avatar from '../components/Avatar';
import ChangePasswordModal from '../components/ChangePasswordModal';
import ChangeEmailModal from '../components/ChangeEmailModal';
import ThemeSwatch from '../components/ThemeSwatch';
import Select from '../components/Select';
import BackupCodesSection from '../components/auth/BackupCodesDisplay';

const APP_VERSION = '0.1.0';

const THEMES: { id: ThemeId; labelKey: string }[] = [
  { id: 'dawn', labelKey: 'settings.themeDawn' },
  { id: 'dusk', labelKey: 'settings.themeDusk' },
  { id: 'onyx', labelKey: 'settings.themeOnyx' },
];

const LANGUAGES: { code: 'en' | 'es' | 'fr' | 'ru'; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
  { code: 'ru', label: 'Русский' },
];

type SettingsSection = 'profile' | 'privacy' | 'appearance' | 'data';

const NAV_ITEMS: { id: SettingsSection; icon: React.ElementType; labelKey: string }[] = [
  { id: 'profile', icon: UserIcon, labelKey: 'settings.navProfile' },
  { id: 'privacy', icon: ShieldCheckIcon, labelKey: 'settings.navPrivacy' },
  { id: 'appearance', icon: PaintBrushIcon, labelKey: 'settings.navAppearance' },
  { id: 'data', icon: HardDrivesIcon, labelKey: 'settings.navData' },
];

// Полноширинная строка-действие: иконка слева, подпись/описание по центру,
// значение или шеврон справа. Используется вместо узких кнопок-пилюль там,
// где действие логичнее смотрится как пункт списка настроек
interface SettingsActionRowProps {
  icon: React.ElementType;
  label: string;
  description?: string;
  trailing?: ReactNode;
  onClick?: () => void;
  danger?: boolean;
  disabled?: boolean;
}

function SettingsActionRow({ icon: Icon, label, description, trailing, onClick, danger, disabled }: SettingsActionRowProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl border border-border bg-bg hover:bg-surface-hover disabled:opacity-50 transition-colors text-left ${
        danger ? 'text-error' : 'text-text-primary'
      }`}
    >
      <Icon size={18} className="shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{label}</p>
        {description && <p className="text-xs text-text-tertiary truncate">{description}</p>}
      </div>
      {trailing ?? <CaretRightIcon size={14} className="shrink-0 opacity-50" />}
    </button>
  );
}

export default function SettingsPage() {
  const { t, i18n } = useTranslation();
  const { logout, userProfile, updateProfile } = useAuth();
  const { theme, setTheme } = useTheme();
  const { showToast } = useToast();
  const appSettings = useAppSettings();
  const backup = useBackup();

  const [activeSection, setActiveSection] = useState<SettingsSection>('profile');
  const [firstName, setFirstName] = useState(userProfile?.firstName ?? userProfile?.name?.split(' ')[0] ?? '');
  const [lastName, setLastName] = useState(userProfile?.lastName ?? userProfile?.name?.split(' ').slice(1).join(' ') ?? '');
  const [description, setDescription] = useState(userProfile?.description ?? '');
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (appSettings) {
      i18n.changeLanguage(appSettings.language);
    }
  }, [appSettings, i18n]);

  const initialFirstName = userProfile?.firstName ?? userProfile?.name?.split(' ')[0] ?? '';
  const initialLastName = userProfile?.lastName ?? userProfile?.name?.split(' ').slice(1).join(' ') ?? '';
  const hasProfileChanges = firstName !== initialFirstName || lastName !== initialLastName || description !== (userProfile?.description ?? '');

  const handleSaveProfile = async () => {
    const fullName = `${firstName} ${lastName}`.trim() || userProfile?.name || '';
    await updateProfile({ firstName, lastName, name: fullName, description });
    showToast('success', t('common.save'));
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setAvatarError(null);
    setIsUploadingAvatar(true);
    try {
      const base64 = await processAvatarFile(file);
      await updateProfile({ avatar: base64 });
      showToast('success', t('settings.changePhoto'));
    } catch (err) {
      if (err instanceof AvatarProcessingError && err.code === 'too_large') {
        setAvatarError(t('settings.avatarTooLarge'));
      } else if (err instanceof AvatarProcessingError && err.code === 'unsupported_type') {
        setAvatarError(t('settings.avatarUnsupportedType'));
      } else {
        setAvatarError(t('settings.avatarUploadFailed'));
      }
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleRemoveAvatar = async () => {
    await updateProfile({ avatar: null });
  };

  const handleThemeChange = (newTheme: ThemeId) => setTheme(newTheme);
  const handleLanguageChange = async (language: 'en' | 'es' | 'fr' | 'ru') => updateAppSettings({ language });

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
    if (!confirm(t('settings.importConfirm'))) { e.target.value = ''; return; }
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

  const handleImportFileClick = () => {
    document.getElementById('settings-import-input')?.click();
  };

  const formatBackupDate = (iso: string | null) => {
    if (!iso) return t('settings.backupNever');
    return new Date(iso).toLocaleString('ru-RU');
  };

  return (
    <div>
      <h1 className="text-2xl font-display font-semibold text-text-primary mb-6">{t('settings.title')}</h1>

      <div className="flex flex-col md:flex-row gap-6 items-start">
        {/* Левая колонка — только навигация, без статичной карточки профиля */}
        <div className="w-full md:w-64 shrink-0 flex flex-col gap-4">
          <nav className="flex flex-col gap-0.5 p-1.5 rounded-2xl bg-surface shadow-card">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                    isActive ? 'bg-primary-tint text-primary' : 'text-text-secondary hover:bg-surface-hover'
                  }`}
                >
                  <Icon size={18} weight={isActive ? 'fill' : 'regular'} className="shrink-0" />
                  <span className="flex-1 text-left truncate">{t(item.labelKey)}</span>
                  <CaretRightIcon size={14} className="shrink-0 opacity-50" />
                </button>
              );
            })}
          </nav>

          <button
            onClick={logout}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-error/10 text-error text-sm font-medium hover:bg-error/20 transition-colors"
          >
            <SignOutIcon size={16} />
            {t('auth.logout')}
          </button>

          <p className="text-xs text-text-tertiary px-1">{t('settings.version')}: {APP_VERSION}</p>
        </div>

        {/* Правая колонка — содержимое выбранного раздела */}
        <div className="flex-1 min-w-0 w-full">
          {activeSection === 'profile' && (
            <div className="rounded-2xl bg-surface shadow-card p-5 flex flex-col gap-4">
              <h2 className="text-sm font-semibold text-text-primary">{t('settings.navProfile')}</h2>

              <div className="flex items-center gap-4">
                <div className="relative shrink-0">
                  <Avatar name={userProfile?.name ?? '?'} photoBase64={userProfile?.avatar} size={56} />
                  {isUploadingAvatar && (
                    <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => avatarInputRef.current?.click()}
                      disabled={isUploadingAvatar}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border text-xs font-medium text-text-secondary hover:bg-surface-hover disabled:opacity-50 transition-colors"
                    >
                      <CameraIcon size={14} />
                      {t('settings.changePhoto')}
                    </button>
                    {userProfile?.avatar && (
                      <button
                        type="button"
                        onClick={handleRemoveAvatar}
                        className="px-3 py-1.5 rounded-full text-xs font-medium text-error hover:bg-error/10 transition-colors"
                      >
                        {t('settings.removePhoto')}
                      </button>
                    )}
                  </div>
                  {avatarError && <p className="text-xs text-error">{avatarError}</p>}
                </div>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-text-secondary mb-1 block">{t('settings.firstName')}</label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-bg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="text-sm text-text-secondary mb-1 block">{t('settings.lastName')}</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-bg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm text-text-secondary mb-1 block">{t('settings.bio')}</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  maxLength={280}
                  placeholder={t('settings.bioPlaceholder')}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-bg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
              </div>

              <button
                onClick={handleSaveProfile}
                disabled={!hasProfileChanges}
                className="w-full py-2.5 rounded-full bg-primary hover:bg-primary-hover disabled:opacity-50 text-white text-sm font-medium transition-colors"
              >
                {t('common.save')}
              </button>
            </div>
          )}

          {activeSection === 'privacy' && (
            <div className="rounded-2xl bg-surface shadow-card p-5 flex flex-col gap-3">
              <h2 className="text-sm font-semibold text-text-primary mb-1">{t('settings.navPrivacy')}</h2>

              <SettingsActionRow
                icon={EnvelopeSimpleIcon}
                label={t('auth.email')}
                description={userProfile?.email}
                trailing={<span className="text-sm text-primary shrink-0">{t('settings.changeEmail')}</span>}
                onClick={() => setIsEmailModalOpen(true)}
              />

              <SettingsActionRow
                icon={LockIcon}
                label={t('settings.changePassword')}
                onClick={() => setIsPasswordModalOpen(true)}
              />
              <BackupCodesSection />
            </div>
          )}

          {activeSection === 'appearance' && (
            <div className="flex flex-col gap-4">
              <div className="rounded-2xl bg-surface shadow-card p-5">
                <h2 className="text-sm font-semibold text-text-primary mb-1">{t('settings.appearanceSection')}</h2>
                <p className="text-xs text-text-tertiary mb-4">{t('settings.defaultThemes')}</p>
                <div className="flex flex-wrap gap-4">
                  {THEMES.map((th) => (
                    <ThemeSwatch key={th.id} themeId={th.id} label={t(th.labelKey)} isSelected={theme === th.id} onClick={() => handleThemeChange(th.id)} />
                  ))}
                </div>
              </div>

              <div className="rounded-2xl bg-surface shadow-card p-5">
                <h2 className="text-sm font-semibold text-text-primary mb-3">{t('settings.languageSection')}</h2>
                <div className="flex flex-wrap gap-2">
                  {LANGUAGES.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => handleLanguageChange(lang.code)}
                      className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                        appSettings?.language === lang.code ? 'border-primary bg-primary-tint text-primary' : 'border-border text-text-secondary hover:bg-surface-hover'
                      }`}
                    >
                      {lang.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeSection === 'data' && (
            <div className="flex flex-col gap-4">
              <div className="rounded-2xl bg-surface shadow-card p-5 flex flex-col gap-3">
                <h2 className="text-sm font-semibold text-text-primary mb-1">{t('settings.dataSection')}</h2>

                <SettingsActionRow
                  icon={DownloadSimpleIcon}
                  label={t('settings.exportData')}
                  onClick={handleExport}
                  disabled={isExporting}
                  trailing={<span />}
                />

                <SettingsActionRow
                  icon={UploadSimpleIcon}
                  label={t('settings.importData')}
                  onClick={handleImportFileClick}
                  trailing={<span />}
                />
                <input id="settings-import-input" type="file" accept=".json" onChange={handleImport} className="hidden" />

                <SettingsActionRow
                  icon={TrashIcon}
                  label={t('settings.clearData')}
                  onClick={handleClearData}
                  danger
                  trailing={<span />}
                />
              </div>

              <div className="rounded-2xl bg-surface shadow-card p-5 flex flex-col gap-3">
                <h2 className="text-sm font-semibold text-text-primary mb-1">{t('settings.backupSection')}</h2>

                {!backup.isSupported ? (
                  <p className="text-sm text-text-tertiary">{t('settings.backupUnsupported')}</p>
                ) : (
                  <>
                    <SettingsActionRow
                      icon={FolderOpenIcon}
                      label={backup.folderName ? t('settings.backupChangeFolder') : t('settings.backupChooseFolder')}
                      description={backup.folderName ?? undefined}
                      onClick={backup.chooseFolder}
                    />

                    {backup.needsReauthorization && backup.folderName && (
                      <div className="flex items-center justify-between px-3 py-2 rounded-xl border border-warning/30 bg-warning/10">
                        <span className="text-xs text-warning">{t('settings.backupReauthorizeNeeded')}</span>
                        <button onClick={backup.reauthorize} className="flex items-center gap-1 text-xs text-warning hover:underline shrink-0">
                          <ArrowClockwiseIcon size={12} />
                          {t('settings.backupReauthorize')}
                        </button>
                      </div>
                    )}

                    {backup.folderName && (
                      <>
                        <Select
                          value={backup.frequency}
                          onChange={(v) => backup.setFrequency(v as typeof backup.frequency)}
                          options={[
                            { value: 'off', label: t('settings.backupFrequencyOff') },
                            { value: 'daily', label: t('settings.backupFrequencyDaily') },
                            { value: 'weekly', label: t('settings.backupFrequencyWeekly') },
                          ]}
                          placeholder={t('settings.backupFrequencyOff')}
                        />

                        <button
                          onClick={backup.createBackupNow}
                          disabled={backup.isBackingUp}
                          className="w-full py-2.5 rounded-full bg-primary hover:bg-primary-hover disabled:opacity-50 text-white text-sm font-medium transition-colors"
                        >
                          {backup.isBackingUp ? t('settings.backupInProgress') : t('settings.backupNow')}
                        </button>

                        <p className="text-xs text-text-tertiary">
                          {t('settings.backupLastLabel')}: {formatBackupDate(backup.lastBackupAt)}
                        </p>
                        <p className="text-xs text-text-tertiary">{t('settings.backupTabOpenNotice')}</p>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {isPasswordModalOpen && <ChangePasswordModal onClose={() => setIsPasswordModalOpen(false)} />}
      {isEmailModalOpen && <ChangeEmailModal onClose={() => setIsEmailModalOpen(false)} />}
    </div>
  );
}