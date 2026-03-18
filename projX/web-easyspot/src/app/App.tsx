import { RouterProvider } from 'react-router';
import { router } from './routes';
import { ThemeProvider } from 'next-themes';
import { ProfileProvider } from './context/ProfileContext';

export default function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <ProfileProvider>
        <RouterProvider router={router} />
      </ProfileProvider>
    </ThemeProvider>
  );
}