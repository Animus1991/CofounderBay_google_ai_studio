/**
 * The studio chat's proposal flow, end to end in the component.
 *
 * Regression: turns used to be persisted under a new id while the bubble kept
 * its own, and the transcript store (the source of truth) then replaced the
 * bubble — dropping its in-memory proposal. Every write the assistant offered
 * showed its question with no Confirm or Cancel, so nothing could be applied.
 */
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readAssistant, readMilestones, readProfileLocal, resetAllLists } from '../lib/localLists';
import ChatWidget from './ChatWidget';

const toasts = vi.hoisted(() => ({ last: undefined as undefined | { action?: { run: () => void } } }));

vi.mock('../App', () => ({
  useAuth: () => ({
    isDemoMode: true,
    user: null,
    profile: {
      fullName: 'Demo User',
      headline: 'Technical founder building a FinTech product',
      skills: ['React', 'TypeScript'],
      lookingFor: ['Sales', 'Growth'],
      industry: 'FinTech',
      stage: 'Pre-seed',
      role: 'Founder',
      roles: ['Founder'],
    },
  }),
}));
vi.mock('../context/ToastContext', () => ({
  useToast: () => ({
    toast: (message: { action?: { run: () => void } }) => { toasts.last = message; },
    info: () => undefined,
    error: () => undefined,
    success: () => undefined,
  }),
}));
// No model in tests: the polish step and the planner fail fast, as offline.
vi.mock('../services/aiService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/aiService')>();
  return {
    ...actual,
    AIService: {
      chat: vi.fn().mockRejectedValue(new Error('offline')),
      plan: vi.fn().mockRejectedValue(new Error('offline')),
      status: vi.fn().mockResolvedValue({ configured: false, model: null, source: 'none' }),
      coolingDown: false,
    },
  };
});

beforeEach(() => {
  resetAllLists();
  try { localStorage.setItem('demo_mode', 'true'); } catch { /* non-DOM env */ }
  vi.stubGlobal('PointerEvent', MouseEvent);
});

function renderChat() {
  return render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <ChatWidget variant="page" />
    </MemoryRouter>,
  );
}

async function send(text: string) {
  const input = screen.getByLabelText('Message the assistant');
  await userEvent.type(input, `${text}{Enter}`);
}

describe('studio chat proposals', () => {
  it('shows Confirm and Cancel for a proposed write, and stores the turn under the same id', async () => {
    renderChat();
    await send('add milestone Ship the private beta');
    expect(await screen.findByRole('button', { name: 'Confirm' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    const stored = readAssistant();
    expect(stored.map((turn) => turn.role)).toEqual(['user', 'assistant']);
    // The bubble the card belongs to is the stored turn.
    expect(stored[1]!.text).toMatch(/Ship the private beta/);
    expect(readMilestones().some((item) => item.title === 'Ship the private beta')).toBe(false);
  });

  it('applies on Confirm and takes it back on Undo', async () => {
    renderChat();
    await send('add milestone Ship the private beta');
    await userEvent.click(await screen.findByRole('button', { name: 'Confirm' }));
    await waitFor(() => expect(readMilestones().some((item) => item.title === 'Ship the private beta')).toBe(true));
    const undo = await screen.findByRole('button', { name: 'Undo' });
    await userEvent.click(undo);
    await waitFor(() => expect(readMilestones().some((item) => item.title === 'Ship the private beta')).toBe(false));
    expect(await screen.findByText('Undone.')).toBeInTheDocument();
  });

  it('writes nothing on Cancel', async () => {
    renderChat();
    await send('set my headline to Building climate fintech');
    await userEvent.click(await screen.findByRole('button', { name: 'Cancel' }));
    expect(await screen.findByText('Cancelled — nothing changed.')).toBeInTheDocument();
    expect(readProfileLocal().headline).toBeUndefined();
  });

  it('answers an unrecognised question honestly instead of with the briefing', async () => {
    renderChat();
    await act(async () => { await send('How should I price my SaaS product?'); });
    expect(await screen.findByText(/not reachable right now/)).toBeInTheDocument();
    expect(screen.queryByText(/Best match:/)).not.toBeInTheDocument();
    expect(screen.getByText('Not matched')).toBeInTheDocument();
  });
});
