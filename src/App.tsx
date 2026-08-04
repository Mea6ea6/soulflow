import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from './hooks/useAuthHook';
import { useAppSettings } from './hooks/useDB';
import LoginPage from './components/LoginPage';
import LoadingSpinner from './components/LoadingSpinner';
import Layout from './components/Layout';
import { DocumentEditorProvider } from './context/DocumentEditorProvider';

function App() {
  const { isAuthenticated, isLoading } = useAuth();
  const { i18n } = useTranslation();
  const appSettings = useAppSettings();

  useEffect(() => {
    if (appSettings) {
      i18n.changeLanguage(appSettings.language);
    }
  }, [appSettings, i18n]);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <DocumentEditorProvider>
      <Layout />
    </DocumentEditorProvider>
  );
}

export default App;