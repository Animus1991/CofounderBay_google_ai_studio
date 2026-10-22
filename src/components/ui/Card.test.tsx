import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import Card from './Card';

describe('card shell and content spacing', () => {
 it('applies row layout and a gap to the actual content container', () => {
  render(<Card className="bg-stone-900 p-4" contentClassName="flex items-center justify-between gap-3"><span>Savings</span><span>Icon</span></Card>);
  const content = screen.getByText('Savings').parentElement!;
  expect(content).toHaveAttribute('data-ui', 'card-content');
  expect(content).toHaveClass('flex', 'items-center', 'justify-between', 'gap-3', 'w-full');
  expect(content.parentElement).toHaveClass('bg-stone-900', 'p-4', 'flex', 'flex-col');
  expect(content.parentElement).not.toHaveClass('gap-3');
 });

 it('gives a stacked search and filter real separation without fixing their heights', () => {
  render(<Card contentClassName="flex flex-col gap-2 sm:flex-row"><input aria-label="Search" /><button>Filters</button></Card>);
  const content = screen.getByRole('textbox').parentElement!;
  expect(content).toHaveClass('gap-2', 'flex-col', 'sm:flex-row', 'p-4', 'sm:p-5');
  expect(content.className).not.toMatch(/(?:min-|max-)?h-\d/);
  expect(screen.getByRole('button', { name: 'Filters' }).parentElement).toBe(content);
 });

 it('does not add double padding when the caller pads the shell', () => {
  render(<Card className="p-3"><span>Content</span></Card>);
  const content = screen.getByText('Content').parentElement!;
  expect(content).not.toHaveClass('p-4', 'sm:p-5');
  expect(content.parentElement).toHaveClass('p-3');
 });

 it('separates content from a titled divider and footer in caller-padded cards', () => {
  render(<Card title="Section" className="p-4" footer={<button>Save</button>}><span>Body</span></Card>);
  const content = screen.getByText('Body').parentElement!;
  expect(content).toHaveClass('pt-3', 'pb-3');
  expect(screen.getByRole('heading', { name: 'Section' })).toBeVisible();
  expect(screen.getByRole('button', { name: 'Save' })).toBeVisible();
 });

 it('preserves explicit full-bleed content and existing click handlers', () => {
  const clicked = vi.fn();
  render(<Card noPadding title="Full bleed" onClick={clicked}><span>Full width</span></Card>);
  const content = screen.getByText('Full width').parentElement!;
  expect(content).not.toHaveClass('p-4', 'pt-3', 'pb-3');
  fireEvent.click(screen.getByText('Full width'));
  expect(clicked).toHaveBeenCalledTimes(1);
 });
});
