import { useSelector } from 'react-redux';
import { useInitAuth } from '@/hooks/useInitAuth';
import AppRouter from '@/routes/AppRouter';
import Spinner from '@/components/ui/Spinner';
import ErrorBoundary from './components/ErrorBoundary';

export default function App() {
  useInitAuth();
  const isInitialized = useSelector((state) => state.auth.isInitialized);

  // block rendering until we know if user is logged in
  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <AppRouter />
    </ErrorBoundary>
  );
}