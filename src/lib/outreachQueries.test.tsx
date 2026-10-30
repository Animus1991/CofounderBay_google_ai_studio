import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ApiError } from './apiClient';
import { queryClient } from './queryClient';
import { needsSignIn } from './studioApi';

const calls: string[] = [];
const respond = vi.fn<(path: string, method: string) => unknown>();

vi.mock('./studioApi', async (original) => ({
  ...(await original<typeof import('./studioApi')>()),
  studioApi: async (path: string, init?: { method?: string }) => {
    const method = init?.method ?? 'GET';
    calls.push(`${method} ${path}`);
    return respond(path, method);
  },
}));

const { useDdShares, useEmailLog, useEmailStatus } = await import('./outreachQueries');
const { createDDShare, revokeDDShare } = await import('./dueDiligence');
const { sendEmail } = await import('./outreach');

const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
const share = (token: string) => ({ token, investorName: 'Sequoia', ventureName: 'EcoFlow', views: 0, lastViewedAt: null, createdAt: '', updatedAt: '', done: 1, total: 2, files: [] });

describe('outreach server data', () => {
  beforeEach(() => {
    calls.length = 0;
    queryClient.clear();
    let list = [share('t1')];
    respond.mockImplementation((path, method) => {
      if (path === '/dd/shares' && method === 'GET') return list;
      if (path === '/dd/shares' && method === 'POST') { list = [share('t2'), ...list]; return list[0]; }
      if (path.startsWith('/dd/shares/') && method === 'DELETE') { list = list.filter((item) => !path.endsWith(item.token)); return { revoked: true }; }
      if (path === '/email/status') return { provider: null, configured: false };
      if (path.startsWith('/email/log')) return [];
      if (path === '/email/send') return { id: 'e1', to: 'a@b.com', subject: 'x', kind: 'investor', status: 'queued', at: '' };
      throw new Error(`unexpected ${method} ${path}`);
    });
  });
  afterEach(() => queryClient.clear());

  it('asks the server once however many components show the same data', async () => {
    const { result } = renderHook(() => [useDdShares(), useDdShares(), useEmailStatus(), useEmailStatus()], { wrapper });
    await waitFor(() => expect(result.current.every((query) => query.isSuccess)).toBe(true));
    expect(calls.filter((call) => call === 'GET /dd/shares')).toHaveLength(1);
    expect(calls.filter((call) => call === 'GET /email/status')).toHaveLength(1);
  });

  it('refreshes the share list after a link is created or revoked — by a page or by the assistant', async () => {
    const { result } = renderHook(() => useDdShares(), { wrapper });
    await waitFor(() => expect(result.current.data?.map((item) => item.token)).toEqual(['t1']));
    await act(async () => { await createDDShare('Sequoia', 'EcoFlow'); });
    await waitFor(() => expect(result.current.data?.map((item) => item.token)).toEqual(['t2', 't1']));
    await act(async () => { await revokeDDShare('t1'); });
    await waitFor(() => expect(result.current.data?.map((item) => item.token)).toEqual(['t2']));
  });

  it('refreshes the email log after a send', async () => {
    const { result } = renderHook(() => useEmailLog('inv_1'), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    await act(async () => { await sendEmail({ to: 'a@b.com', subject: 'x', body: 'y', investorId: 'inv_1' }); });
    await waitFor(() => expect(calls.filter((call) => call.startsWith('GET /email/log'))).toHaveLength(2));
  });

  it('does not retry a call that needs sign-in', async () => {
    respond.mockImplementation(() => { throw new ApiError('Sign in', 401, 'sign-in-required'); });
    const { result } = renderHook(() => useDdShares(), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(needsSignIn(result.current.error)).toBe(true);
    expect(calls).toEqual(['GET /dd/shares']);
  });
});
