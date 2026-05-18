import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { vi, beforeEach, describe, it, expect } from 'vitest';
import { Header } from '../Header';
import * as AuthContext from '../../../context/AuthContext';
import * as WsContext from '../../../context/WsContext';

vi.mock('../../../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../../../context/WsContext', () => ({
  useWs: vi.fn(),
}));

vi.mock('../../../services/apiService', () => ({
  profileApi: {
    get: vi.fn().mockResolvedValue({ photoUrl: null }),
  },
}));

describe('Header Component - RealtimeBadge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (AuthContext.useAuth as any).mockReturnValue({
      user: { role: 'DRIVER', name: 'John Doe' },
      logout: vi.fn(),
    });
  });

  it('shows "Tempo Real" when connected', () => {
    (WsContext.useWs as any).mockReturnValue({ status: 'connected' });
    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>
    );
    expect(screen.getByText('Tempo Real')).toBeInTheDocument();
    expect(screen.getByLabelText(/Estado da ligação: Tempo Real/i)).toBeInTheDocument();
  });

  it('shows "A Ligar..." when connecting', () => {
    (WsContext.useWs as any).mockReturnValue({ status: 'connecting' });
    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>
    );
    expect(screen.getByText('A Ligar...')).toBeInTheDocument();
    expect(screen.getByLabelText(/Estado da ligação: A Ligar.../i)).toBeInTheDocument();
  });

  it('shows "Desligado" when disconnected', () => {
    (WsContext.useWs as any).mockReturnValue({ status: 'disconnected' });
    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>
    );
    expect(screen.getByText('Desligado')).toBeInTheDocument();
    expect(screen.getByLabelText(/Estado da ligação: Desligado/i)).toBeInTheDocument();
  });
});
