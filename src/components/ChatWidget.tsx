import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Bot, Check, ChevronRight, Copy, MessageSquare, Minimize2, Send, Sparkles, Square, SquarePen, ThumbsDown, ThumbsUp, X } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import { Both } from '../lib/both';
import { bothText, labelOf } from '../lib/labels';
import { useLanguage, useT } from '../lib/language';
import { appendAssistant, clearAssistant, keys, readAssistant, readAssistantFeedback, updateAssistantTurn, writeAssistant, writeAssistantFeedback, type AssistantTurn } from '../lib/localLists';
import { useStored } from '../lib/useStored';
import { AIService, MOCK_AGENTS } from '../services/aiService';
import { ASSISTANT_PAGES, assistantContextBlock, pageContext, runAssistant, SLASH_COMMANDS, type AssistantFollowUp, type AssistantLink, type AssistantProposal, type AssistantResult } from '../services/assistantOps';
import { filterSlash, startersFor } from '../lib/assistantStarters';
import { mergeFitIntoViewer } from '../lib/fitCheck';
import { directoryPeople } from '../lib/peopleSource';
import { useAuth } from '../App';
import { useToast } from '../context/ToastContext';
import { onPageControlsChange, readPageControls } from '../lib/pageControls';

type Bubble = AssistantTurn & {
  links?: AssistantLink[];
  followUps?: AssistantFollowUp[];
  /** In-memory only — never written into the persisted transcript. */
  proposal?: AssistantProposal;
  resolved?: 'confirmed' | 'cancelled' | 'undone';
  /** Epoch ms until which the inline Undo button shows under a confirmed card. */
  undoUntil?: number;
};

function viewerFromAuth(profile: ReturnType<typeof useAuth>['profile']) {
  const base = profile
    ? {
        fullName: profile.fullName,
        headline: profile.headline,
        bio: profile.bio,
        skills: profile.skills,
        lookingFor: profile.lookingFor,
        interests: profile.interests,
        industry: profile.industry,
        stage: profile.stage,
        commitment: profile.commitment,
        location: profile.location,
        timezone: profile.timezone,
      }
    : null;
  return mergeFitIntoViewer(base);
}

export default function ChatWidget() {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, user, isDemoMode } = useAuth();
  const { mode } = useLanguage();
  const t = useT();
  const toast = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [tab, setTab] = useState<'studio' | 'agents'>('studio');
  const [agentId, setAgentId] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [stopped, setStopped] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [pageOpen, setPageOpen] = useState(false);
  const storedTurns = useStored(readAssistant, [keys.assistant]);
  const [turns, setTurns] = useState<Bubble[]>(() => readAssistant());
  const [agentTurns, setAgentTurns] = useState<Bubble[]>([]);
  const [queuedPrompt, setQueuedPrompt] = useState<string | null>(null);
  const [pinnedContext, setPinnedContext] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const runRef = useRef<(raw: string) => Promise<void>>(async () => undefined);
  const stopRef = useRef(false);
  const turnsRef = useRef<Bubble[]>(turns);
  const undoingRef = useRef<Set<string>>(new Set());

  useEffect(() => { turnsRef.current = turns; }, [turns]);

  // The persisted transcript is the source of truth across tabs and accounts.
  // In-memory proposal / undo fields ride along by matching turn ids.
  useEffect(() => {
    setTurns((prev) => {
      const overlay = new Map(prev.map((bubble) => [bubble.id, bubble]));
      return storedTurns.map((turn) => {
        const extra = overlay.get(turn.id);
        if (!extra) return turn;
        return {
          ...turn,
          proposal: extra.proposal,
          resolved: extra.resolved,
          undoUntil: extra.undoUntil,
          links: extra.links ?? turn.links,
          followUps: extra.followUps ?? turn.followUps,
        };
      });
    });
  }, [storedTurns]);

  const visibleTurns = tab === 'studio' ? turns : agentTurns;
  const agent = MOCK_AGENTS.find((item) => item.id === agentId);
  const page = useMemo(() => pageContext(location.pathname), [location.pathname]);
  const pageControls = useSyncExternalStore(onPageControlsChange, readPageControls);
  const pageStarters = useMemo(() => startersFor(location.pathname, profile?.role ?? profile?.roles?.[0]), [location.pathname, profile]);
  const feedback = useStored(readAssistantFeedback, [keys.assistantFeedback]);
  const feedbackMap = useMemo(() => new Map(feedback.map((item) => [item.turnId, item.value])), [feedback]);

  const rate = (turnId: string, value: 'up' | 'down') => {
    writeAssistantFeedback(turnId, value);
    if (user && !isDemoMode) {
      void import('../firebase').then(async ({ db }) => {
        const { collection, addDoc } = await import('firebase/firestore');
        await addDoc(collection(db, 'aiUsage'), { userId: user.uid, kind: 'feedback', value, at: new Date().toISOString() });
      }).catch(() => undefined);
    }
  };
  const slashHits = filterSlash(
    [
      { cmd: '/new', en: 'Start a new conversation', el: 'Ξεκίνα νέα συνομιλία' },
      { cmd: '/clear', en: 'Start a new conversation', el: 'Ξεκίνα νέα συνομιλία' },
      { cmd: '/compact', en: 'Keep the last few turns', el: 'Κράτα τις τελευταίες στροφές' },
      ...SLASH_COMMANDS,
    ],
    inputText,
  );
  const atQuery = inputText.startsWith('@') && !inputText.includes(' ') ? inputText.slice(1).toLowerCase() : null;
  const atHits = atQuery === null
    ? []
    : directoryPeople().filter((person) => !atQuery || person.fullName.toLowerCase().includes(atQuery)).slice(0, 6);

  useEffect(() => {
    const open = (event: Event) => {
      const detail = (event as CustomEvent<{ prompt?: string; agentId?: string; context?: string }>).detail;
      setIsOpen(true);
      setIsMinimized(false);
      if (detail?.agentId) {
        setTab('agents');
        setAgentId(detail.agentId);
        setAgentTurns([]);
      } else {
        setTab('studio');
        setAgentId(null);
      }
      if (detail?.context?.trim()) setPinnedContext(detail.context.trim());
      if (detail?.prompt?.trim()) setQueuedPrompt(detail.prompt.trim());
    };
    window.addEventListener('OPEN_AI_CHAT', open);
    window.addEventListener('OPEN_ASSISTANT', open);
    return () => {
      window.removeEventListener('OPEN_AI_CHAT', open);
      window.removeEventListener('OPEN_ASSISTANT', open);
    };
  }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [visibleTurns, isTyping, isOpen]);

  const speak = (result: AssistantResult): string => (mode === 'el' ? result.el : result.en);

  const pushStudio = (bubble: Bubble) => {
    appendAssistant({ role: bubble.role, text: bubble.text, href: bubble.href, tool: bubble.tool, sources: bubble.sources, links: bubble.links, followUps: bubble.followUps });
    setTurns((prev) => [...prev, bubble].slice(-80));
  };

  const resetStudio = () => {
    stopRef.current = true;
    setIsTyping(false);
    setStopped(false);
    setPageOpen(false);
    clearAssistant();
    setTurns([]);
    setInputText('');
    setPinnedContext(null);
  };

  const stop = () => {
    stopRef.current = true;
    setIsTyping(false);
    setStopped(true);
  };

  const pinPerson = (name: string) => {
    setPinnedContext(name);
    setInputText('');
  };

  const copyText = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      window.setTimeout(() => setCopiedId((prev) => (prev === id ? null : prev)), 2000);
    } catch {
      toast.info(t('Copy this reply from the bubble', 'Αντίγραψε την απάντηση από τη φούσκα'));
    }
  };

  /** The same Gemini "polish" step the direct answer path runs. */
  const polishReply = async (replyId: string, payload: string, result: AssistantResult) => {
    setIsTyping(true);
    try {
      const polished = await Promise.race([
        AIService.chat(
          `The founder said: ${payload}\nYou already ran the tool "${result.tool}". Restate this result in ${mode === 'el' ? 'Greek' : 'English'} only. Do not invent people, scores, or amounts that are not in the result.\nResult:\n${mode === 'el' ? result.el : result.en}`,
          `On page ${page.en} (${page.href}).\n${assistantContextBlock(viewerFromAuth(profile))}`,
        ),
        new Promise<{ text: string }>((_, reject) => { window.setTimeout(() => reject(new Error('timeout')), 4500); }),
      ]);
      if (stopRef.current) return;
      if (polished.text?.trim()) {
        const text = polished.text.trim();
        setTurns((prev) => prev.map((item) => (item.id === replyId ? { ...item, text } : item)));
        updateAssistantTurn(replyId, { text });
      }
    } catch {
      /* the deterministic answer stays */
    } finally {
      setIsTyping(false);
    }
  };

  const cancelProposal = (msg: Bubble) => {
    const text = t('Cancelled — nothing changed.', 'Ακυρώθηκε — τίποτα δεν άλλαξε.');
    setTurns((prev) => prev.map((item) => (item.id === msg.id
      ? { ...item, text, resolved: 'cancelled' as const }
      : item)));
    updateAssistantTurn(msg.id, { text });
  };

  const undoProposal = async (id: string) => {
    const msg = turnsRef.current.find((item) => item.id === id);
    if (!msg?.proposal?.undo || msg.resolved !== 'confirmed' || undoingRef.current.has(id)) return;
    // Mark undone synchronously — a second click from the toast or the inline
    // button before the async undo settles must not run the write twice.
    undoingRef.current.add(id);
    setIsTyping(true);
    setTurns((prev) => prev.map((item) => (item.id === id ? { ...item, resolved: 'undone' as const, undoUntil: 0 } : item)));
    try {
      await msg.proposal.undo();
    } catch {
      undoingRef.current.delete(id);
      setTurns((prev) => prev.map((item) => (item.id === id ? { ...item, resolved: 'confirmed' as const } : item)));
      toast.error(t('That did not go through', 'Δεν ολοκληρώθηκε'), t('Nothing changed.', 'Τίποτα δεν άλλαξε.'));
      setIsTyping(false);
      return;
    }
    setIsTyping(false);
    pushStudio({ id: `a-undone-${Date.now()}`, role: 'assistant', text: t('Undone.', 'Αναιρέθηκε.'), at: new Date().toISOString() });
  };

  const confirmProposal = async (msg: Bubble) => {
    const proposal = msg.proposal;
    if (!proposal || msg.resolved) return;
    setIsTyping(true);
    let final: AssistantResult;
    try {
      final = await proposal.apply();
    } catch {
      const text = t('That did not go through — nothing changed.', 'Δεν ολοκληρώθηκε — τίποτα δεν άλλαξε.');
      setTurns((prev) => prev.map((item) => (item.id === msg.id ? { ...item, text, resolved: 'cancelled' as const } : item)));
      updateAssistantTurn(msg.id, { text });
      toast.error(t('That did not go through', 'Δεν ολοκληρώθηκε'), t('Nothing changed.', 'Τίποτα δεν άλλαξε.'));
      setIsTyping(false);
      return;
    }
    setIsTyping(false);
    const text = speak(final);
    setTurns((prev) => prev.map((item) => (item.id === msg.id
      ? {
          ...item,
          text,
          href: final.href,
          links: final.links,
          followUps: final.followUps,
          sources: final.sources,
          resolved: 'confirmed' as const,
          undoUntil: proposal.undo ? Date.now() + 60_000 : 0,
        }
      : item)));
    updateAssistantTurn(msg.id, { text, href: final.href, links: final.links, followUps: final.followUps, sources: final.sources, tool: final.tool });
    if (proposal.undo) {
      toast.toast({
        type: 'success',
        title: t('Done', 'Έγινε'),
        description: mode === 'el' ? proposal.summary.el : proposal.summary.en,
        duration: 8000,
        action: { label: t('Undo', 'Αναίρεση'), run: () => { void undoProposal(msg.id); } },
      });
      window.setTimeout(() => setTurns((prev) => prev.map((item) => (item.id === msg.id ? { ...item, undoUntil: 0 } : item))), 60_000);
    }
    const index = turnsRef.current.findIndex((item) => item.id === msg.id);
    const userSaid = turnsRef.current.slice(0, index).reverse().find((item) => item.role === 'user')?.text ?? '';
    void polishReply(msg.id, userSaid, final);
  };

  const run = async (raw: string) => {
    const text = raw.trim();
    if (!text || isTyping) return;
    setInputText('');
    setStopped(false);
    setPageOpen(false);
    if (/^\/(clear|new)\b/i.test(text)) {
      resetStudio();
      return;
    }
    if (/^\/compact\b/i.test(text)) {
      const next = turnsRef.current.slice(-8);
      writeAssistant(next);
      setTurns(next);
      return;
    }
    const payload = pinnedContext ? `${pinnedContext}: ${text}` : text;
    stopRef.current = false;

    if (tab === 'agents' && agent) {
      const userBubble: Bubble = { id: `u-${Date.now()}`, role: 'user', text: payload, at: new Date().toISOString() };
      setAgentTurns((prev) => [...prev, userBubble]);
      setIsTyping(true);
      try {
        const context = `${agent.role}. On ${page.en}. ${assistantContextBlock(viewerFromAuth(profile))}`;
        const response = await AIService.chat(payload, context);
        if (stopRef.current) {
          setAgentTurns((prev) => [...prev, { id: `stop-${Date.now()}`, role: 'assistant', text: t('Stopped', 'Διακόπηκε'), at: new Date().toISOString() }]);
          return;
        }
        setAgentTurns((prev) => [...prev, { id: `a-${Date.now()}`, role: 'assistant', text: response.text, at: new Date().toISOString() }]);
      } catch {
        if (stopRef.current) {
          setAgentTurns((prev) => [...prev, { id: `stop-${Date.now()}`, role: 'assistant', text: t('Stopped', 'Διακόπηκε'), at: new Date().toISOString() }]);
          return;
        }
        const fallback = runAssistant(payload, viewerFromAuth(profile));
        setAgentTurns((prev) => [...prev, { id: `a-${Date.now()}`, role: 'assistant', text: speak(fallback), href: fallback.href, links: fallback.links, followUps: fallback.followUps, tool: fallback.tool, at: new Date().toISOString() }]);
      } finally {
        setIsTyping(false);
      }
      return;
    }

    // A new message cancels every pending proposal — only the newest is actionable.
    const cancelledText = t('Cancelled — nothing changed.', 'Ακυρώθηκε — τίποτα δεν άλλαξε.');
    for (const item of turnsRef.current) {
      if (item.role === 'assistant' && item.proposal && !item.resolved) updateAssistantTurn(item.id, { text: cancelledText });
    }
    setTurns((prev) => prev.map((item) => (item.role === 'assistant' && item.proposal && !item.resolved
      ? { ...item, text: cancelledText, resolved: 'cancelled' as const }
      : item)));

    const userBubble: Bubble = { id: `u-${Date.now()}`, role: 'user', text: payload, at: new Date().toISOString() };
    pushStudio(userBubble);
    if (user && !isDemoMode) {
      void import('../firebase').then(async ({ db }) => {
        const { collection, addDoc } = await import('firebase/firestore');
        await addDoc(collection(db, 'aiUsage'), { userId: user.uid, kind: 'chat', at: new Date().toISOString() });
      }).catch(() => undefined);
    }
    const result = runAssistant(payload, viewerFromAuth(profile), { propose: true });
    const replyId = `a-${Date.now()}`;
    pushStudio({
      id: replyId,
      role: 'assistant',
      text: speak(result),
      href: result.href,
      links: result.links,
      followUps: result.followUps,
      tool: result.tool,
      sources: result.sources,
      proposal: result.proposal,
      at: new Date().toISOString(),
    });
    if (result.tool === 'navigate' && result.href) navigate(result.href);
    // A proposal is a question — it stays verbatim until confirmed, no polish.
    if (result.proposal) return;
    void polishReply(replyId, payload, result);
  };

  runRef.current = run;

  useEffect(() => {
    if (!isOpen || isMinimized || !queuedPrompt) return;
    const text = queuedPrompt;
    setQueuedPrompt(null);
    void runRef.current(text);
  }, [isOpen, isMinimized, queuedPrompt]);

  const follow = (link: AssistantLink) => {
    navigate(link.href);
    setIsMinimized(true);
  };

  return (
    <div className="fixed bottom-3 right-3 left-3 sm:left-auto sm:bottom-6 sm:right-6 z-[55] flex flex-col items-stretch sm:items-end gap-3 pointer-events-none">
      <AnimatePresence>
        {isOpen && !isMinimized && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="pointer-events-auto w-full sm:w-[380px] h-[min(560px,72dvh)] bg-white rounded-2xl shadow-sm border border-stone-200 flex flex-col overflow-hidden"
          >
            <div className="p-4 bg-stone-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center shrink-0">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs font-medium truncate">
                    {agent ? agent.name : <Both en="Assistant" el="Βοηθός" />}
                  </h3>
                  <p className="text-xs text-white/50 truncate">
                    {agent ? agent.role : <Both en="Reads and changes the same lists as every page" el="Διαβάζει και αλλάζει τις ίδιες λίστες με κάθε σελίδα" />}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button type="button" onClick={resetStudio} className="p-1.5 hover:bg-white/10 rounded-md" aria-label={bothText('New conversation', 'Νέα συνομιλία')}>
                  <SquarePen className="w-3.5 h-3.5" />
                </button>
                <button type="button" onClick={() => setIsMinimized(true)} className="p-1.5 hover:bg-white/10 rounded-md" aria-label={t('Minimize', 'Ελαχιστοποίηση')}>
                  <Minimize2 className="w-3.5 h-3.5" />
                </button>
                <button type="button" onClick={() => { setIsOpen(false); setPageOpen(false); }} className="p-1.5 hover:bg-white/10 rounded-md" aria-label={t('Close', 'Κλείσιμο')}>
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {!agent && (
              <div className="flex border-b border-stone-100 shrink-0">
                {(['studio', 'agents'] as const).map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setTab(item)}
                    className={cn(
                      'flex-1 py-3 text-xs font-medium transition-colors',
                      tab === item ? 'text-stone-900 border-b-2 border-stone-900' : 'text-stone-400 hover:text-stone-600',
                    )}
                  >
                    {item === 'studio' ? <Both en="Assistant" el="Βοηθός" /> : <Both en="Specialists" el="Ειδικοί" />}
                  </button>
                ))}
              </div>
            )}

            <div className="flex-1 overflow-hidden flex flex-col bg-stone-50/30">
              {tab === 'agents' && !agent ? (
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {MOCK_AGENTS.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => { setAgentId(item.id); setAgentTurns([]); }}
                      className="w-full p-3 bg-white rounded-xl border border-stone-100 hover:border-stone-300 text-left flex items-start gap-3"
                    >
                      {item.avatar ? (
                        <img src={item.avatar} alt="" className="w-9 h-9 rounded-lg object-cover shrink-0" />
                      ) : (
                        <span className="w-9 h-9 rounded-lg bg-stone-900 text-white flex items-center justify-center text-base shrink-0" aria-hidden="true">{item.icon}</span>
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-stone-900">{item.name}</p>
                        <p className="text-xs text-stone-500 line-clamp-2">{item.description}</p>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <>
                  {agent && (
                    <div className="p-3 bg-white border-b border-stone-100 flex items-center gap-2 shrink-0">
                      <button type="button" onClick={() => { setAgentId(null); setAgentTurns([]); }} className="p-1 hover:bg-stone-100 rounded-md" aria-label={t('Back', 'Πίσω')}>
                        <ChevronRight className="w-4 h-4 rotate-180" />
                      </button>
                      <span className="text-xs font-medium text-stone-900">{agent.name}</span>
                    </div>
                  )}
                  <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
                    {visibleTurns.length === 0 && (
                      <p className="text-xs text-stone-500 leading-relaxed">
                        <Both
                          en={`On ${page.en}. Questions about this page lead. I use the same people, scores, milestones and round as the rest of the studio — and I can change them. Type / for shortcuts.`}
                          el={`Στο ${page.el}. Οι ερωτήσεις αυτής της σελίδας προηγούνται. Χρησιμοποιώ τους ίδιους ανθρώπους, σκορ, ορόσημα και γύρο με την υπόλοιπη εφαρμογή — και μπορώ να τα αλλάξω. Πληκτρολόγησε / για συντομεύσεις.`}
                        />
                      </p>
                    )}
                    {visibleTurns.map((msg, index) => {
                      const lastAssistant = msg.role === 'assistant' && visibleTurns.slice(index + 1).every((item) => item.role !== 'assistant');
                      return (
                      <div key={msg.id} className={cn('flex flex-col max-w-[90%] gap-1.5', msg.role === 'user' ? 'ml-auto items-end' : 'mr-auto items-start')}>
                        <div className={cn(
                          'p-3 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap',
                          msg.role === 'user' ? 'bg-stone-900 text-white rounded-tr-none' : 'bg-white border border-stone-100 text-stone-800 rounded-tl-none',
                        )}>
                          {msg.text}
                        </div>
                        {msg.role === 'assistant' && (
                          <div className="flex flex-wrap items-center gap-2">
                            {(msg.tool || msg.href) && (
                              <span className="studio-label">
                                {msg.href ? bothText(pageContext(msg.href).en, pageContext(msg.href).el) : bothText(page.en, page.el)}
                                {msg.tool ? ` · ${msg.tool}` : ''}
                              </span>
                            )}
                            <button type="button" onClick={() => copyText(msg.id, msg.text)} className="text-xs font-medium text-stone-500 hover:text-stone-900 inline-flex items-center gap-1" aria-label={t('Copy', 'Αντιγραφή')}>
                              {copiedId === msg.id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                            </button>
                            {feedbackMap.has(msg.id) ? (
                              <span className="text-xs text-stone-400">{t('Thanks', 'Ευχαριστούμε')}</span>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() => rate(msg.id, 'up')}
                                  className="text-stone-400 hover:text-stone-900 inline-flex items-center"
                                  aria-label={t('Helpful answer', 'Χρήσιμη απάντηση')}
                                >
                                  <ThumbsUp className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => rate(msg.id, 'down')}
                                  className="text-stone-400 hover:text-stone-900 inline-flex items-center"
                                  aria-label={t('Unhelpful answer', 'Μη χρήσιμη απάντηση')}
                                >
                                  <ThumbsDown className="w-3 h-3" />
                                </button>
                              </>
                            )}
                          </div>
                        )}
                        {msg.role === 'assistant' && msg.sources && msg.sources.length > 0 && (
                          <details className="w-full">
                            <summary className="cursor-pointer text-xs font-medium text-stone-500 hover:text-stone-900">
                              {t(`Read from (${msg.sources.length})`, `Ανάγνωση από (${msg.sources.length})`)}
                            </summary>
                            <ul className="mt-1 flex flex-col gap-0.5">
                              {msg.sources.map((source, sourceIndex) => (
                                <li key={`${source.kind}-${sourceIndex}`}>
                                  {source.href ? (
                                    <button
                                      type="button"
                                      onClick={() => { navigate(source.href!); setIsMinimized(true); }}
                                      className="text-xs font-medium text-stone-600 hover:text-stone-900 hover:underline"
                                    >
                                      {bothText(source.en, source.el)}
                                    </button>
                                  ) : (
                                    <span className="text-xs text-stone-500">{bothText(source.en, source.el)}</span>
                                  )}
                                </li>
                              ))}
                            </ul>
                          </details>
                        )}
                        {msg.links && msg.links.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {msg.links.slice(0, 4).map((link) => (
                              <button
                                key={link.href}
                                type="button"
                                onClick={() => follow(link)}
                                className="px-2 py-1 bg-white border border-stone-200 rounded-lg text-xs font-medium text-stone-600 hover:border-stone-900 hover:text-stone-900"
                              >
                                {bothText(link.en, link.el)}
                              </button>
                            ))}
                          </div>
                        )}
                        {msg.proposal && !msg.resolved && (
                          <div className="w-full bg-white border border-stone-200 rounded-xl p-3 space-y-2">
                            <p className="text-xs font-medium text-stone-900">{bothText(msg.proposal.summary.en, msg.proposal.summary.el)}</p>
                            <p className="text-xs text-stone-500">
                              {msg.proposal.reversal === 'full'
                                ? t('Reversible — Undo available', 'Αναστρέψιμο — διαθέσιμη Αναίρεση')
                                : msg.proposal.reversal === 'partial'
                                  ? t('Partly reversible', 'Μερικώς αναστρέψιμο')
                                  : t('Not reversible', 'Μη αναστρέψιμο')}
                              {msg.proposal.reversalNote ? ` — ${bothText(msg.proposal.reversalNote.en, msg.proposal.reversalNote.el)}` : ''}
                            </p>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => { void confirmProposal(msg); }}
                                className="min-h-8 px-3 bg-stone-900 text-white rounded-lg text-xs font-medium hover:bg-stone-800"
                              >
                                {t('Confirm', 'Επιβεβαίωση')}
                              </button>
                              <button
                                type="button"
                                onClick={() => cancelProposal(msg)}
                                className="min-h-8 px-3 bg-white border border-stone-200 text-stone-700 rounded-lg text-xs font-medium hover:border-stone-400"
                              >
                                {t('Cancel', 'Ακύρωση')}
                              </button>
                            </div>
                          </div>
                        )}
                        {msg.resolved === 'confirmed' && msg.proposal?.undo && msg.undoUntil ? (
                          <button
                            type="button"
                            onClick={() => { void undoProposal(msg.id); }}
                            className="text-xs font-medium text-stone-500 hover:text-stone-900 hover:underline"
                          >
                            {t('Undo', 'Αναίρεση')}
                          </button>
                        ) : null}
                        {lastAssistant && msg.followUps && msg.followUps.length > 0 && (
                          <div className="flex flex-col items-start gap-1" aria-label={bothText('Ask next', 'Ρώτα μετά')}>
                            {msg.followUps.map((prompt) => (
                              <button
                                key={prompt.en}
                                type="button"
                                onClick={() => run(mode === 'el' ? prompt.el : prompt.en)}
                                className="text-xs font-medium text-stone-900 hover:underline"
                              >
                                {bothText(prompt.en, prompt.el)}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      );
                    })}
                    {isTyping && (
                      <div className="flex items-center gap-2 text-stone-400">
                        <div className="w-6 h-6 rounded-full bg-stone-100 flex items-center justify-center">
                          <Bot className="w-3 h-3" />
                        </div>
                        <p className="text-xs font-medium">
                          <Both en="Studio is answering…" el="Ο βοηθός απαντά…" />
                        </p>
                        <div className="flex gap-1">
                          <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1 }} className="w-1 h-1 bg-stone-400 rounded-full" />
                          <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-1 h-1 bg-stone-400 rounded-full" />
                          <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-1 h-1 bg-stone-400 rounded-full" />
                        </div>
                      </div>
                    )}
                    {stopped && !isTyping && (
                      <p className="studio-label">{t('Stopped', 'Διακόπηκε')}</p>
                    )}
                  </div>
                  <div className="p-3 bg-white border-t border-stone-100 shrink-0">
                    {!agent && (
                      <div className="mb-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setPageOpen((open) => !open)}
                            className="px-2 py-0.5 bg-stone-50 border border-stone-100 rounded-lg text-xs font-medium text-stone-500 hover:text-stone-900 hover:border-stone-300"
                            aria-expanded={pageOpen}
                            aria-label={t('Page this chat is on', 'Σελίδα αυτής της συνομιλίας')}
                          >
                            {bothText(page.en, page.el)}
                          </button>
                          {pinnedContext && (
                            <button type="button" onClick={() => setPinnedContext(null)} className="px-2 py-0.5 bg-stone-900 text-white rounded-lg text-xs font-medium inline-flex items-center gap-1">
                              {pinnedContext}
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                        {pageOpen && (
                          <div className="mt-1.5 max-h-36 overflow-y-auto rounded-xl border border-stone-200 bg-white">
                            {ASSISTANT_PAGES.map((item) => (
                              <button
                                key={item.href}
                                type="button"
                                onClick={() => { navigate(item.href); setPageOpen(false); }}
                                className={cn(
                                  'w-full px-3 py-2 text-left text-xs hover:bg-stone-50',
                                  item.href === page.href ? 'font-medium text-stone-900' : 'text-stone-600',
                                )}
                              >
                                {bothText(item.en, item.el)}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    {slashHits.length > 0 && (
                      <div className="mb-2 max-h-36 overflow-y-auto rounded-xl border border-stone-200 bg-white">
                        {slashHits.map((item) => (
                          <button
                            key={item.cmd}
                            type="button"
                            onClick={() => {
                              setInputText('');
                              void run(item.cmd);
                            }}
                            className="w-full px-3 py-2 text-left hover:bg-stone-50 flex items-baseline gap-2"
                          >
                            <span className="text-xs font-mono font-medium text-stone-900">{item.cmd}</span>
                            <span className="text-xs text-stone-400 truncate">{bothText(item.en, item.el)}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    {atHits.length > 0 && (
                      <div className="mb-2 max-h-36 overflow-y-auto rounded-xl border border-stone-200 bg-white">
                        {atHits.map((person) => (
                          <button
                            key={person.id}
                            type="button"
                            onClick={() => pinPerson(person.fullName)}
                            className="w-full px-3 py-2 text-left hover:bg-stone-50 flex items-baseline gap-2"
                          >
                            <span className="text-xs font-medium text-stone-900">{person.fullName}</span>
                            <span className="text-xs text-stone-400 truncate">{labelOf(person.role)}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center gap-2 bg-stone-50 rounded-xl border border-stone-200 p-1 pr-2">
                      <input
                        type="text"
                        placeholder={isTyping
                          ? bothText('Studio is answering…', 'Ο βοηθός απαντά…')
                          : bothText('Ask, or type / or @ …', 'Ρώτα, ή πληκτρολόγησε / ή @ …')}
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onClick={() => { if (isTyping) stop(); }}
                        onKeyDown={(e) => {
                          if (e.key === 'Escape' && (slashHits.length || atHits.length)) { e.preventDefault(); setInputText(''); return; }
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            if (isTyping) { stop(); return; }
                            const onlyPerson = atHits[0];
                            if (atHits.length === 1 && onlyPerson) { pinPerson(onlyPerson.fullName); return; }
                            run(inputText);
                          }
                        }}
                        className="flex-1 min-h-11 bg-transparent border-none text-base sm:text-sm focus:ring-0 px-2"
                      />
                      {isTyping ? (
                        <button
                          type="button"
                          onClick={stop}
                          className="w-11 h-11 shrink-0 bg-stone-900 text-white rounded-lg flex items-center justify-center"
                          aria-label={bothText('Stop', 'Διακοπή')}
                        >
                          <Square className="w-3 h-3 fill-current" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => run(inputText)}
                          disabled={!inputText.trim()}
                          className="w-11 h-11 shrink-0 bg-stone-900 text-white rounded-lg flex items-center justify-center disabled:opacity-50"
                          aria-label={t('Send', 'Αποστολή')}
                        >
                          <Send className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    {pageControls.length > 0 && (
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <span className="text-xs text-stone-400 mr-0.5">{bothText('On this page:', 'Σε αυτή τη σελίδα:')}</span>
                        {pageControls.map((control) => (
                          <button
                            key={control.id}
                            type="button"
                            onClick={() => control.run()}
                            className="min-h-8 px-2.5 bg-stone-50 border border-stone-200 rounded-lg text-xs font-medium text-stone-600 hover:text-stone-900 hover:border-stone-400 inline-flex items-center gap-1"
                          >
                            <Sparkles className="w-3 h-3 text-stone-400" />
                            {bothText(control.en, control.el)}
                          </button>
                        ))}
                      </div>
                    )}
                    {!agent && visibleTurns.length === 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {pageStarters.map((prompt) => (
                          <button
                            key={prompt.en}
                            type="button"
                            onClick={() => run(mode === 'el' ? prompt.el : prompt.en)}
                            className="min-h-11 px-3 bg-white border border-stone-200 rounded-lg text-sm font-medium text-stone-500 hover:text-stone-900 hover:border-stone-400"
                          >
                            {bothText(prompt.en, prompt.el)}
                          </button>
                        ))}
                      </div>
                    )}
                    {agent?.suggestedPrompts && visibleTurns.length === 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {agent.suggestedPrompts.slice(0, 3).map((prompt) => (
                          <button key={prompt} type="button" onClick={() => run(prompt)} className="min-h-11 px-3 bg-white border border-stone-200 rounded-lg text-sm font-medium text-stone-500 hover:text-stone-900 hover:border-stone-400">
                            {prompt}
                          </button>
                        ))}
                      </div>
                    )}
                    <p className="mt-1.5 text-xs text-stone-400">
                      <Both en="Enter send · / shortcuts · @ person · Stop while answering · ⌘K" el="Enter αποστολή · / συντομεύσεις · @ άτομο · Διακοπή όσο απαντά · ⌘K" />
                    </p>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center gap-3 pointer-events-auto self-end">
        {isMinimized && isOpen && (
          <motion.button
            type="button"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={() => setIsMinimized(false)}
            className="h-12 px-4 bg-white border border-stone-200 rounded-2xl shadow-sm flex items-center gap-3 hover:bg-stone-50"
          >
            <Sparkles className="w-4 h-4 text-stone-900" />
            <span className="text-xs font-medium text-stone-900"><Both en="Assistant" el="Βοηθός" /></span>
          </motion.button>
        )}
        <motion.button
          type="button"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            if (isOpen && isMinimized) setIsMinimized(false);
            else setIsOpen(!isOpen);
          }}
          className={cn(
            'w-14 h-14 rounded-2xl shadow-sm flex items-center justify-center',
            isOpen && !isMinimized ? 'bg-stone-100 text-stone-900' : 'bg-stone-900 text-white',
          )}
          aria-label={bothText('Open studio assistant', 'Άνοιγμα βοηθού')}
        >
          {isOpen && !isMinimized ? <X className="w-6 h-6" /> : <MessageSquare className="w-6 h-6" />}
        </motion.button>
      </div>
    </div>
  );
}
