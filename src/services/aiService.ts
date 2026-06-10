import { GoogleGenAI } from "@google/genai";
import { appEnv } from "../config/env";
import { createLogger } from "../lib/logger";

const aiLog = createLogger("ai-service");

let _ai: GoogleGenAI | null = null;
function getAI(): GoogleGenAI {
  if (!_ai) {
    _ai = new GoogleGenAI({ apiKey: appEnv.geminiApiKey });
  }
  return _ai;
}

interface GenerateParams {
  model: string;
  contents: unknown;
  config?: Record<string, unknown>;
}

/**
 * Single Gemini entry point.
 *
 * SECURITY: when `appEnv.aiUseProxy` is true (the production default), the
 * request is routed through the server-side proxy (`POST /api/ai/generate`)
 * so the API key never ships in the client bundle. The direct SDK path is
 * kept for local development convenience.
 */
async function generateContent(params: GenerateParams): Promise<{ text: string }> {
  if (appEnv.aiUseProxy) {
    const response = await fetch(`${appEnv.apiBaseUrl}/api/ai/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(`AI proxy error (${response.status}): ${body?.error ?? 'unknown'}`);
    }
    return (await response.json()) as { text: string };
  }
  const response = await getAI().models.generateContent(params as never);
  return { text: response.text ?? '' };
}



export interface ChatMessage {

  role: 'user' | 'model' | 'system';

  content: string;

}



export const MOCK_AGENTS: AIAgent[] = [

  {

    id: 'a1',

    name: 'Cofounder Matcher',

    role: 'Matchmaking Expert',

    description: 'I analyze profiles to find your perfect co-founder match.',

    avatar: 'https://picsum.photos/seed/matcher/100/100',

    icon: '🤝',

    status: 'Active',

    capabilities: ['Profile Analysis', 'Compatibility Scoring', 'Skill Gap Identification'],

    suggestedPrompts: [

      'Who is my best match based on my profile?',

      'What skills am I missing for my startup?',

      'Find technical co-founders in my area',

      'How can I make my profile more attractive?'

    ]

  },

  {

    id: 'a2',

    name: 'Pitch Deck Reviewer',

    role: 'Investment Advisor',

    description: 'Upload your pitch deck (PDF/Image) for AI-driven feedback on clarity, completeness, and market appeal.',

    avatar: 'https://picsum.photos/seed/pitch/100/100',

    icon: '🎯',

    status: 'Active',

    capabilities: ['Deck Review', 'Financial Analysis', 'Storytelling Feedback', 'Visual Analysis'],

    suggestedPrompts: [

      'Review my pitch deck clarity',

      'Is my market sizing realistic?',

      'Analyze my value proposition',

      'Feedback on my team slide'

    ]

  },

  {

    id: 'a3',

    name: 'AI Startup Advisor',

    role: 'Strategy Consultant',

    description: 'I help you refine your startup ideas, business model, and provide market insights.',

    avatar: 'https://picsum.photos/seed/advisor/100/100',

    icon: '🤖',

    status: 'Active',

    capabilities: ['Idea Refinement', 'Business Model Feedback', 'Market Insights'],

    suggestedPrompts: [

      'Refine my startup idea',

      'Critique my business model',

      'Current market trends in AI',

      'How to get my first 10 customers?'

    ]

  },

  {

    id: 'a4',

    name: 'Market Analyst',

    role: 'Market Intelligence',

    description: 'I provide deep market research, competitor analysis, and industry trends.',

    avatar: 'https://picsum.photos/seed/market/100/100',

    icon: '📈',

    status: 'Active',

    capabilities: ['Market Sizing', 'Competitor Research', 'Trend Analysis'],

    suggestedPrompts: [

      'Analyze the fintech market in Europe',

      'Who are the main competitors for a SaaS CRM?',

      'What is the TAM for AI-driven healthcare?'

    ]

  },

  {

    id: 'a5',

    name: 'Fundraising Expert',

    role: 'Venture Consultant',

    description: 'I help you prepare for fundraising, from valuation to investor targeting.',

    avatar: 'https://picsum.photos/seed/fund/100/100',

    icon: '💰',

    status: 'Active',

    capabilities: ['Valuation Modeling', 'Investor Targeting', 'Term Sheet Review'],

    suggestedPrompts: [

      'How much should I raise for my pre-seed?',

      'What is a realistic valuation for my SaaS?',

      'List active VCs in the CleanTech space'

    ]

  },

  {

    id: 'a6',

    name: 'Legal Advisor',

    role: 'Compliance Expert',

    description: 'I provide guidance on startup legal structures, IP protection, and compliance.',

    avatar: 'https://picsum.photos/seed/legal/100/100',

    icon: '⚖️',

    status: 'Active',

    capabilities: ['Entity Formation', 'IP Protection', 'Contract Review'],

    suggestedPrompts: [

      'What is the best legal structure for a US startup?',

      'How do I protect my IP?',

      'Review my non-disclosure agreement'

    ]

  },

  {

    id: 'a7',

    name: 'Technical Advisor',

    role: 'CTO Consultant',

    description: 'I help with tech stack selection, architecture, and engineering management.',

    avatar: 'https://picsum.photos/seed/tech/100/100',

    icon: '💻',

    status: 'Active',

    capabilities: ['Stack Selection', 'Architecture Review', 'Team Scaling'],

    suggestedPrompts: [

      'What is the best tech stack for a real-time app?',

      'Review my cloud architecture',

      'How to hire my first engineer?'

    ]

  },

  {

    id: 'a8',

    name: 'Growth Strategist',

    role: 'Marketing Expert',

    description: 'I help you scale your user base through GTM strategy and growth hacking.',

    avatar: 'https://picsum.photos/seed/growth/100/100',

    icon: '🚀',

    status: 'Active',

    capabilities: ['GTM Strategy', 'Growth Hacking', 'User Acquisition'],

    suggestedPrompts: [

      'Create a GTM strategy for my app',

      'What are some low-cost growth hacks?',

      'How to reduce churn?'

    ]

  },

  {

    id: 'a9',

    name: 'Research Assistant',

    role: 'Academic Researcher',

    description: 'I help you find academic papers, patents, and technical documentation.',

    avatar: 'https://picsum.photos/seed/research/100/100',

    icon: '🔬',

    status: 'Active',

    capabilities: ['Paper Search', 'Patent Analysis', 'Technical Writing'],

    suggestedPrompts: [

      'Find recent papers on LLM optimization',

      'Are there any patents for AI-driven energy?',

      'Summarize this technical document'

    ]

  },

  {

    id: 'a10',

    name: 'Mentor Finder',

    role: 'Networking Expert',

    description: 'I help you find the right mentors based on your specific needs.',

    avatar: 'https://picsum.photos/seed/mentor/100/100',

    icon: '👨‍🏫',

    status: 'Active',

    capabilities: ['Mentor Matching', 'Networking Advice', 'Relationship Management'],

    suggestedPrompts: [

      'Who can mentor me on B2B sales?',

      'Find mentors with experience in exits',

      'How to approach a potential mentor?'

    ]

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

    } catch (error) {

      console.warn('Local Ollama connection failed, falling back to Cloud AI.');

      return null;

    }

  }



  /**

   * Main entry point for AI chat. 

   * Tries Local first, then falls back to Gemini (Elite Reasoning).

   */

  static async chat(prompt: string, context: string = "", preferredModel: string = 'llama3.2', imageData?: string) {

    this.checkCircuitBreaker();



    try {

      // 1. Try Local Ollama first (Free for user, 0 server cost)

      if (!imageData) {

        const localResult = await this.queryLocalOllama(preferredModel, prompt);

        if (localResult) return localResult;

      }



      // 2. Fallback to Gemini (Elite Reasoning)

      const contents: any[] = [{ text: prompt }];

      if (imageData) {

        contents.push({

          inlineData: {

            mimeType: "image/png", // Default to png for now

            data: imageData.split(',')[1] || imageData

          }

        });

      }



      const response = await generateContent({

        model: "gemini-3-flash-preview",

        contents: { parts: contents },

        config: {

          systemInstruction: `You are an expert AI Agent on Cofounderbay. 

          Context: ${context}. 

          Be concise, professional, and helpful for startup founders.

          If a pitch deck or slide is provided, analyze it for clarity, completeness, and market appeal.`

        }

      });



      return {

        text: response.text,

        source: 'Cloud (Gemini)',

        model: 'gemini-3-flash-preview'

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

        model: "gemini-3-flash-preview",

        contents: prompt,

        config: {

          responseMimeType: "application/json",

          systemInstruction: "You are an elite startup advisor AI. Provide data-driven, strategic insights for founders."

        }

      });



      return JSON.parse(response.text);

    } catch (error) {

      this.recordFailure();

      aiLog.warn('failed to fetch dashboard insights, using fallback', { error: String(error) });

      // Fallback insights

      return [

        { title: "Market Expansion", description: "Your current product metrics suggest a strong fit for the European market.", type: "opportunity", icon: "Globe" },

        { title: "Team Scaling", description: "Consider hiring a dedicated growth lead to maintain your current momentum.", type: "tip", icon: "Users" },

        { title: "Funding Readiness", description: "Your financial projections need refinement before the next seed round pitch.", type: "warning", icon: "ShieldAlert" }

      ];

    }

  }

}

