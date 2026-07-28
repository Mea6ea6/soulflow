import { useAuth } from './hooks/useAuthHook';
import LoginPage from './components/LoginPage';
import LoadingSpinner from './components/LoadingSpinner';
import Layout from './components/Layout';

function App() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return <Layout />;
}

export default App;