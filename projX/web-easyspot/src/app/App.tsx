import { RouterProvider } from 'react-router';
import { Toaster } from 'sonner';
import { router } from './routes';
import { ProfileProvider } from './context/ProfileContext';
import { AuthProvider } from './context/AuthContext';
import { LoadingProvider } from './context/LoadingContext';
import { WsProvider } from './context/WsContext';
import { GlobalLoadingOverlay } from './components/shared/GlobalLoadingOverlay';
import { RealtimeAlerts } from './components/shared/RealtimeAlerts';

export default function App() {
  return (
    <LoadingProvider>
      <AuthProvider>
        <WsProvider>
          <ProfileProvider>
            <RouterProvider router={router} />
            <GlobalLoadingOverlay />
            <RealtimeAlerts />
            <Toaster position="top-center" richColors />
          </ProfileProvider>
        </WsProvider>
      </AuthProvider>
    </LoadingProvider>
  );
}
