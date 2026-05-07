import { RouterProvider } from 'react-router';
import { Toaster } from 'sonner';
import { router } from './routes';
import { ProfileProvider } from './context/ProfileContext';
import { AuthProvider } from './context/AuthContext';
import { LoadingProvider } from './context/LoadingContext';
import { GlobalLoadingOverlay } from './components/shared/GlobalLoadingOverlay';

export default function App() {
  return (
    <LoadingProvider>
      <ProfileProvider>
        <AuthProvider>
          <RouterProvider router={router} />
          <GlobalLoadingOverlay />
          <Toaster position="top-center" richColors />
        </AuthProvider>
      </ProfileProvider>
    </LoadingProvider>
  );
}
