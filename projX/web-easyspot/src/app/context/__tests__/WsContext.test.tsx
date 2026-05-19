import { render, waitFor, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { WsProvider, useWs } from '../WsContext';
import * as AuthContext from '../AuthContext';
import { Client } from '@stomp/stompjs';

vi.mock('@stomp/stompjs', () => {
  const Client = vi.fn();
  Client.prototype.activate = vi.fn();
  Client.prototype.deactivate = vi.fn();
  return { Client };
});

vi.mock('sockjs-client', () => ({
  default: vi.fn(),
}));

vi.mock('../AuthContext', () => ({
  useAuth: vi.fn(),
}));

function TestComponent() {
  const { status } = useWs();
  return <div data-testid="status">{status}</div>;
}

describe('WsContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('starts as disconnected and moves to connecting when user is present', async () => {
    (AuthContext.useAuth as any).mockReturnValue({
      user: { sub: 'user-1' },
      accessToken: 'token-1',
    });

    const { getByTestId } = render(
      <WsProvider>
        <TestComponent />
      </WsProvider>
    );

    expect(getByTestId('status').textContent).toBe('connecting');
    expect(Client).toHaveBeenCalled();
  });

  it('sets status to connected when onConnect is called', async () => {
    let onConnectCallback: any;
    (Client as any).mockImplementation(function(this: any) {
      this.activate = vi.fn();
      this.deactivate = vi.fn();
      Object.defineProperty(this, 'onConnect', {
        set: (cb) => { onConnectCallback = cb; }
      });
    });

    (AuthContext.useAuth as any).mockReturnValue({
      user: { sub: 'user-1' },
      accessToken: 'token-1',
    });

    const { getByTestId } = render(
      <WsProvider>
        <TestComponent />
      </WsProvider>
    );

    expect(getByTestId('status').textContent).toBe('connecting');

    act(() => {
      onConnectCallback();
    });

    await waitFor(() => {
      expect(getByTestId('status').textContent).toBe('connected');
    });
  });

  it('sets status to disconnected when websocket closes', async () => {
    let onWebSocketCloseCallback: any;
    (Client as any).mockImplementation(function(this: any) {
      this.activate = vi.fn();
      this.deactivate = vi.fn();
      Object.defineProperty(this, 'onWebSocketClose', {
        set: (cb) => { onWebSocketCloseCallback = cb; }
      });
    });

    (AuthContext.useAuth as any).mockReturnValue({
      user: { sub: 'user-1' },
      accessToken: 'token-1',
    });

    const { getByTestId } = render(
      <WsProvider>
        <TestComponent />
      </WsProvider>
    );

    act(() => {
      onWebSocketCloseCallback({ code: 1000 });
    });

    await waitFor(() => {
      expect(getByTestId('status').textContent).toBe('disconnected');
    });
  });
});
