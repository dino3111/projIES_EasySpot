import { useEffect, useState } from 'react';

function getStoredTheme(): 'light' | 'dark' {
  try {
    const stored = localStorage.getItem('easyspot_theme');
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {}
  return 'dark';
}

function applyTheme(theme: 'light' | 'dark') {
  document.documentElement.setAttribute('data-theme', theme);
  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
  try {
    localStorage.setItem('easyspot_theme', theme);
  } catch {}
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => getStoredTheme());

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const toggle = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));

  return (
    <button
      onClick={toggle}
      className="w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 bg-white/15 hover:bg-white/25 text-white"
      aria-label={theme === 'dark' ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
      title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
    >
      {theme === 'dark' ? (
        <i className="fas fa-sun text-[1rem]" aria-hidden="true" />
      ) : (
        <i className="fas fa-moon text-[1rem]" aria-hidden="true" />
      )}
    </button>
  );
}
