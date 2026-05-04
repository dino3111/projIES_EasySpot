import { RouterProvider } from 'react-router';
import { router } from './routes';
import { ThemeProvider } from 'next-themes';
import { ProfileProvider } from './context/ProfileContext';
import { AuthProvider } from './context/AuthContext';

export default function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <ProfileProvider>
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
      </ProfileProvider>
    </ThemeProvider>
  );
}
