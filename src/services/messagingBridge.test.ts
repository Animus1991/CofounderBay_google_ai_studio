import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { registerMessagingBridge, type MessagingBridge } from '../lib/messagingBridge';
import { resetAllLists, writeMatchFilters } from '../lib/localLists';
import { writePitchSlide } from '../lib/pitch';
import { assistantContextBlock, runAssistant } from './assistantOps';

const profile = {
  fullName: 'Demo User',
  skills: ['React'],
  lookingFor: ['Sales'],
  industry: 'FinTech',
  stage: 'Pre-seed',
  commitment: 'Full-time',
  location: 'Athens',
  timezone: 'Europe/Athens',
};

function fakeBridge(real = false): MessagingBridge {
  return {
    real,
    threads: () => [
      { conversationId: 'a', personId: 'alex-rivera', name: 'Alex Rivera', kind: 'demo', unread: 2, muted: false, lastMessage: 'Pitch tomorrow', lastMessageAt: 3, lastFromMe: false },
      { conversationId: 'j', personId: 'jordan-taylor', name: 'Jordan Taylor', kind: 'demo', unread: 1, muted: false, lastMessage: 'Growth notes', lastMessageAt: 2, lastFromMe: false },
      { conversationId: 's', personId: 'sarah-chen', name: 'Sarah Chen', kind: 'demo', unread: 0, muted: false, lastMessage: 'Read', lastMessageAt: 1, lastFromMe: true },
      { conversationId: 'm', personId: 'marcus-thorne', name: 'Marcus Thorne', kind: 'demo', unread: 4, muted: true, lastMessage: 'Muted', lastMessageAt: 4, lastFromMe: false },
    ],
    totalUnread: () => 3,
    searchable: () => [{ conversationId: 'a', name: 'Alex Rivera', body: 'The secret roadmap', createdAt: 4 }],
    canSendTo: () => null,
    sendToPerson: vi.fn(async () => ({ ok: true as const, conversationId: 'demo-sarah', messageId: 'new-1' })),
    unsend: vi.fn(async () => undefined),
  };
}

describe('assistant messaging bridge', () => {
  beforeEach(() => {
    resetAllLists();
    localStorage.setItem('demo_mode', 'true');
  });

  afterEach(() => {
    registerMessagingBridge(null);
  });

  it('lists the badge total and only unread, non-muted threads', () => {
    registerMessagingBridge(fakeBridge());
    const result = runAssistant('Which messages are unread?', profile);
    expect(result.en).toContain('3 unread');
    expect(result.en).toContain('Alex Rivera · 2 unread');
    expect(result.en).toContain('Jordan Taylor · 1 unread');
    expect(result.en).not.toContain('Marcus Thorne');
    expect(result.en).not.toContain('Sarah Chen');
  });

  it('searches loaded bridge message bodies', () => {
    registerMessagingBridge(fakeBridge());
    expect(runAssistant('search my messages for secret', profile).en).toContain('The secret roadmap');
  });

  it.each([[false, 'full'], [true, 'partial']] as const)('sends and undoes with honest reversal (real=%s)', async (real, reversal) => {
    const bridge = fakeBridge(real);
    registerMessagingBridge(bridge);
    const result = runAssistant('/msg Sarah Chen: Hello there', profile, { propose: true });
    expect(result.proposal?.reversal).toBe(reversal);
    if (real) expect(result.proposal?.reversalNote?.en).toContain('may already have seen it or been notified');
    await result.proposal!.apply();
    expect(bridge.sendToPerson).toHaveBeenCalledWith('sarah-chen', 'Hello there');
    await result.proposal!.undo!();
    expect(bridge.unsend).toHaveBeenCalledWith('demo-sarah', 'new-1');
  });

  it('sends immediately when proposal mode is disabled', async () => {
    const bridge = fakeBridge();
    registerMessagingBridge(bridge);
    runAssistant('/msg Sarah Chen: Direct send', profile, { propose: false });
    await vi.waitFor(() => expect(bridge.sendToPerson).toHaveBeenCalledWith('sarah-chen', 'Direct send'));
  });

  it('refuses connections-only messaging and suggests connecting', () => {
    const bridge = fakeBridge();
    bridge.canSendTo = () => 'connections-only';
    registerMessagingBridge(bridge);
    const result = runAssistant('/msg Sarah Chen: Hello', profile, { propose: true });
    expect(result.proposal).toBeUndefined();
    expect(result.followUps?.[0]?.en).toBe('Connect with Sarah Chen');
  });

  it('adds compact live sources to the context block', () => {
    registerMessagingBridge(fakeBridge());
    writeMatchFilters({ q: '', role: 'Founder', stage: 'Pre-seed', commitment: '', location: '', skill: '', industry: '' });
    writePitchSlide('problem', 'A'.repeat(70));
    const context = assistantContextBlock(profile);
    expect(context).toContain('Match filters in effect: role=Founder · stage=Pre-seed');
    expect(context).toContain('Pitch deck:');
    expect(context).toContain('Messages: 3 unread (Alex Rivera 2, Jordan Taylor 1)');
  });
});
