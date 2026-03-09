import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="w-9 h-9 rounded-full bg-white/20 animate-pulse" />;
  }

  const isDark = theme === 'dark';

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 bg-white/15 hover:bg-white/25 text-white"
      aria-label={isDark ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
      title={isDark ? 'Modo claro' : 'Modo escuro'}
    >
      <span key={isDark ? 'sun' : 'moon'} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {isDark ? (
          <i className="fas fa-sun text-[1rem]" aria-hidden="true" />
        ) : (
          <i className="fas fa-moon text-[1rem]" aria-hidden="true" />
        )}
      </span>
    </button>
  );
}
