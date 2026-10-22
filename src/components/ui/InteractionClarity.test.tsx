import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Modal, { ConfirmDialog } from './Modal';
import Button from './Button';
import Tabs from './Tabs';

vi.mock('../../lib/language', () => ({ useT: () => (en: string) => en }));

beforeEach(() => {
  vi.stubGlobal('PointerEvent', MouseEvent);
  vi.spyOn(HTMLElement.prototype, 'getClientRects').mockReturnValue([{ width: 40, height: 30 }] as unknown as DOMRectList);
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('dialog keyboard clarity', () => {
  function Example() {
    const [open, setOpen] = useState(false);
    return <>
      <button onClick={() => setOpen(true)}>Open editor</button>
      <Modal open={open} title="Edit details" description="Changes are saved only when you choose Save." onClose={() => setOpen(false)}>
        <input aria-label="Name" />
        <Button onClick={() => setOpen(false)}>Save</Button>
      </Modal>
    </>;
  }
  it('announces its title/description, contains Tab navigation and restores focus on Escape', async () => {
    const user = userEvent.setup();
    render(<Example />);
    const trigger = screen.getByRole('button', { name: 'Open editor' });
    await user.click(trigger);
    const dialog = screen.getByRole('dialog', { name: 'Edit details' });
    expect(dialog).toHaveAccessibleDescription('Changes are saved only when you choose Save.');
    expect(dialog).toHaveFocus();
    await user.tab();
    expect(within(dialog).getByRole('button', { name: 'Close' })).toHaveFocus();
    within(dialog).getByRole('button', { name: 'Save' }).focus();
    await user.tab();
    expect(within(dialog).getByRole('button', { name: 'Close' })).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(trigger).toHaveFocus();
  });
  it('does not dismiss an in-progress destructive confirmation or trigger it on opening', () => {
    const close = vi.fn();
    const confirm = vi.fn();
    render(<ConfirmDialog open loading title="Remove connection?" onClose={close} onConfirm={confirm} />);
    expect(screen.getByRole('dialog')).toHaveFocus();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(close).not.toHaveBeenCalled();
    expect(confirm).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
  });
  it('restores an existing body overflow setting after closing', () => {
    document.body.style.overflow = 'scroll';
    const { unmount } = render(<Modal open title="Details" onClose={() => {}}>Content</Modal>);
    expect(document.body.style.overflow).toBe('hidden');
    unmount();
    expect(document.body.style.overflow).toBe('scroll');
    document.body.style.overflow = '';
  });
});

describe('shared action and view controls', () => {
  it('exposes loading state without changing the action name', () => {
    render(<Button loading>Save changes</Button>);
    const button = screen.getByRole('button', { name: 'Save changes' });
    expect(button).toHaveAttribute('type', 'button');
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(button).toHaveAttribute('data-size', 'md');
    expect(button).toHaveAttribute('data-variant', 'primary');
    expect(button).toBeDisabled();
  });
  it('exposes the selected view and supports arrow focus without unexpectedly changing content', async () => {
    const user = userEvent.setup();
    const change = vi.fn();
    render(<Tabs label="Connections" tabs={[{ id: 'all', label: 'All' }, { id: 'incoming', label: 'Incoming' }]} activeTab="all" onChange={change} variant="segment" />);
    const all = screen.getByRole('button', { name: 'All' });
    const incoming = screen.getByRole('button', { name: 'Incoming' });
    expect(screen.getByRole('group', { name: 'Connections' })).toBeInTheDocument();
    expect(all).toHaveAttribute('aria-pressed', 'true');
    all.focus();
    await user.keyboard('{ArrowRight}');
    expect(incoming).toHaveFocus();
    expect(change).not.toHaveBeenCalled();
    await user.keyboard('{Enter}');
    expect(change).toHaveBeenCalledWith('incoming');
  });
  it('distinguishes selected filters without turning them into competing black primary actions', () => {
    render(<Tabs label="People" tabs={[{ id: 'all', label: 'All people' }, { id: 'saved', label: 'Saved people' }]} activeTab="saved" onChange={() => {}} />);
    const selected = screen.getByRole('button', { name: 'Saved people' });
    expect(selected).toHaveAttribute('aria-pressed', 'true');
    expect(selected).toHaveAttribute('data-ui', 'view-option');
    expect(selected).toHaveClass('bg-stone-100', 'border-stone-300');
    expect(selected).not.toHaveClass('bg-stone-900', 'text-white');
    expect(screen.getByRole('button', { name: 'All people' })).toHaveAttribute('aria-pressed', 'false');
  });
  it('keeps secondary actions secondary while retaining their click behavior', async () => {
    const user = userEvent.setup();
    const action = vi.fn();
    render(<Button variant="outline" onClick={action}>Compare options</Button>);
    const button = screen.getByRole('button', { name: 'Compare options' });
    expect(button).toHaveAttribute('data-variant', 'outline');
    expect(button).not.toHaveClass('bg-stone-900');
    await user.click(button);
    expect(action).toHaveBeenCalledOnce();
  });
});
