import { useEffect, useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Disclosure from './Disclosure';

afterEach(() => vi.useRealTimers());

describe('secondary tool disclosure', () => {
 it('starts quiet with a named control and a separate explanatory description', async () => {
  const user = userEvent.setup();
  render(<Disclosure title="Round tools" hint="Cap table and meetings"><input aria-label="Draft" /></Disclosure>);
  const toggle = screen.getByRole('button', { name: 'Round tools' });
  const panel = document.getElementById(toggle.getAttribute('aria-controls')!)!;
  expect(toggle).toHaveAttribute('aria-expanded', 'false');
  expect(toggle).toHaveAccessibleDescription('Cap table and meetings');
  expect(panel).not.toBeVisible();
  await user.click(toggle);
  expect(toggle).toHaveAttribute('aria-expanded', 'true');
  expect(screen.getByRole('region', { name: 'Round tools' })).toBeVisible();
 });

 it('keeps a draft and its component instance when tools are closed', async () => {
  const user = userEvent.setup();
  const mounted = vi.fn();
  function Draft() {
   const [value, setValue] = useState('');
   useEffect(() => { mounted(); }, []);
   return <input aria-label="Milestone draft" value={value} onChange={e => setValue(e.target.value)} />;
  }
  render(<Disclosure title="Planning"><Draft /></Disclosure>);
  const toggle = screen.getByRole('button', { name: 'Planning' });
  await user.click(toggle);
  const input = screen.getByRole('textbox', { name: 'Milestone draft' });
  await user.type(input, 'Keep this unfinished goal');
  await user.click(toggle);
  expect(input).not.toBeVisible();
  expect(input).toHaveValue('Keep this unfinished goal');
  await user.click(toggle);
  expect(input).toBeVisible();
  expect(input).toHaveValue('Keep this unfinished goal');
  expect(mounted).toHaveBeenCalledTimes(1);
 });

 it('does not stop a mounted timer when its panel is closed', () => {
  vi.useFakeTimers();
  function Timer() {
   const [seconds, setSeconds] = useState(0);
   useEffect(() => {
    const interval = setInterval(() => setSeconds(value => value + 1), 1000);
    return () => clearInterval(interval);
   }, []);
   return <output data-testid="elapsed">{seconds}</output>;
  }
  render(<Disclosure title="Focus timer" defaultOpen><Timer /></Disclosure>);
  fireEvent.click(screen.getByRole('button', { name: 'Focus timer' }));
  act(() => { vi.advanceTimersByTime(3000); });
  expect(screen.getByTestId('elapsed')).toHaveTextContent('3');
  expect(screen.getByTestId('elapsed')).not.toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Focus timer' }));
  expect(screen.getByTestId('elapsed')).toBeVisible();
 });

 it('supports Enter and Space without losing keyboard focus', async () => {
  const user = userEvent.setup();
  render(<Disclosure title="Files"><button>Upload</button></Disclosure>);
  await user.tab();
  const toggle = screen.getByRole('button', { name: 'Files' });
  expect(toggle).toHaveFocus();
  await user.keyboard('{Enter}');
  expect(toggle).toHaveAttribute('aria-expanded', 'true');
  expect(toggle).toHaveFocus();
  await user.keyboard(' ');
  expect(toggle).toHaveAttribute('aria-expanded', 'false');
  expect(toggle).toHaveFocus();
 });

 it('gives separate sections unique panels and independent state', async () => {
  const user = userEvent.setup();
  render(<><Disclosure title="Files">File tools</Disclosure><Disclosure title="Stats">Sprint stats</Disclosure></>);
  const files = screen.getByRole('button', { name: 'Files' });
  const stats = screen.getByRole('button', { name: 'Stats' });
  expect(files.getAttribute('aria-controls')).not.toBe(stats.getAttribute('aria-controls'));
  await user.click(files);
  expect(files).toHaveAttribute('aria-expanded', 'true');
  expect(stats).toHaveAttribute('aria-expanded', 'false');
  expect(files).not.toHaveAttribute('aria-describedby');
 });
});
