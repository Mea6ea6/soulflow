import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from './hooks/useAuthHook';
import LoginPage from './pages/LoginPage';
import LoadingSpinner from './components/LoadingSpinner';
import Layout from './components/Layout';
import { DocumentEditorProvider } from './context/DocumentEditorProvider';
import { BackupProvider } from './context/BackupProvider';
import BackupCodesGate from './components/auth/BackupCodesGate';

function App() {
  const { isAuthenticated, isLoading, userProfile } = useAuth();
  const { i18n } = useTranslation();

  useEffect(() => {
    if (isAuthenticated && userProfile?.language) {
      i18n.changeLanguage(userProfile.language);
    } else if (!isAuthenticated) {
      // Экран входа всегда на английском — не зависит от того, что выбрано
      // в каком-либо из аккаунтов на этом устройстве
      i18n.changeLanguage('en');
    }
  }, [isAuthenticated, userProfile?.language, i18n]);

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