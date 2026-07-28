import { useEffect } from 'react';
import { useAuth } from './hooks/useAuthHook';
import { useAppSettings } from './hooks/useDB';
import LoginPage from './components/LoginPage';
import LoadingSpinner from './components/LoadingSpinner';
import Layout from './components/Layout';

function App() {
  const { isAuthenticated, isLoading } = useAuth();
  const appSettings = useAppSettings();

  useEffect(() => {
    const root = document.documentElement;
    if (appSettings?.theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [appSettings?.theme]);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return <Layout />;
}

export default App;