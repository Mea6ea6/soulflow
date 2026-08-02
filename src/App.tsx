import { useAuth } from './hooks/useAuthHook';
import LoginPage from './components/LoginPage';
import LoadingSpinner from './components/LoadingSpinner';
import Layout from './components/Layout';
import { DocumentEditorProvider } from './context/DocumentEditorProvider';

function App() {
  const { isAuthenticated, isLoading } = useAuth();

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