import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import DictationButton from './DictationButton';

type Result = { results: ArrayLike<ArrayLike<{ transcript: string }>> };

class FakeRecognition {
  static last: FakeRecognition | null = null;
  lang = '';
  interimResults = false;
  continuous = false;
  onresult: ((event: Result) => void) | null = null;
  onend: (() => void) | null = null;
  onerror: ((event: { error?: string }) => void) | null = null;
  start = vi.fn();
  stop = vi.fn(() => this.onend?.());
  abort = vi.fn();
  constructor() {
    FakeRecognition.last = this;
  }
}

const speechWindow = window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown };
const originalMatchMedia = window.matchMedia;

function pointer(coarse: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query.includes('coarse') ? coarse : false,
    media: query,
    onchange: null,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => false,
  }));
}

beforeEach(() => {
  FakeRecognition.last = null;
  speechWindow.SpeechRecognition = FakeRecognition;
  pointer(true);
});

afterEach(() => {
  delete speechWindow.SpeechRecognition;
  delete speechWindow.webkitSpeechRecognition;
  window.matchMedia = originalMatchMedia;
});

describe('dictation into the assistant box', () => {
  it('puts what was heard after what is already typed, and sends nothing', async () => {
    const onChange = vi.fn();
    render(<DictationButton value="Find" onChange={onChange} />);
    await userEvent.click(await screen.findByRole('button', { name: 'Dictate the question' }));
    expect(FakeRecognition.last?.start).toHaveBeenCalled();
    expect(FakeRecognition.last?.lang).toBe('en-US');
    expect(screen.getByRole('status')).toHaveTextContent('Listening…');
    act(() => FakeRecognition.last!.onresult!({ results: [[{ transcript: 'a technical co-founder' }]] }));
    expect(onChange).toHaveBeenLastCalledWith('Find a technical co-founder');
    await userEvent.click(screen.getByRole('button', { name: 'Stop dictation' }));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Dictate the question' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('says when dictation failed, and a silence is not a failure', async () => {
    render(<DictationButton value="" onChange={() => undefined} />);
    await userEvent.click(await screen.findByRole('button', { name: 'Dictate the question' }));
    act(() => {
      FakeRecognition.last!.onerror!({ error: 'no-speech' });
      FakeRecognition.last!.onend!();
    });
    expect(screen.getByRole('button', { name: 'Dictate the question' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Dictate the question' }));
    act(() => {
      FakeRecognition.last!.onerror!({ error: 'not-allowed' });
      FakeRecognition.last!.onend!();
    });
    expect(screen.getByRole('button', { name: 'Dictation did not work. Try again' })).toBeInTheDocument();
  });

  it('is not offered where the browser cannot listen', () => {
    delete speechWindow.SpeechRecognition;
    render(<DictationButton value="" onChange={() => undefined} />);
    expect(screen.queryByRole('button', { name: 'Dictate the question' })).not.toBeInTheDocument();
  });

  it('is not offered with a mouse, where typing is easy', () => {
    pointer(false);
    render(<DictationButton value="" onChange={() => undefined} />);
    expect(screen.queryByRole('button', { name: 'Dictate the question' })).not.toBeInTheDocument();
  });
});
