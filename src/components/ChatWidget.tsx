import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Bot, ChevronRight, MessageSquare, Minimize2, Send, Sparkles, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import { Both } from '../lib/both';
import { bothText } from '../lib/labels';
import { useLanguage } from '../lib/language';
import { appendAssistant, readAssistant, type AssistantTurn } from '../lib/localLists';
import { AIService, MOCK_AGENTS } from '../services/aiService';
import { assistantContextBlock, runAssistant, type AssistantLink, type AssistantResult } from '../services/assistantOps';
import { useAuth } from '../App';

const STARTERS: { en: string; el: string }[] = [
  { en: 'Who is my best match?', el: 'Ποια είναι η καλύτερη αντιστοίχιση;' },
  { en: 'What is overdue?', el: 'Τι είναι εκπρόθεσμο;' },
  { en: 'How is my round?', el: 'Πώς πάει ο γύρος;' },
  { en: 'Find a fundraising mentor', el: 'Βρες μέντορα για χρηματοδότηση' },
];

type Bubble = AssistantTurn & { links?: AssistantLink[] };

function viewerFromAuth(profile: ReturnType<typeof useAuth>['profile']) {
  if (!profile) return null;
  return {
    fullName: profile.fullName,
    headline: profile.headline,
    skills: profile.skills,
    lookingFor: profile.lookingFor,
    interests: profile.interests,
    industry: profile.industry,
    stage: profile.stage,
    commitment: profile.commitment,
    location: profile.location,
    timezone: profile.timezone,
  };
}

export default function ChatWidget() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { mode } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [tab, setTab] = useState<'studio' | 'agents'>('studio');
  const [agentId, setAgentId] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [turns, setTurns] = useState<Bubble[]>(() => readAssistant());
  const [agentTurns, setAgentTurns] = useState<Bubble[]>([]);
  const [queuedPrompt, setQueuedPrompt] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const runRef = useRef<(raw: string) => Promise<void>>(async () => undefined);

  const visibleTurns = tab === 'studio' ? turns : agentTurns;
  const agent = MOCK_AGENTS.find((item) => item.id === agentId);

  useEffect(() => {
    const open = (event: Event) => {
      const detail = (event as CustomEvent<{ prompt?: string }>).detail;
      setIsOpen(true);
      setIsMinimized(false);
      setTab('studio');
      setAgentId(null);
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

  const speak = (result: AssistantResult): string => {
    if (mode === 'el') return result.el;
    if (mode === 'en') return result.en;
    return `${result.en}\n${result.el}`;
  };

  const pushStudio = (bubble: Bubble) => {
    appendAssistant({ role: bubble.role, text: bubble.text, href: bubble.href });
    setTurns((prev) => [...prev, bubble].slice(-80));
  };

  const run = async (raw: string) => {
    const text = raw.trim();
    if (!text || isTyping) return;
    setInputText('');

    if (tab === 'agents' && agent) {
      const userBubble: Bubble = { id: `u-${Date.now()}`, role: 'user', text, at: new Date().toISOString() };
      setAgentTurns((prev) => [...prev, userBubble]);
      setIsTyping(true);
      try {
        const context = `${agent.role}. ${assistantContextBlock(viewerFromAuth(profile))}`;
        const response = await AIService.chat(text, context);
        setAgentTurns((prev) => [...prev, { id: `a-${Date.now()}`, role: 'assistant', text: response.text, at: new Date().toISOString() }]);
      } catch {
        const fallback = runAssistant(text, viewerFromAuth(profile));
        setAgentTurns((prev) => [...prev, { id: `a-${Date.now()}`, role: 'assistant', text: speak(fallback), href: fallback.href, links: fallback.links, at: new Date().toISOString() }]);
      } finally {
        setIsTyping(false);
      }
      return;
    }

    const userBubble: Bubble = { id: `u-${Date.now()}`, role: 'user', text, at: new Date().toISOString() };
    pushStudio(userBubble);
    const result = runAssistant(text, viewerFromAuth(profile));
    const replyId = `a-${Date.now()}`;
    pushStudio({
      id: replyId,
      role: 'assistant',
      text: speak(result),
      href: result.href,
      links: result.links,
      at: new Date().toISOString(),
    });
    if (result.tool === 'navigate' && result.href) navigate(result.href);
    try {
      const polished = await Promise.race([
        AIService.chat(
          `The founder said: ${text}\nYou already ran the tool "${result.tool}". Restate this result in ${mode === 'el' ? 'Greek' : mode === 'en' ? 'English' : 'English then Greek'}. Do not invent people, scores, or amounts that are not in the result.\nResult:\n${result.en}`,
          assistantContextBlock(viewerFromAuth(profile)),
        ),
        new Promise<{ text: string }>((_, reject) => { window.setTimeout(() => reject(new Error('timeout')), 4500); }),
      ]);
      if (polished.text?.trim()) {
        setTurns((prev) => prev.map((item) => (item.id === replyId ? { ...item, text: polished.text.trim() } : item)));
      }
    } catch {
      /* the deterministic answer stays */
    }
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
    <div className="fixed bottom-4 right-4 left-4 sm:left-auto sm:bottom-6 sm:right-6 z-[90] flex flex-col items-stretch sm:items-end gap-3 pointer-events-none">
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
                    {agent ? agent.name : <Both en="Studio assistant" el="Βοηθός του στούντιο" />}
                  </h3>
                  <p className="text-xs text-white/50 truncate">
                    {agent ? agent.role : <Both en="Reads and changes the same lists as every page" el="Διαβάζει και αλλάζει τις ίδιες λίστες με κάθε σελίδα" />}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button type="button" onClick={() => setIsMinimized(true)} className="p-1.5 hover:bg-white/10 rounded-md" aria-label="Minimize">
                  <Minimize2 className="w-3.5 h-3.5" />
                </button>
                <button type="button" onClick={() => setIsOpen(false)} className="p-1.5 hover:bg-white/10 rounded-md" aria-label="Close">
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
                    {item === 'studio' ? <Both en="Studio" el="Στούντιο" /> : <Both en="Specialists" el="Ειδικοί" />}
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
                      <img src={item.avatar} alt="" className="w-9 h-9 rounded-lg object-cover shrink-0" />
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
                      <button type="button" onClick={() => { setAgentId(null); setAgentTurns([]); }} className="p-1 hover:bg-stone-100 rounded-md" aria-label="Back">
                        <ChevronRight className="w-4 h-4 rotate-180" />
                      </button>
                      <span className="text-xs font-medium text-stone-900">{agent.name}</span>
                    </div>
                  )}
                  <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
                    {visibleTurns.length === 0 && (
                      <p className="text-xs text-stone-500 leading-relaxed">
                        <Both
                          en="Ask in English or Greek. I use the same people, scores, milestones and round as the rest of the studio — and I can change them."
                          el="Ρώτα στα αγγλικά ή ελληνικά. Χρησιμοποιώ τους ίδιους ανθρώπους, σκορ, ορόσημα και γύρο με την υπόλοιπη εφαρμογή — και μπορώ να τα αλλάξω."
                        />
                      </p>
                    )}
                    {visibleTurns.map((msg) => (
                      <div key={msg.id} className={cn('flex flex-col max-w-[90%] gap-1.5', msg.role === 'user' ? 'ml-auto items-end' : 'mr-auto items-start')}>
                        <div className={cn(
                          'p-3 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap',
                          msg.role === 'user' ? 'bg-stone-900 text-white rounded-tr-none' : 'bg-white border border-stone-100 text-stone-800 rounded-tl-none',
                        )}>
                          {msg.text}
                        </div>
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
                      </div>
                    ))}
                    {isTyping && (
                      <div className="flex items-center gap-2 text-stone-400">
                        <div className="w-6 h-6 rounded-full bg-stone-100 flex items-center justify-center">
                          <Bot className="w-3 h-3" />
                        </div>
                        <div className="flex gap-1">
                          <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1 }} className="w-1 h-1 bg-stone-400 rounded-full" />
                          <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-1 h-1 bg-stone-400 rounded-full" />
                          <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-1 h-1 bg-stone-400 rounded-full" />
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="p-3 bg-white border-t border-stone-100 shrink-0">
                    {!agent && visibleTurns.length === 0 && (
                      <div className="mb-2 flex flex-wrap gap-1.5">
                        {STARTERS.map((prompt) => (
                          <button
                            key={prompt.en}
                            type="button"
                            onClick={() => run(mode === 'el' ? prompt.el : prompt.en)}
                            className="px-2 py-1 bg-stone-50 border border-stone-100 rounded-lg text-xs font-medium text-stone-500 hover:text-stone-900 hover:border-stone-900"
                          >
                            {bothText(prompt.en, prompt.el)}
                          </button>
                        ))}
                      </div>
                    )}
                    {agent?.suggestedPrompts && visibleTurns.length === 0 && (
                      <div className="mb-2 flex flex-wrap gap-1.5">
                        {agent.suggestedPrompts.slice(0, 3).map((prompt) => (
                          <button key={prompt} type="button" onClick={() => run(prompt)} className="px-2 py-1 bg-stone-50 border border-stone-100 rounded-lg text-xs font-medium text-stone-500 hover:text-stone-900 hover:border-stone-900">
                            {prompt}
                          </button>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center gap-2 bg-stone-50 rounded-xl border border-stone-200 p-1 pr-2">
                      <input
                        type="text"
                        placeholder={bothText('Ask or tell the studio…', 'Ρώτα ή πες στο στούντιο…')}
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); run(inputText); } }}
                        className="flex-1 bg-transparent border-none text-xs focus:ring-0 px-2 py-1.5"
                      />
                      <button
                        type="button"
                        onClick={() => run(inputText)}
                        disabled={!inputText.trim() || isTyping}
                        className="w-8 h-8 bg-stone-900 text-white rounded-lg flex items-center justify-center disabled:opacity-50"
                        aria-label="Send"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                    </div>
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
          aria-label={bothText('Open studio assistant', 'Άνοιγμα βοηθού στούντιο')}
        >
          {isOpen && !isMinimized ? <X className="w-6 h-6" /> : <MessageSquare className="w-6 h-6" />}
        </motion.button>
      </div>
    </div>
  );
}
