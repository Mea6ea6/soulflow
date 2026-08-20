import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from './hooks/useAuthHook';
import { useAppSettings } from './hooks/useDB';
import LoginPage from './pages/LoginPage';
import LoadingSpinner from './components/LoadingSpinner';
import Layout from './components/Layout';
import { DocumentEditorProvider } from './context/DocumentEditorProvider';
import { BackupProvider } from './context/BackupProvider';
import BackupCodesGate from './components/auth/BackupCodesGate';

function App() {
  const { isAuthenticated, isLoading } = useAuth();
  const { i18n } = useTranslation();
  const appSettings = useAppSettings();

  useEffect(() => {
    if (isAuthenticated && appSettings) {
      i18n.changeLanguage(appSettings.language);
    } else if (!isAuthenticated) {
      // На экране логина язык и тема всегда дефолтные — не зависят от
      // того, что было выбрано в каком-либо из аккаунтов на этом устройстве
      i18n.changeLanguage('en');
    }
  }, [isAuthenticated, appSettings, i18n]);

  return (
    <>
      {isLoading ? (
        <LoadingSpinner />
      ) : !isAuthenticated ? (
        <LoginPage />
      ) : (
        <DocumentEditorProvider>
          <BackupProvider>
            <Layout />
          </BackupProvider>
        </DocumentEditorProvider>
      )}
      <BackupCodesGate />
    </>
  );
}

export default App;