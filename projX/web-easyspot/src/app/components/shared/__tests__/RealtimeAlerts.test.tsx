import { render } from '@testing-library/react';
import { vi } from 'vitest';
import { RealtimeAlerts } from '../RealtimeAlerts';
import { useWs } from '../../../context/WsContext';
import { useAuth } from '../../../context/AuthContext';

vi.mock('../../../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../../../context/WsContext', () => ({
  useWs: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    info: vi.fn(),
  },
}));

describe('RealtimeAlerts Component', () => {
  it('subscribes to alerts when connected', () => {
    const mockSubscribe = vi.fn(() => ({ unsubscribe: vi.fn() }));
    const mockClient = { subscribe: mockSubscribe };
    
    (useAuth as any).mockReturnValue({ user: { sub: 'user-123' } });
    (useWs as any).mockReturnValue({ client: mockClient, status: 'connected' });

    render(<RealtimeAlerts />);

    expect(mockSubscribe).toHaveBeenCalledWith('/topic/alerts/user-123', expect.any(Function));
  });

  it('does not subscribe if disconnected', () => {
    const mockSubscribe = vi.fn();
    const mockClient = { subscribe: mockSubscribe };
    
    (useAuth as any).mockReturnValue({ user: { sub: 'user-123' } });
    (useWs as any).mockReturnValue({ client: mockClient, status: 'disconnected' });

    render(<RealtimeAlerts />);

    expect(mockSubscribe).not.toHaveBeenCalled();
  });
});
