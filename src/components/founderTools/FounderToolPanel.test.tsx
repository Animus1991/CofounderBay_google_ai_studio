import { describe, expect, it, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import FounderToolPanel from './FounderToolPanel';
import { isInteractiveTool, CALCULATOR_TOOLS } from './tools';
import { TOOL_DOCS } from '../../data/toolDocs';
import { readRound } from '../../lib/localLists';

const renderTool = (toolId: string, name = toolId) =>
  render(
    <MemoryRouter>
      <FounderToolPanel toolId={toolId} toolName={name} onClose={() => {}} onToast={() => {}} />
    </MemoryRouter>,
  );

afterEach(() => localStorage.clear());

describe('Founder Tools panel', () => {
  it('opens something for every tile except the pitch deck (which opens its own tab)', () => {
    const tiles = ['incorporation', 'nda', 'ip', 'terms', 'privacy', 'model', 'captable', 'safe', 'valuation', 'burn', 'roadmap', 'prd', 'user-research', 'specs', 'launch', 'gtm', 'content', 'one-pager', 'metrics', 'hiring', 'offer', 'equity', 'handbook', 'reviews'];
    expect(tiles.every(isInteractiveTool)).toBe(true);
    expect(isInteractiveTool('pitch-deck')).toBe(false);
    expect(CALCULATOR_TOOLS.length + Object.keys(TOOL_DOCS).length).toBe(tiles.length);
  });

  it('computes post-money SAFE ownership and can save the terms to the round', () => {
    renderTool('safe', 'SAFE Note');
    expect(screen.getByRole('dialog', { name: 'SAFE Note' })).toBeTruthy();
    expect(screen.getByTestId('safe-ownership').textContent).toBe('6.25%');
    fireEvent.change(screen.getByLabelText('Post-money cap ($)'), { target: { value: '10000000' } });
    expect(screen.getByTestId('safe-ownership').textContent).toBe('5%');
    fireEvent.click(screen.getByRole('button', { name: /Use these terms for my round/ }));
    expect(readRound().valuationCap).toBe(10_000_000);
  });

  it('shows runway and default-alive from the inputs', () => {
    renderTool('burn', 'Burn Rate');
    fireEvent.change(screen.getByLabelText('Cash on hand ($)'), { target: { value: '120000' } });
    fireEvent.change(screen.getByLabelText('Monthly expenses ($)'), { target: { value: '20000' } });
    fireEvent.change(screen.getByLabelText(/Expense growth per month/), { target: { value: '0' } });
    expect(screen.getByTestId('runway-months').textContent).toBe('6 months');
    expect(screen.getByTestId('runway-alive').textContent).toMatch(/Dead/);
  });

  it('opens a document outline with the legal disclaimer and real actions', () => {
    renderTool('nda', 'NDA Generator');
    expect(screen.getByText(/not legal advice/)).toBeTruthy();
    expect(screen.getByRole('button', { name: /Draft it with the assistant/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Download outline/ })).toBeTruthy();
  });

  it('sizes an equity grant from the cap table', () => {
    renderTool('equity', 'Equity Grant');
    // Default real-account cap table: 10,000,000 founder shares; 1% grant.
    expect(screen.getByTestId('grant-shares').textContent).toBe((100_000).toLocaleString());
  });
});
