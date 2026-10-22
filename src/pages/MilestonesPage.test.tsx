import type { ReactNode } from 'react';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Milestone } from '../types';
import MilestonesPage from './MilestonesPage';

const state = vi.hoisted(() => ({
 items: [] as Milestone[],
 listener: undefined as undefined | ((key: string) => void),
 undo: undefined as undefined | (() => void),
 failSave: false,
}));

vi.mock('../App', () => ({ useAuth: () => ({ isDemoMode: true }) }));
vi.mock('../lib/language', () => ({ useT: () => (en: string) => en }));
vi.mock('../lib/labels', () => ({ labelOf: (label: string) => label }));
vi.mock('../lib/dates', () => ({ formatDate: (date: string) => date }));
vi.mock('../lib/pageControls', () => ({ usePageControls: () => {} }));
vi.mock('../components/ui/PageShell', () => ({
 default: ({ children, actions }: { children: ReactNode; actions: ReactNode }) => <main>{actions}{children}</main>,
}));
vi.mock('../components/ui/EmptyHint', () => ({
 default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
 AskLink: ({ children }: { children: ReactNode }) => <button>{children}</button>,
 ClearFiltersButton: ({ onClick }: { onClick: () => void }) => <button onClick={onClick}>Clear filters</button>,
}));
vi.mock('../context/ToastContext', () => ({
 useToast: () => ({ toast: (message: { action?: { run: () => void } }) => { state.undo = message.action?.run; } }),
}));
vi.mock('../lib/localLists', () => ({
 scopedKey: (key: string) => key,
 keys: { milestones: 'milestones' },
 onDataChange: (listener: (key: string) => void) => {
  state.listener = listener;
  return () => { state.listener = undefined; };
 },
 upsertMilestone: (item: Milestone) => {
  state.items = [item, ...state.items.filter(other => other.id !== item.id)];
  state.listener?.('milestones');
  return [...state.items];
 },
}));
vi.mock('../services/milestoneService', () => ({
 milestoneService: {
  getMilestones: async () => ({ milestones: [...state.items], total: state.items.length }),
  createMilestone: async (input: Partial<Milestone>) => {
   if (state.failSave) throw new Error('Save failed');
   const created = { ...state.items[0], ...input, id: 'created-fixture' } as Milestone;
   state.items = [created, ...state.items];
   // Match the real service: synchronous write notification arrives before
   // the create promise settles, so the page refresh races its local commit.
   state.listener?.('milestones');
   return created;
  },
  updateMilestone: async (id: string, updates: Partial<Milestone>) => {
   if (state.failSave) throw new Error('Save failed');
   state.items = state.items.map(item => item.id === id ? { ...item, ...updates } : item);
   state.listener?.('milestones');
   return state.items.find(item => item.id === id)!;
  },
  deleteMilestone: async (id: string) => {
   state.items = state.items.filter(item => item.id !== id);
   state.listener?.('milestones');
  },
 },
}));

beforeEach(() => {
 localStorage.clear();
 state.items = [{
  id: 'existing-fixture', title: 'Existing goal', targetDate: '2027-01-01',
  status: 'Planned', category: 'Product', priority: 'Medium',
  progress: 0, tasks: [], ownerId: 'fixture',
  createdAt: '2026-10-22T00:00:00.000Z', updatedAt: '2026-10-22T00:00:00.000Z',
 }];
 state.listener = undefined;
 state.undo = undefined;
 state.failSave = false;
});

const table = () => screen.getByRole('region', { name: /Milestone details table/ });

describe('milestone editing after the clarity layout change', () => {
 it('restores a closed and remounted draft without creating a milestone', async () => {
  const user = userEvent.setup();
  const page = render(<MilestonesPage />);
  await screen.findByRole('region', { name: /Milestone details table/ });
  await user.click(screen.getAllByRole('button', { name: 'Add Milestone' })[0]!);
  await user.type(screen.getByRole('textbox', { name: 'Milestone title' }), 'Protected draft');
  await user.click(screen.getByRole('button', { name: 'Close' }));
  expect(screen.queryByRole('textbox', { name: 'Milestone title' })).not.toBeInTheDocument();
  page.unmount();
  render(<MilestonesPage />);
  expect(screen.getByRole('textbox', { name: 'Milestone title' })).toHaveValue('Protected draft');
  expect(state.items).toHaveLength(1);
 });
 it('retains failed submissions and retries without duplicate records', async () => {
  const user = userEvent.setup();
  render(<MilestonesPage />);
  await screen.findByRole('region', { name: /Milestone details table/ });
  await user.click(screen.getAllByRole('button', { name: 'Add Milestone' })[0]!);
  await user.type(screen.getByRole('textbox', { name: 'Milestone title' }), 'Retry fixture');
  state.failSave = true;
  await user.click(screen.getByRole('button', { name: 'Save' }));
  expect(screen.getByRole('alert')).toHaveTextContent('Your draft is still here');
  expect(screen.getByRole('textbox', { name: 'Milestone title' })).toHaveValue('Retry fixture');
  state.failSave = false;
  await user.click(screen.getByRole('button', { name: 'Save' }));
  await waitFor(() => expect(within(table()).getAllByText('Retry fixture')).toHaveLength(1));
 });
 it('renders a created record once when a write notification wins the race', async () => {
  const user = userEvent.setup();
  render(<MilestonesPage />);
  await screen.findByRole('region', { name: /Milestone details table/ });
  expect(screen.getByRole('button', { name: /Overall/ }).textContent?.match(/%/g)).toHaveLength(1);
  await user.click(screen.getAllByRole('button', { name: 'Add Milestone' })[0]!);
  await user.type(screen.getByRole('textbox', { name: 'Milestone title' }), 'Race fixture');
  await user.click(screen.getByRole('button', { name: 'Save' }));
  await waitFor(() => expect(within(table()).getAllByText('Race fixture')).toHaveLength(1));
  expect(state.items.filter(item => item.id === 'created-fixture')).toHaveLength(1);
 });

 it('preserves an unsaved title across view switches and collapsed filters', async () => {
  const user = userEvent.setup();
  render(<MilestonesPage />);
  await screen.findByRole('region', { name: /Milestone details table/ });
  await user.click(screen.getAllByRole('button', { name: 'Add Milestone' })[0]!);
  const draft = screen.getByRole('textbox', { name: 'Milestone title' });
  await user.type(draft, 'Unfinished goal');
  await user.click(screen.getByRole('button', { name: 'Board' }));
  await user.click(screen.getByRole('button', { name: 'Timeline' }));
  await user.click(screen.getByRole('button', { name: 'Category filter' }));
  await user.click(screen.getByRole('button', { name: 'Category filter' }));
  await user.click(screen.getByRole('button', { name: 'List' }));
  expect(draft).toHaveValue('Unfinished goal');
  expect(draft).toBeVisible();
 });

 it('keeps edit, delete and undo reachable with concurrent list notifications', async () => {
  const user = userEvent.setup();
  render(<MilestonesPage />);
  await screen.findByRole('region', { name: /Milestone details table/ });
  await user.click(within(table()).getByRole('button', { name: 'Edit milestone: Existing goal' }));
  const draft = screen.getByRole('textbox', { name: 'Milestone title' });
  await user.clear(draft);
  await user.type(draft, 'Revised goal');
  await user.click(screen.getByRole('button', { name: 'Update' }));
  await waitFor(() => expect(within(table()).getAllByText('Revised goal')).toHaveLength(1));
  await user.click(within(table()).getByRole('button', { name: 'Delete milestone: Revised goal' }));
  await waitFor(() => expect(screen.queryAllByText('Revised goal')).toHaveLength(0));
  expect(state.undo).toBeTypeOf('function');
  act(() => { state.undo!(); });
  await waitFor(() => expect(within(table()).getAllByText('Revised goal')).toHaveLength(1));
  expect(state.items.map(item => item.id)).toEqual(['existing-fixture']);
 });
});
