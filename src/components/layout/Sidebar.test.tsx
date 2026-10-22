import type { ComponentProps } from 'react';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { AccountStatus, ProfileStatus, UserRole, VerificationStatus } from '../../types';
import Sidebar from './Sidebar';

vi.mock('../../lib/notificationFeed', () => ({
  useNotificationFeed: () => ({ unread: 0 }),
}));
vi.mock('../../context/TenantContext', () => ({
  useTenant: () => ({ tenant: null }),
}));
vi.mock('../../context/MessagingContext', () => ({
  useOptionalMessaging: () => null,
}));
vi.mock('../../lib/account', () => ({
  signOutAccount: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../../lib/language', () => ({
  getLang: () => 'en',
  useLanguage: () => 'en',
}));

type SidebarProps = ComponentProps<typeof Sidebar>;
const user: SidebarProps['user'] = {
  id: 'test-founder',
  fullName: 'Test Founder',
  email: 'founder@example.test',
  roles: [UserRole.FOUNDER],
  profileStatus: ProfileStatus.PUBLISHED,
  verificationStatus: VerificationStatus.UNVERIFIED,
  profileCompletionScore: 100,
  accountStatus: AccountStatus.ACTIVE,
  onboardingCompleted: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

let mobile = false;
const viewportListeners = new Set<() => void>();

beforeEach(() => {
  // jsdom 25 lacks PointerEvent; Motion uses it for native keyboard presses.
  vi.stubGlobal('PointerEvent', MouseEvent);
  mobile = false;
  viewportListeners.clear();
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: vi.fn((query: string) => ({
      get matches() { return query === '(max-width: 1023px)' && mobile; },
      media: query,
      onchange: null,
      addEventListener: (_event: string, listener: () => void) => {
        if (query === '(max-width: 1023px)') viewportListeners.add(listener);
      },
      removeEventListener: (_event: string, listener: () => void) => {
        viewportListeners.delete(listener);
      },
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function LocationReadout() {
  return <output data-testid="location">{useLocation().pathname}</output>;
}

function navigation(overrides: Partial<SidebarProps> = {}) {
  return (
    <MemoryRouter initialEntries={['/dashboard']}>
      <Sidebar user={user} collapsed={false} setCollapsed={vi.fn()} mobileOpen={false} {...overrides} />
      <LocationReadout />
    </MemoryRouter>
  );
}

describe('Sidebar navigation controls', () => {
  it('exposes the collapse action as a keyboard-operable button', async () => {
    const setCollapsed = vi.fn();
    render(navigation({ setCollapsed }));
    const control = screen.getByRole('button', { name: 'Collapse sidebar' });
    expect(control).toHaveAttribute('aria-expanded', 'true');
    expect(control).toHaveAttribute('aria-controls', 'primary-navigation');
    control.focus();
    await userEvent.setup().keyboard('{Enter}');
    expect(setCollapsed).toHaveBeenCalledWith(true);
  });

  it('keeps Settings independent from the profile link', async () => {
    const setMobileOpen = vi.fn();
    render(navigation({ setMobileOpen }));
    expect(screen.getByRole('link', { name: 'Open your profile' })).toHaveAttribute('href', '/profile');
    await userEvent.setup().click(screen.getByRole('button', { name: 'Settings' }));
    expect(screen.getByTestId('location')).toHaveTextContent('/settings');
    expect(setMobileOpen).toHaveBeenCalledWith(false);
  });

  it('makes the closed mobile drawer inert and restores it when opened', () => {
    mobile = true;
    const view = render(navigation());
    const drawer = view.container.querySelector('aside');
    expect(drawer).toHaveAttribute('inert');
    expect(drawer).toHaveAttribute('aria-hidden', 'true');
    expect(screen.queryByRole('navigation', { name: 'Primary navigation' })).not.toBeInTheDocument();
    view.rerender(navigation({ mobileOpen: true }));
    expect(drawer).not.toHaveAttribute('inert');
    expect(screen.getByRole('navigation', { name: 'Primary navigation' })).toBeInTheDocument();
  });

  it('restores desktop navigation after crossing the responsive breakpoint', () => {
    mobile = true;
    const view = render(navigation());
    const drawer = view.container.querySelector('aside');
    expect(drawer).toHaveAttribute('inert');
    act(() => {
      mobile = false;
      viewportListeners.forEach((listener) => listener());
    });
    expect(drawer).not.toHaveAttribute('inert');
    expect(drawer).toHaveAttribute('aria-hidden', 'false');
  });
});
