import { RouterProvider } from 'react-router';
import { Toaster } from 'sonner';
import { router } from './routes';
import { ProfileProvider } from './context/ProfileContext';
import { AuthProvider } from './context/AuthContext';

export default function App() {
  return (
    <ProfileProvider>
      <AuthProvider>
        <RouterProvider router={router} />
        <Toaster position="top-center" richColors />
      </AuthProvider>
    </ProfileProvider>
  );
}
