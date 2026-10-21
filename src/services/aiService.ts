import { appEnv } from "../config/env";
import { createLogger } from "../lib/logger";
import { auth } from "../firebase";
import { getLang } from "../lib/language";
const aiLog = createLogger("ai-service");

interface GenerateParams {
  model: string;
  contents: unknown;
  config?: Record<string, unknown>;
}

/** The model the server uses unless GEMINI_MODEL overrides it there. */
export const DEFAULT_AI_MODEL = appEnv.geminiModel || "gemini-flash-latest";

/**
 * Single Gemini entry point.
 *
 * SECURITY: when `appEnv.aiUseProxy` is true (the production default), the
 * request goes through the server-side proxy (`POST /api/ai/generate`) with the
 * member's Firebase ID token, so the API key never ships in the client bundle
 * and the server can rate-limit per member. The direct SDK path (dynamically
 * imported) is kept for local development only.
 */
async function generateContent(params: GenerateParams): Promise<{ text: string }> {
  if (appEnv.aiUseProxy || !appEnv.geminiApiKey) {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    try {
      const token = await auth.currentUser?.getIdToken();
      if (token) headers.Authorization = `Bearer ${token}`;
    } catch {
      /* anonymous requests are rate-limited harder by the server */
    }
    const response = await fetch(`${appEnv.apiBaseUrl}/api/ai/generate`, {
      method: "POST",
      headers,
      body: JSON.stringify(params),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(`AI proxy error (${response.status}): ${body?.error ?? "unknown"}`);
    }
    return (await response.json()) as { text: string };
  }
  const { GoogleGenAI } = await import("@google/genai");
  const client = new GoogleGenAI({ apiKey: appEnv.geminiApiKey });
  const response = await client.models.generateContent(params as never);
  return { text: response.text ?? "" };
}

export interface ChatMessage {
  role: 'user' | 'model' | 'system';
  content: string;
}

export const MOCK_AGENTS: AIAgent[] = [
  {
    id: 'a1',
    name: 'Co-founder Coach',
    nameEl: 'Σύμβουλος συνιδρυτών',
    role: 'Team formation',
    roleEl: 'Σύνθεση ομάδας',
    description: 'Helps you describe the co-founder you need, prepare first conversations and agree on roles.',
    descriptionEl: 'Σε βοηθά να περιγράψεις τον συνιδρυτή που χρειάζεσαι, να προετοιμάσεις τις πρώτες συζητήσεις και να συμφωνήσετε ρόλους.',
    avatar: '',
    icon: '🤝',
    status: 'Active',
    capabilities: ['Profile review', 'Skill gaps', 'First-meeting questions'],
    capabilitiesEl: ['Έλεγχος προφίλ', 'Κενά δεξιοτήτων', 'Ερωτήσεις πρώτης γνωριμίας'],
    suggestedPrompts: [
      'What should I look for in a technical co-founder?',
      'Which questions should we discuss before teaming up?',
      'How do we split roles between two founders?',
    ],
    suggestedPromptsEl: [
      'Τι να προσέξω σε έναν τεχνικό συνιδρυτή;',
      'Ποιες ερωτήσεις να συζητήσουμε πριν συνεργαστούμε;',
      'Πώς μοιράζουμε ρόλους ανάμεσα σε δύο ιδρυτές;',
    ],
  },
  {
    id: 'a2',
    name: 'Pitch Deck Reviewer',
    nameEl: 'Αξιολογητής pitch deck',
    role: 'Investor readiness',
    roleEl: 'Ετοιμότητα για επενδυτές',
    description: 'Attach a slide image or paste your deck text for feedback on clarity, story and what investors will ask.',
    descriptionEl: 'Επισύναψε εικόνα διαφάνειας ή επικόλλησε το κείμενο του deck για σχόλια σε σαφήνεια, αφήγηση και ερωτήσεις επενδυτών.',
    avatar: '',
    icon: '🎯',
    status: 'Active',
    capabilities: ['Deck review', 'Storytelling', 'Investor questions'],
    capabilitiesEl: ['Έλεγχος deck', 'Αφήγηση', 'Ερωτήσεις επενδυτών'],
    suggestedPrompts: [
      'Review the structure of my pitch deck',
      'Is my market sizing approach sound?',
      'What will investors ask about my team slide?',
    ],
    suggestedPromptsEl: [
      'Έλεγξε τη δομή του pitch deck μου',
      'Είναι σωστή η προσέγγισή μου για το μέγεθος αγοράς;',
      'Τι θα ρωτήσουν οι επενδυτές για τη διαφάνεια της ομάδας;',
    ],
  },
  {
    id: 'a3',
    name: 'Startup Advisor',
    nameEl: 'Σύμβουλος startup',
    role: 'Strategy',
    roleEl: 'Στρατηγική',
    description: 'Helps you sharpen the idea, the business model and the plan for your first customers.',
    descriptionEl: 'Σε βοηθά να ξεκαθαρίσεις την ιδέα, το επιχειρηματικό μοντέλο και το σχέδιο για τους πρώτους πελάτες.',
    avatar: '',
    icon: '🧭',
    status: 'Active',
    capabilities: ['Idea refinement', 'Business model', 'First customers'],
    capabilitiesEl: ['Δούλεμα ιδέας', 'Επιχειρηματικό μοντέλο', 'Πρώτοι πελάτες'],
    suggestedPrompts: [
      'Help me sharpen my startup idea',
      'Critique my business model',
      'How do I get my first 10 customers?',
    ],
    suggestedPromptsEl: [
      'Βοήθησέ με να ξεκαθαρίσω την ιδέα μου',
      'Κάνε κριτική στο επιχειρηματικό μου μοντέλο',
      'Πώς βρίσκω τους πρώτους 10 πελάτες;',
    ],
  },
  {
    id: 'a4',
    name: 'Market Analyst',
    nameEl: 'Αναλυτής αγοράς',
    role: 'Market research',
    roleEl: 'Έρευνα αγοράς',
    description: 'Walks you through market sizing, competitor mapping and how to validate demand with real data.',
    descriptionEl: 'Σε καθοδηγεί στο μέγεθος αγοράς, στη χαρτογράφηση ανταγωνισμού και στην επικύρωση ζήτησης με πραγματικά δεδομένα.',
    avatar: '',
    icon: '📈',
    status: 'Active',
    capabilities: ['Market sizing', 'Competitor map', 'Demand validation'],
    capabilitiesEl: ['Μέγεθος αγοράς', 'Χάρτης ανταγωνισμού', 'Επικύρωση ζήτησης'],
    suggestedPrompts: [
      'How do I estimate TAM, SAM and SOM?',
      'How should I map my competitors?',
      'How do I validate demand before building?',
    ],
    suggestedPromptsEl: [
      'Πώς εκτιμώ TAM, SAM και SOM;',
      'Πώς χαρτογραφώ τους ανταγωνιστές μου;',
      'Πώς επικυρώνω τη ζήτηση πριν χτίσω;',
    ],
  },
  {
    id: 'a5',
    name: 'Fundraising Coach',
    nameEl: 'Σύμβουλος χρηματοδότησης',
    role: 'Fundraising',
    roleEl: 'Άντληση κεφαλαίων',
    description: 'Helps you plan a round: how much to raise, instruments, investor lists and outreach.',
    descriptionEl: 'Σε βοηθά να σχεδιάσεις έναν γύρο: πόσα να αντλήσεις, εργαλεία χρηματοδότησης, λίστα επενδυτών και προσέγγιση.',
    avatar: '',
    icon: '💶',
    status: 'Active',
    capabilities: ['Round planning', 'SAFE and equity', 'Investor outreach'],
    capabilitiesEl: ['Σχεδιασμός γύρου', 'SAFE και μετοχές', 'Προσέγγιση επενδυτών'],
    suggestedPrompts: [
      'How much should I raise at pre-seed?',
      'SAFE or priced round: what are the trade-offs?',
      'How do I build a target investor list?',
    ],
    suggestedPromptsEl: [
      'Πόσα να αντλήσω στο pre-seed;',
      'SAFE ή γύρος με αποτίμηση: τι κερδίζω και τι χάνω;',
      'Πώς φτιάχνω λίστα επενδυτών-στόχων;',
    ],
  },
  {
    id: 'a6',
    name: 'Legal Guide',
    nameEl: 'Νομικός οδηγός',
    role: 'Legal basics (not legal advice)',
    roleEl: 'Νομικά βασικά (όχι νομική συμβουλή)',
    description: 'Explains company forms, founder agreements, IP and GDPR basics, and what to ask a lawyer.',
    descriptionEl: 'Εξηγεί εταιρικές μορφές, συμφωνίες ιδρυτών, πνευματική ιδιοκτησία και GDPR, και τι να ρωτήσεις έναν δικηγόρο.',
    avatar: '',
    icon: '⚖️',
    status: 'Active',
    capabilities: ['Company formation', 'Founder agreements', 'IP and GDPR'],
    capabilitiesEl: ['Σύσταση εταιρείας', 'Συμφωνίες ιδρυτών', 'IP και GDPR'],
    suggestedPrompts: [
      'Which company form fits an early startup in Greece?',
      'What belongs in a founder agreement?',
      'How do I make sure the company owns the IP?',
    ],
    suggestedPromptsEl: [
      'Ποια εταιρική μορφή ταιριάζει σε μια startup στην Ελλάδα;',
      'Τι πρέπει να περιέχει μια συμφωνία ιδρυτών;',
      'Πώς εξασφαλίζω ότι η εταιρεία κατέχει την πνευματική ιδιοκτησία;',
    ],
  },
  {
    id: 'a7',
    name: 'Technical Advisor',
    nameEl: 'Τεχνικός σύμβουλος',
    role: 'Product engineering',
    roleEl: 'Τεχνολογία προϊόντος',
    description: 'Helps with stack choices, architecture, MVP scope and hiring the first engineers.',
    descriptionEl: 'Βοηθά σε επιλογή τεχνολογιών, αρχιτεκτονική, εύρος MVP και πρόσληψη των πρώτων μηχανικών.',
    avatar: '',
    icon: '💻',
    status: 'Active',
    capabilities: ['Stack choice', 'Architecture', 'MVP scope'],
    capabilitiesEl: ['Επιλογή τεχνολογιών', 'Αρχιτεκτονική', 'Εύρος MVP'],
    suggestedPrompts: [
      'Which stack fits a real-time web app?',
      'How do I scope an MVP in six weeks?',
      'How do I hire my first engineer?',
    ],
    suggestedPromptsEl: [
      'Ποιες τεχνολογίες ταιριάζουν σε web εφαρμογή πραγματικού χρόνου;',
      'Πώς οριοθετώ ένα MVP σε έξι εβδομάδες;',
      'Πώς προσλαμβάνω τον πρώτο μηχανικό;',
    ],
  },
  {
    id: 'a8',
    name: 'Growth Strategist',
    nameEl: 'Σύμβουλος ανάπτυξης',
    role: 'Go-to-market',
    roleEl: 'Είσοδος στην αγορά',
    description: 'Helps you choose channels, run growth experiments and keep the users you win.',
    descriptionEl: 'Σε βοηθά να διαλέξεις κανάλια, να τρέξεις πειράματα ανάπτυξης και να κρατήσεις τους χρήστες που κερδίζεις.',
    avatar: '',
    icon: '🚀',
    status: 'Active',
    capabilities: ['Channel choice', 'Growth experiments', 'Retention'],
    capabilitiesEl: ['Επιλογή καναλιών', 'Πειράματα ανάπτυξης', 'Διατήρηση χρηστών'],
    suggestedPrompts: [
      'Draft a go-to-market plan for my product',
      'Which low-cost growth experiments should I run first?',
      'How do I reduce churn?',
    ],
    suggestedPromptsEl: [
      'Γράψε ένα σχέδιο εισόδου στην αγορά για το προϊόν μου',
      'Ποια φθηνά πειράματα ανάπτυξης να τρέξω πρώτα;',
      'Πώς μειώνω την εγκατάλειψη χρηστών;',
    ],
  },
  {
    id: 'a9',
    name: 'Research Assistant',
    nameEl: 'Βοηθός έρευνας',
    role: 'Research and writing',
    roleEl: 'Έρευνα και συγγραφή',
    description: 'Summarizes documents you paste, structures research and helps you write clearly. It does not browse the web.',
    descriptionEl: 'Συνοψίζει κείμενα που επικολλάς, οργανώνει έρευνα και βοηθά στη σαφή γραφή. Δεν αναζητά στο διαδίκτυο.',
    avatar: '',
    icon: '🔬',
    status: 'Active',
    capabilities: ['Summaries', 'Research plans', 'Clear writing'],
    capabilitiesEl: ['Συνόψεις', 'Σχέδια έρευνας', 'Σαφής γραφή'],
    suggestedPrompts: [
      'Summarize this text in five bullet points',
      'Plan customer interviews for my idea',
      'Rewrite this paragraph to be clearer',
    ],
    suggestedPromptsEl: [
      'Σύνοψε αυτό το κείμενο σε πέντε σημεία',
      'Σχεδίασε συνεντεύξεις πελατών για την ιδέα μου',
      'Ξαναγράψε αυτή την παράγραφο πιο καθαρά',
    ],
  },
  {
    id: 'a10',
    name: 'Mentor Finder',
    nameEl: 'Οδηγός μεντόρων',
    role: 'Mentorship',
    roleEl: 'Καθοδήγηση',
    description: 'Helps you decide what kind of mentor you need and how to approach them.',
    descriptionEl: 'Σε βοηθά να καταλάβεις τι μέντορα χρειάζεσαι και πώς να τον προσεγγίσεις.',
    avatar: '',
    icon: '🧑‍🏫',
    status: 'Active',
    capabilities: ['Mentor fit', 'First message', 'Working together'],
    capabilitiesEl: ['Σωστός μέντορας', 'Πρώτο μήνυμα', 'Συνεργασία'],
    suggestedPrompts: [
      'What kind of mentor do I need right now?',
      'Write a short first message to a mentor',
      'How do I make mentoring sessions useful?',
    ],
    suggestedPromptsEl: [
      'Τι μέντορα χρειάζομαι αυτή τη στιγμή;',
      'Γράψε ένα σύντομο πρώτο μήνυμα σε μέντορα',
      'Πώς κάνω τις συναντήσεις καθοδήγησης χρήσιμες;',
    ],
  }
];

import { AIAgent } from "../types";

export class AIService {
  private static isOffline = false;
  private static lastFailureTime = 0;
  private static readonly FAILURE_THRESHOLD = 30000; // 30 seconds

  /**
   * Circuit breaker check
   */
  private static checkCircuitBreaker() {
    if (this.isOffline && Date.now() - this.lastFailureTime < this.FAILURE_THRESHOLD) {
      throw new Error('AI Service is currently offline. Please try again in a few moments.');
    }
    this.isOffline = false;
  }

  private static recordFailure() {
    this.isOffline = true;
    this.lastFailureTime = Date.now();
  }

  /**
   * Attempts to connect to a local Ollama instance (localhost:11434).
   * This is the "Free & Local" strategy from the user's request.
   */
  static async queryLocalOllama(model: string, prompt: string) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout for local

      const response = await fetch(`${appEnv.ollamaBaseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: model,
          prompt: prompt,
          stream: false
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      if (!response.ok) throw new Error('Ollama not found');
      const data = await response.json();
      return {
        text: data.response,
        source: 'Local (Ollama)',
        model: model
      };
    } catch {
      console.warn('Local Ollama connection failed, falling back to Cloud AI.');
      return null;
    }
  }

  /**
   * Main entry point for AI chat.
   * A local Ollama model is tried first only when VITE_OLLAMA_BASE_URL is set
   * explicitly (developer machines); everyone else goes straight to Gemini.
   */
  static async chat(prompt: string, context: string = "", preferredModel: string = 'llama3.2', imageData?: string) {
    this.checkCircuitBreaker();

    try {
      if (!imageData && appEnv.ollamaEnabled) {
        const localResult = await this.queryLocalOllama(preferredModel, prompt);
        if (localResult) return localResult;
      }

      const contents: Record<string, unknown>[] = [{ text: prompt }];
      if (imageData) {
        const mime = /^data:([^;]+);/.exec(imageData)?.[1] || "image/png";
        contents.push({
          inlineData: {
            mimeType: mime,
            data: imageData.split(',')[1] || imageData
          }
        });
      }

      const language = getLang() === 'el' ? 'Greek' : 'English';
      const response = await generateContent({
        model: DEFAULT_AI_MODEL,
        contents: { parts: contents },
        config: {
          systemInstruction: `You are an expert advisor inside CoFounderBay, a platform where founders find co-founders, mentors and investors.
Context: ${context}
Answer in ${language}. Be concise, concrete and practical for early-stage founders. Use short paragraphs or bullet points.
Never invent people, companies, numbers, deadlines or partnerships. If you are not sure about a fact, say so and suggest how to check it.
If a pitch deck or slide image is provided, review it for clarity, completeness and investor appeal.`
        }
      });

      return {
        text: response.text,
        source: 'Cloud (Gemini)',
        model: DEFAULT_AI_MODEL
      };
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  /**
   * Generates personalized dashboard insights.
   */
  static async getDashboardInsights(user: any, ecosystemStatus: any) {
    this.checkCircuitBreaker();

    try {
      const prompt = `Generate 3 concise, high-impact AI insights for a startup founder's dashboard.
      User Profile: ${JSON.stringify(user)}
      Ecosystem Status: ${JSON.stringify(ecosystemStatus)}

      Format the response as a JSON array of objects, each with:
      - title: A short, catchy title (max 5 words)
      - description: A brief, actionable insight (max 20 words)
      - type: One of ['opportunity', 'warning', 'tip']
      - icon: A relevant Lucide icon name (e.g., 'Zap', 'Target', 'Users', 'TrendingUp', 'ShieldAlert')

      Return ONLY the JSON array.`;

      const response = await generateContent({
        model: DEFAULT_AI_MODEL,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          systemInstruction: "You are a startup advisor. Base every insight only on the profile and status you are given; never invent metrics."
        }
      });

      return JSON.parse(response.text);
    } catch (error) {
      this.recordFailure();
      // No invented insights: the dashboard simply shows nothing from AI when it is unavailable.
      aiLog.warn('failed to fetch dashboard insights', { error: String(error) });
      return [];
    }
  }
}
