import { act, cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { messagingBridge, registerMessagingBridge, type BridgeSend } from '../lib/messagingBridge';
import { MessagingProvider } from './MessagingContext';

describe('MessagingProvider bridge', () => {
  afterEach(() => {
    cleanup();
    registerMessagingBridge(null);
  });

  it('sends into demo threads and undo restores or removes the thread exactly', async () => {
    render(
      <MessagingProvider
        userId="demo-user"
        isDemo
        me={{ id: 'demo-user', fullName: 'Demo User', avatar: '', headline: '', role: 'Founder' }}
      >
        <div />
      </MessagingProvider>,
    );
    await waitFor(() => expect(messagingBridge()).not.toBeNull());
    const bridge = messagingBridge()!;
    const sarahBefore = bridge.threads().find((thread) => thread.personId === 'sarah-chen')!;
    let sarahSend: Awaited<ReturnType<typeof bridge.sendToPerson>> = { ok: false, reason: 'unknown' };
    await act(async () => {
      sarahSend = await bridge.sendToPerson('sarah-chen', 'Hi');
    });
    expect(bridge.threads().find((thread) => thread.personId === 'sarah-chen')?.lastMessage).toBe('Hi');
    if (!sarahSend!.ok) throw new Error('send refused');
    const sentSarah = sarahSend as Extract<BridgeSend, { ok: true }>;
    await act(async () => {
      await bridge.unsend(sentSarah.conversationId, sentSarah.messageId);
    });
    expect(bridge.threads().find((thread) => thread.personId === 'sarah-chen')?.lastMessage).toBe(sarahBefore.lastMessage);

    let marcusSend: Awaited<ReturnType<typeof bridge.sendToPerson>> = { ok: false, reason: 'unknown' };
    await act(async () => {
      marcusSend = await bridge.sendToPerson('marcus-thorne', 'Hello Marcus');
    });
    expect(bridge.threads().some((thread) => thread.personId === 'marcus-thorne')).toBe(true);
    if (!marcusSend!.ok) throw new Error('send refused');
    const sentMarcus = marcusSend as Extract<BridgeSend, { ok: true }>;
    await act(async () => {
      await bridge.unsend(sentMarcus.conversationId, sentMarcus.messageId);
    });
    expect(bridge.threads().some((thread) => thread.personId === 'marcus-thorne')).toBe(false);
  });
});
