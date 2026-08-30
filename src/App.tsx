import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from './hooks/useAuthHook';
import LoginPage from './pages/LoginPage';
import LoadingSpinner from './components/LoadingSpinner';
import Layout from './components/Layout';
import { DocumentEditorProvider } from './context/DocumentEditorProvider';
import { BackupProvider } from './context/BackupProvider';
import { SyncProvider } from './context/SyncProvider';
import { InAppNotificationProvider } from './context/InAppNotificationProvider';
import BackupCodesGate from './components/auth/BackupCodesGate';
import { useSessionNotifications } from './hooks/useSessionNotifications';
import { NavigationProvider } from './context/NavigationProvider';

function SessionNotificationsRunner() {
  useSessionNotifications();
  return null;
}

function App() {
  const { isAuthenticated, isLoading, userProfile } = useAuth();
  const { i18n } = useTranslation();

  useEffect(() => {
    if (isAuthenticated && userProfile?.language) {
      i18n.changeLanguage(userProfile.language);
    } else if (!isAuthenticated) {
      i18n.changeLanguage('en');
    }
  }, [isAuthenticated, userProfile?.language, i18n]);

  return (
    <InAppNotificationProvider>
      {isLoading ? (
        <LoadingSpinner />
      ) : !isAuthenticated ? (
        <LoginPage />
      ) : (
        <DocumentEditorProvider>
          <BackupProvider>
            <SyncProvider>
              <NavigationProvider>
                <SessionNotificationsRunner />
                <Layout />
              </NavigationProvider>
            </SyncProvider>
          </BackupProvider>
        </DocumentEditorProvider>
      )}
      <BackupCodesGate />
    </InAppNotificationProvider>
  );
}

export default App;