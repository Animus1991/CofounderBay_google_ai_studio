import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { sendEmailVerification } from 'firebase/auth';
import EmailVerificationRow from './EmailVerificationRow';

const session = vi.hoisted(() => ({ currentUser: null as null | { email: string; emailVerified: boolean } }));
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));

vi.mock('../../firebase', () => ({ auth: session }));
vi.mock('firebase/auth', () => ({ sendEmailVerification: vi.fn() }));
vi.mock('../../context/ToastContext', () => ({ useToast: () => toast }));

beforeEach(() => { vi.clearAllMocks(); });
afterEach(cleanup);

describe('the email confirmation row', () => {
  it('says nothing without an account', () => {
    session.currentUser = null;
    const { container } = render(<EmailVerificationRow />);
    expect(container.textContent).toBe('');
  });

  it('says so when the email is confirmed', () => {
    session.currentUser = { email: 'a@b.test', emailVerified: true };
    render(<EmailVerificationRow />);
    expect(screen.getByTestId('email-verified')).toBeTruthy();
  });

  it('sends the link again and reports it', async () => {
    session.currentUser = { email: 'a@b.test', emailVerified: false };
    vi.mocked(sendEmailVerification).mockResolvedValueOnce(undefined);
    render(<EmailVerificationRow />);
    fireEvent.click(screen.getByRole('button'));
    await waitFor(() => expect(toast.success).toHaveBeenCalled());
    expect(sendEmailVerification).toHaveBeenCalledOnce();
  });

  it('says so when it could not be sent', async () => {
    session.currentUser = { email: 'a@b.test', emailVerified: false };
    vi.mocked(sendEmailVerification).mockRejectedValueOnce(new Error('too-many-requests'));
    render(<EmailVerificationRow />);
    fireEvent.click(screen.getByRole('button'));
    await waitFor(() => expect(toast.error).toHaveBeenCalled());
  });
});
