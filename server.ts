import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { Server } from "socket.io";
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { corsMiddleware, originPolicy } from "./server/cors";
import { cachedCerts, googleCertFetcher, verifyFirebaseIdToken } from "./server/firebaseAuth";
import { geminiModel, readAiEnv, registerAiRoutes } from "./server/aiProxy";
import { makeIdentify } from "./server/identity";
import { registerOutreachRoutes } from "./server/outreach";
import { openOutreachStore } from "./server/outreachStore";
import { emailService, smtpProvider } from "./server/email";
import { readTenantAdmins, registerTenantRoutes, type TenantRecord } from "./server/tenants";
import { securityHeaders, readSocketMessage, listenHost } from "./server/http";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Port configuration - use different ports than other projects
const API_PORT = parseInt(process.env.API_PORT || process.env.PORT || "3010");
const WS_PORT = parseInt(process.env.WS_PORT || "24679"); // Different from 24678
const VITE_PORT = parseInt(process.env.VITE_PORT || "5180"); // Different from 5173/5174
// Containers (Cloud Run, Docker) must listen on every interface; local development stays on loopback.
const HOST = listenHost(process.env);

async function startServer() {
  const app = express();
  app.disable("x-powered-by");
  // Behind Cloud Run / a load balancer, req.ip is the client from X-Forwarded-For (rate limits, logs).
  if (process.env.TRUST_PROXY !== "false") app.set("trust proxy", process.env.NODE_ENV === "production" ? 1 : "loopback");
  app.use(securityHeaders({ production: process.env.NODE_ENV === "production" }));
  const httpServer = createServer(app);
  // Only the app's own origins may call the API or open a socket (server/cors.ts).
  const allowOrigin = originPolicy(process.env);
  const io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => callback(null, !origin || allowOrigin(origin)),
    },
  });
  const PORT = API_PORT;

  // Default 100 kB JSON bodies everywhere except the AI proxy, which parses its
  // own larger body (slide images) — a global parser would reject it first.
  const defaultJson = express.json();
  // The AI proxy and the outreach routes parse their own bodies (larger limits for slides and share files).
  const ownBodyParser = /^\/api\/(ai|dd|email|digest|cron)\//;
  app.use((req, res, next) => (ownBodyParser.test(req.path) ? next() : defaultJson(req, res, next)));

  app.use(corsMiddleware(allowOrigin));

  // Mock Database (In-memory for MVP)
  const db = {
    users: [
      {
        id: "1",
        fullName: "Alex Rivera",
        email: "alex@cofounderbay.com",
        roles: ["Founder"],
        profileStatus: "Published",
        verificationStatus: "Verified",
        profileCompletionScore: 95,
        emailVerified: true,
        accountStatus: "Active",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "2",
        fullName: "Sarah Chen",
        email: "sarah@cofounderbay.com",
        roles: ["Co-Founder Candidate"],
        profileStatus: "Published",
        verificationStatus: "Verified",
        profileCompletionScore: 88,
        emailVerified: true,
        accountStatus: "Active",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "3",
        fullName: "Marcus Thorne",
        email: "marcus@cofounderbay.com",
        roles: ["Mentor"],
        profileStatus: "Published",
        verificationStatus: "Verified",
        profileCompletionScore: 100,
        emailVerified: true,
        accountStatus: "Active",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "4",
        fullName: "Elena Rodriguez",
        email: "elena@cofounderbay.com",
        roles: ["Co-Founder Candidate"],
        profileStatus: "Published",
        verificationStatus: "Verified",
        profileCompletionScore: 94,
        emailVerified: false,
        accountStatus: "Active",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "5",
        fullName: "David Park",
        email: "david@cofounderbay.com",
        roles: ["Founder"],
        profileStatus: "Published",
        verificationStatus: "Verified",
        profileCompletionScore: 89,
        emailVerified: true,
        accountStatus: "Active",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    ],
    profiles: [
      {
        userId: "1",
        headline: "Serial Entrepreneur | Building Future of Fintech",
        bio: "Passionate about democratizing finance. Previously built and exited a SaaS platform in the logistics space.",
        location: "San Francisco, CA",
        country: "USA",
        languages: ["English", "Spanish"],
        startupStageInterest: ["Idea", "Seed"],
        commitmentLevel: "Full-time",
        availability: "Immediate",
        yearsOfExperience: 12,
        education: "Stanford MBA",
        linkedinUrl: "https://linkedin.com/in/alexrivera",
        profileVisibility: "Public",
        profilePhoto: "https://picsum.photos/seed/alex/200/200",
        interests: ["FinTech", "SaaS", "Web3"]
      },
      {
        userId: "2",
        headline: "Full-Stack Engineer | AI Enthusiast",
        bio: "Former Senior Engineer at Google. Looking to join a mission-driven startup as a technical co-founder.",
        location: "Berlin, Germany",
        country: "Germany",
        languages: ["English", "German", "Mandarin"],
        startupStageInterest: ["Seed", "Series A"],
        commitmentLevel: "Full-time",
        availability: "1 month notice",
        yearsOfExperience: 8,
        education: "MIT CS",
        githubUrl: "https://github.com/sarahchen",
        profileVisibility: "Public",
        profilePhoto: "https://picsum.photos/seed/sarah/200/200",
        interests: ["AI", "FinTech", "SaaS"]
      },
      {
        userId: "3",
        headline: "Growth Expert | 3x Founder",
        bio: "Helping early-stage startups scale from 0 to 1. Expert in GTM strategy and product-market fit.",
        location: "London, UK",
        country: "UK",
        languages: ["English"],
        startupStageInterest: ["Pre-seed", "Seed", "Series A"],
        commitmentLevel: "Exploring",
        availability: "Flexible",
        yearsOfExperience: 20,
        education: "Oxford University",
        profileVisibility: "Public",
        profilePhoto: "https://picsum.photos/seed/marcus/200/200",
        interests: ["SaaS", "B2B", "Marketplaces"]
      },
      {
        userId: "4",
        headline: "UX/UI Designer | Product Strategist",
        bio: "Specializing in creating intuitive experiences for complex HealthTech platforms. Looking for a visionary founder.",
        location: "Barcelona, Spain",
        country: "Spain",
        languages: ["English", "Spanish", "Catalan"],
        startupStageInterest: ["Idea", "Seed"],
        commitmentLevel: "Part-time",
        availability: "Immediate",
        yearsOfExperience: 6,
        education: "Design Academy Eindhoven",
        profileVisibility: "Public",
        profilePhoto: "https://picsum.photos/seed/elena/200/200",
        interests: ["HealthTech", "SaaS", "Social Impact"]
      },
      {
        userId: "5",
        headline: "Backend Architect | CleanTech Advocate",
        bio: "Expert in distributed systems and cloud infrastructure. Building tech to solve the climate crisis.",
        location: "Seoul, South Korea",
        country: "South Korea",
        languages: ["English", "Korean"],
        startupStageInterest: ["Seed", "Series A"],
        commitmentLevel: "Full-time",
        availability: "2 months notice",
        yearsOfExperience: 10,
        education: "Seoul National University",
        profileVisibility: "Public",
        profilePhoto: "https://picsum.photos/seed/david/200/200",
        interests: ["CleanTech", "AI", "Infrastructure"]
      }
    ],
    skills: [
      { id: "s1", name: "Product Management", category: "Business" },
      { id: "s2", name: "React", category: "Technical" },
      { id: "s3", name: "Node.js", category: "Technical" },
      { id: "s4", name: "Growth Hacking", category: "Marketing" },
      { id: "s5", name: "Fundraising", category: "Business" },
      { id: "s6", name: "AI/ML", category: "Technical" },
      { id: "s7", name: "UX/UI Design", category: "Design" },
      { id: "s8", name: "Python", category: "Technical" },
      { id: "s9", name: "Cloud Architecture", category: "Technical" },
    ],
    userSkills: [
      { userId: "1", skillId: "s1", proficiency: 5, yearsOfExperience: 10, priorityLevel: 1 },
      { userId: "1", skillId: "s5", proficiency: 4, yearsOfExperience: 8, priorityLevel: 2 },
      { userId: "2", skillId: "s2", proficiency: 5, yearsOfExperience: 7, priorityLevel: 1 },
      { userId: "2", skillId: "s3", proficiency: 5, yearsOfExperience: 6, priorityLevel: 2 },
      { userId: "2", skillId: "s6", proficiency: 4, yearsOfExperience: 3, priorityLevel: 3 },
      { userId: "4", skillId: "s7", proficiency: 5, yearsOfExperience: 6, priorityLevel: 1 },
      { userId: "4", skillId: "s1", proficiency: 3, yearsOfExperience: 4, priorityLevel: 2 },
      { userId: "5", skillId: "s8", proficiency: 5, yearsOfExperience: 10, priorityLevel: 1 },
      { userId: "5", skillId: "s9", proficiency: 5, yearsOfExperience: 8, priorityLevel: 2 },
    ],
    communities: [
      { id: "c1", title: "Fintech Founders", description: "A space for founders building in the financial technology space.", category: "Industry", tags: ["Fintech", "Web3", "Banking"], isPublic: true, ownerId: "1", createdAt: new Date().toISOString() },
      { id: "c2", title: "AI Builders", description: "Connecting engineers and researchers building the next generation of AI products.", category: "Technology", tags: ["AI", "ML", "LLM"], isPublic: true, ownerId: "2", createdAt: new Date().toISOString() },
    ],
    posts: [
      { id: "p1", communityId: "c1", authorId: "1", title: "The future of cross-border payments", body: "What are your thoughts on the impact of CBDCs on traditional banking infrastructure?", tags: ["Payments", "CBDC"], createdAt: new Date().toISOString(), reactionsCount: 12, commentsCount: 5 },
    ],
    matchSuggestions: [
      {
        id: "m1",
        userA: "1",
        userB: "2",
        score: 92,
        scoreExplanation: "High complementary skills (Business + Technical) and shared interest in Fintech.",
        compatibilityDimensions: { skills: 95, values: 88, goals: 90, availability: 95 },
        status: "Suggested",
        createdAt: new Date().toISOString()
      }
    ],
    tenants: [
      {
        id: "t1",
        slug: "default",
        name: "CoFounderBay Global",
        displayName: "CoFounderBay",
        shortDescription: "The global ecosystem for startup builders.",
        fullDescription: "CoFounderBay is the world's leading platform for finding co-founders and mentors.",
        supportEmail: "support@cofounderbay.com",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        branding: {
          tenantId: "t1",
          logoUrl: "", // Use Zap icon as default
          primaryColor: "#1c1917", // stone-900
          secondaryColor: "#78716c", // stone-500
          accentColor: "#f5f5f4", // stone-100
          backgroundStyle: "solid"
        },
        content: {
          tenantId: "t1",
          heroTitle: "Build your startup team with precision.",
          heroSubtitle: "CoFounderBay reduces founder risk by connecting you with compatible partners.",
          ctaLabel: "Join Platform",
          onboardingIntroText: "Welcome to the global network of builders.",
          dashboardWelcomeText: "Your profile is {score}% complete. Let's find your partner.",
          communityNamingConvention: "Communities",
          emailSignature: "The CoFounderBay Team",
          isBrandingActive: true
        }
      },
      {
        id: "t2",
        slug: "techstars",
        name: "Techstars Accelerator Network",
        displayName: "Techstars Hub",
        shortDescription: "Exclusive ecosystem for Techstars founders and alumni.",
        fullDescription: "Connect with fellow Techstars founders, mentors, and investors across the global network.",
        supportEmail: "help@techstars.com",
        websiteUrl: "https://techstars.com",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        branding: {
          tenantId: "t2",
          logoUrl: "https://www.techstars.com/assets/techstars-logo.svg",
          primaryColor: "#000000",
          secondaryColor: "#333333",
          accentColor: "#00FFCC", // Techstars teal
          backgroundStyle: "mesh"
        },
        content: {
          tenantId: "t2",
          heroTitle: "Accelerate your venture with the Techstars network.",
          heroSubtitle: "Exclusive access to the world's best mentors and co-founders for Techstars alumni.",
          ctaLabel: "Apply to Network",
          onboardingIntroText: "Welcome to the Techstars family. Let's build something great.",
          dashboardWelcomeText: "Welcome back, Techstars founder. Your network is waiting.",
          communityNamingConvention: "Accelerator Hubs",
          emailSignature: "Techstars Network Support",
          isBrandingActive: true
        }
      }
    ],
    conversations: [
      { id: "c1", participants: ["1", "2"], status: "Active", createdAt: new Date().toISOString() },
      { id: "c2", participants: ["1", "3"], status: "Active", createdAt: new Date().toISOString() },
      { id: "c3", participants: ["1", "4"], status: "Active", createdAt: new Date().toISOString() },
      { id: "c4", participants: ["1", "a3"], status: "Active", createdAt: new Date().toISOString(), isAI: true },
      { id: "c5", participants: ["1", "a2"], status: "Active", createdAt: new Date().toISOString(), isAI: true },
    ],
    messages: [
      { id: "m1", conversationId: "c1", senderId: "2", body: "Hi Alex! I saw your profile and I'm very interested in the fintech project you're building.", createdAt: new Date().toISOString(), readStatus: true },
      { id: "m2", conversationId: "c1", senderId: "1", body: "Thanks Sarah! I'd love to tell you more about it. Are you free for a quick call this week?", createdAt: new Date().toISOString(), readStatus: true },
      { id: "m3", conversationId: "c1", senderId: "2", body: "I've reviewed your pitch deck. Let's discuss the market size analysis.", createdAt: new Date().toISOString(), readStatus: true },
      { id: "m4", conversationId: "c1", senderId: "1", body: "That sounds great. I've updated the slides with the latest research data.", createdAt: new Date().toISOString(), readStatus: false },
      { id: "m5", conversationId: "c4", senderId: "a3", body: "Hello! I'm your AI Startup Advisor. How can I help you refine your startup idea today?", createdAt: new Date().toISOString(), readStatus: true },
      { id: "m6", conversationId: "c5", senderId: "a2", body: "Hi! I'm the Pitch Deck Reviewer. Upload your deck or share a slide, and I'll give you feedback on clarity and market appeal.", createdAt: new Date().toISOString(), readStatus: true },
    ]
  };

  // Liveness for Cloud Run / load balancers / uptime checks: no data, no auth.
  const startedAt = Date.now();
  app.get("/api/health", (_req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.json({ status: "ok", uptimeSeconds: Math.round((Date.now() - startedAt) / 1000) });
  });

  // The in-memory sample API (users, matches, communities, mentors, conversations).
  // The studio client does not call it — it reads Firestore and the local lists —
  // so production does not serve it: it would hand out sample people and accept
  // unauthenticated writes. MOCK_API=on keeps it for a demo deployment.
  const mockApiEnabled = process.env.MOCK_API === "on" || (process.env.NODE_ENV !== "production" && process.env.MOCK_API !== "off");
  const mock = express.Router();
  mock.get("/api/users", (req, res) => res.json(db.users));
  mock.get("/api/users/:id", (req, res) => {
    const user = db.users.find(u => u.id === req.params.id);
    const profile = db.profiles.find(p => p.userId === req.params.id);
    const skills = db.userSkills
      .filter(us => us.userId === req.params.id)
      .map(us => ({ ...us, ...db.skills.find(s => s.id === us.skillId) }));
    
    if (!user) return res.status(404).json({ error: "User not found" });
    return res.json({ ...user, profile, skills });
  });

  mock.get("/api/matches/:userId", (req, res) => {
    const userId = req.params.userId;
    const user = db.users.find(u => u.id === userId);
    const userProfile = db.profiles.find(p => p.userId === userId);
    const userSkills = db.userSkills.filter(us => us.userId === userId);

    if (!user || !userProfile) return res.status(404).json({ error: "User not found" });

    // Simple matching algorithm
    const potentialMatches = db.users.filter(u => u.id !== userId && !u.roles.includes("Mentor"));
    
    const enrichedMatches = potentialMatches.map(otherUser => {
      const otherProfile = db.profiles.find(p => p.userId === otherUser.id);
      const otherSkills = db.userSkills.filter(us => us.userId === otherUser.id);

      if (!otherProfile) return null;

      let score = 50; // Base score
      let reasons = [];

      // Role complementarity
      if (user.roles.includes("Founder") && otherUser.roles.includes("Co-Founder Candidate")) {
        score += 20;
        reasons.push("Complementary roles (Founder + Candidate)");
      } else if (user.roles.includes("Co-Founder Candidate") && otherUser.roles.includes("Founder")) {
        score += 20;
        reasons.push("Complementary roles (Candidate + Founder)");
      }

      // Interest overlap
      const sharedInterests = userProfile.interests?.filter(i => otherProfile.interests?.includes(i)) || [];
      if (sharedInterests.length > 0) {
        score += sharedInterests.length * 10;
        reasons.push(`Shared interests in ${sharedInterests.join(", ")}`);
      }

      // Skill complementarity (Business vs Technical)
      const userHasBusiness = userSkills.some(us => db.skills.find(s => s.id === us.skillId)?.category === "Business");
      const otherHasTechnical = otherSkills.some(us => db.skills.find(s => s.id === us.skillId)?.category === "Technical");
      
      const userHasTechnical = userSkills.some(us => db.skills.find(s => s.id === us.skillId)?.category === "Technical");
      const otherHasBusiness = otherSkills.some(us => db.skills.find(s => s.id === us.skillId)?.category === "Business");

      if ((userHasBusiness && otherHasTechnical) || (userHasTechnical && otherHasBusiness)) {
        score += 15;
        reasons.push("Strong skill complementarity (Business + Technical)");
      }

      // Shared skills
      const userSkillIds = userSkills.map(us => us.skillId);
      const otherSkillIds = otherSkills.map(us => us.skillId);
      const sharedSkillIds = userSkillIds.filter(id => otherSkillIds.includes(id));
      const sharedSkills = sharedSkillIds.map(id => db.skills.find(s => s.id === id)?.name).filter(Boolean);

      // Cap score at 98
      score = Math.min(score, 98);

      return {
        id: `m-${userId}-${otherUser.id}`,
        otherUser: { ...otherUser, profile: otherProfile },
        score,
        sharedSkills,
        sharedInterests,
        scoreExplanation: reasons.length > 0 ? reasons.join(". ") + "." : "Good overall alignment in goals and commitment.",
        compatibilityDimensions: {
          skills: Math.floor(Math.random() * 20) + 75,
          values: Math.floor(Math.random() * 20) + 75,
          goals: Math.floor(Math.random() * 20) + 75,
          availability: Math.floor(Math.random() * 20) + 75
        },
        dimensionExplanations: {
          skills: (userHasBusiness && otherHasTechnical) || (userHasTechnical && otherHasBusiness) 
            ? "Strong synergy between business leadership and technical execution capabilities."
            : "Solid overlap in core domain expertise and technical background.",
          values: sharedInterests.length > 0
            ? `Aligned interests in ${sharedInterests.slice(0, 2).join(" and ")} suggest a shared vision for the product's impact.`
            : "Consistent commitment levels and startup stage preferences indicate strong cultural alignment.",
          goals: (user.roles.includes("Founder") && otherUser.roles.includes("Co-Founder Candidate")) || (user.roles.includes("Co-Founder Candidate") && otherUser.roles.includes("Founder"))
            ? "Perfectly complementary roles for a balanced founding team structure."
            : "Potential for collaborative leadership based on shared professional seniority.",
          availability: userProfile.commitmentLevel === otherProfile.commitmentLevel
            ? `Both are looking for ${userProfile.commitmentLevel} commitment, ensuring synchronized progress.`
            : "Different commitment levels may require careful scheduling but offer flexibility for the venture."
        }
      };
    }).filter(m => m !== null);

    // Sort by score descending
    enrichedMatches.sort((a, b) => b.score - a.score);

    return res.json(enrichedMatches.slice(0, 4));
  });

  mock.get("/api/communities", (req, res) => res.json(db.communities));
  mock.get("/api/communities/:id/posts", (req, res) => {
    const posts = db.posts.filter(p => p.communityId === req.params.id);
    const enrichedPosts = posts.map(p => ({
      ...p,
      author: db.users.find(u => u.id === p.authorId)
    }));
    res.json(enrichedPosts);
  });

  mock.get("/api/mentors", (req, res) => {
    const mentors = db.users.filter(u => u.roles.includes("Mentor"));
    const enrichedMentors = mentors.map(m => ({
      ...m,
      profile: db.profiles.find(p => p.userId === m.id)
    }));
    res.json(enrichedMentors);
  });

  mock.get("/api/conversations/:userId", (req, res) => {
    const userId = req.params.userId;
    const userConversations = db.conversations.filter(c => c.participants.includes(userId));
    
    const enrichedConversations = userConversations.map(conv => {
      const otherParticipantId = conv.participants.find(id => id !== userId);
      let otherParticipant: any;
      let otherProfile: any;

      if (otherParticipantId?.startsWith('a')) {
        // It's an AI agent (mocked)
        const agent = [
          { id: 'a1', name: 'Cofounder Matcher' },
          { id: 'a2', name: 'Pitch Deck Reviewer' },
          { id: 'a3', name: 'AI Startup Advisor' },
          { id: 'a4', name: 'Market Analyst' },
          { id: 'a5', name: 'Fundraising Expert' },
          { id: 'a6', name: 'Legal Advisor' },
          { id: 'a7', name: 'Technical Advisor' },
          { id: 'a8', name: 'Growth Strategist' },
          { id: 'a9', name: 'Research Assistant' },
          { id: 'a10', name: 'Mentor Finder' }
        ].find(a => a.id === otherParticipantId);

        otherParticipant = {
          id: otherParticipantId,
          fullName: agent?.name || 'AI Assistant',
          roles: ['AI Assistant'],
          isAI: true
        };
        otherProfile = {
          profilePhoto: `https://picsum.photos/seed/${otherParticipantId}/100/100`,
          headline: 'AI-Powered Strategy & Insights'
        };
      } else {
        otherParticipant = db.users.find(u => u.id === otherParticipantId);
        otherProfile = db.profiles.find(p => p.userId === otherParticipantId);
      }

      const lastMessage = db.messages
        .filter(m => m.conversationId === conv.id)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
      
      const unreadCount = db.messages.filter(m => m.conversationId === conv.id && m.senderId !== userId && !m.readStatus).length;

      return {
        ...conv,
        otherParticipant: {
          ...otherParticipant,
          profile: otherProfile
        },
        lastMessage: lastMessage?.body || "No messages yet",
        lastMessageTime: lastMessage ? new Date(lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "",
        lastMessageTimestamp: lastMessage ? new Date(lastMessage.createdAt).getTime() : 0,
        unreadCount
      };
    });

    // Sort by most recent message
    const sortedConversations = enrichedConversations.sort((a, b) => b.lastMessageTimestamp - a.lastMessageTimestamp);

    res.json(sortedConversations);
  });

  mock.post("/api/conversations", (req, res) => {
    const { participants } = req.body;
    // Check if conversation already exists
    let conversation = db.conversations.find(c => 
      c.participants.length === participants.length && 
      c.participants.every(p => participants.includes(p))
    );

    if (!conversation) {
      conversation = {
        id: `c${db.conversations.length + 1}`,
        participants,
        status: "active",
        createdAt: new Date().toISOString()
      };
      db.conversations.push(conversation);
    }
    res.json(conversation);
  });

  mock.get("/api/messages/:conversationId", (req, res) => {
    const messages = db.messages.filter(m => m.conversationId === req.params.conversationId);
    res.json(messages);
  });

  mock.post("/api/messages/mark-read", (req, res) => {
    const { conversationId, userId } = req.body;
    db.messages.forEach(m => {
      if (m.conversationId === conversationId && m.senderId !== userId) {
        m.readStatus = true;
      }
    });
    res.json({ success: true });
  });

  if (mockApiEnabled) app.use(mock);

  // ── AI Proxy ─────────────────────────────────────────────────────────────
  // Gemini stays behind the server (GEMINI_API_KEY never ships to browsers).
  // Callers are identified by a verified Firebase ID token; production refuses
  // anonymous calls. Policy, limits and streaming live in server/aiProxy.ts.
  const firebaseProjectId = (() => {
    const fromEnv = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;
    if (fromEnv) return fromEnv;
    try {
      return JSON.parse(readFileSync(path.join(process.cwd(), "firebase-applet-config.json"), "utf8")).projectId as string;
    } catch {
      return "";
    }
  })();
  const certs = cachedCerts(googleCertFetcher());
  const geminiApiKey = () => process.env.GEMINI_API_KEY;
  const gemini = geminiModel(geminiApiKey);
  const aiEnv = readAiEnv(process.env);
  const verifyToken = (token: string) => verifyFirebaseIdToken(token, { projectId: firebaseProjectId, certs });
  registerAiRoutes(app, {
    ...aiEnv,
    apiKey: geminiApiKey,
    verifyToken,
    generate: gemini.generate,
    generateStream: gemini.generateStream,
  });

  // ── Outreach: due-diligence links, email, the weekly digest ───────────────
  // Same sign-in rule as the AI proxy (server/identity); records live in the
  // server store — Firestore on Cloud Run, JSON files elsewhere
  // (server/outreachStore, OUTREACH_STORE). See server/outreach.ts.
  const serverStore = await openOutreachStore(process.env);
  const outreach = registerOutreachRoutes(app, {
    identify: makeIdentify({ requireAuth: aiEnv.requireAuth, verifyToken, signInMessage: 'Sign in to share links and send email from the studio.' }),
    store: serverStore,
    email: emailService(smtpProvider(process.env)),
    cronSecret: process.env.DIGEST_CRON_SECRET || process.env.WEBHOOK_CRON_SECRET,
  });
  // ── White-label tenants: host resolution and validated, admin-only changes (server/tenants.ts) ──
  registerTenantRoutes(app, {
    tenants: db.tenants as unknown as TenantRecord[],
    identify: makeIdentify({ requireAuth: aiEnv.requireAuth, verifyToken, signInMessage: 'Sign in as a tenant administrator to change branding.' }),
    requireAuth: aiEnv.requireAuth,
    adminUids: readTenantAdmins(process.env),
    // Branding and copy changes survive restarts (same store as outreach: Firestore on Cloud Run).
    store: serverStore,
  });

  // Optional in-process schedule for long-running servers; serverless hosts call POST /api/cron/digest instead.
  if (process.env.DIGEST_SCHEDULER === "on") {
    setInterval(() => { void outreach.runDigests("scheduler"); }, 10 * 60_000).unref();
  }

  // WebSocket logic
  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("join_room", (conversationId) => {
      // Room names are conversation ids — short strings, nothing else.
      if (typeof conversationId !== "string" || !/^[A-Za-z0-9_.:-]{1,128}$/.test(conversationId)) return;
      socket.join(conversationId);
      console.log(`User ${socket.id} joined room ${conversationId}`);
    });

    socket.on("send_message", (data) => {
      // Malformed or oversized payloads are dropped (server/http.ts readSocketMessage).
      const message = readSocketMessage(data);
      if (!message) return;
      const { conversationId, senderId, body, file } = message;
      const newMessage = {
        id: `m${db.messages.length + 1}`,
        conversationId,
        senderId,
        body: file ? `${body}\n\n[Attached File: ${file.name}]` : body,
        createdAt: new Date().toISOString(),
        readStatus: false,
        deliveredStatus: true,
        file: file ? { name: file.name } : undefined
      };
      db.messages.push(newMessage);
      io.to(conversationId).emit("receive_message", newMessage);

      // Check if it's an AI conversation
      const conversation = db.conversations.find(c => c.id === conversationId);
      const otherParticipantId = conversation?.participants.find(id => id !== senderId);
      
      if (otherParticipantId?.startsWith('a')) {
        // AI agent response (mocked/simulated)
        // In a real app, the client will handle the AI call and send the response back
        // But we'll add a placeholder message if the client doesn't handle it
        setTimeout(() => {
          const aiMessage = {
            id: `m${db.messages.length + 1}`,
            conversationId,
            senderId: otherParticipantId,
            body: `I'm processing your request...`,
            createdAt: new Date().toISOString(),
            readStatus: false,
            isAI: true,
            isPlaceholder: true
          };
          // We don't push placeholders to DB usually
          io.to(conversationId).emit("receive_message", aiMessage);
        }, 500);
      }
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
    });
  });

  // Any other /api path is an API 404 in JSON — never the SPA's index.html with a 200.
  app.use("/api", (_req, res) => {
    res.status(404).json({ error: "Not found", code: "not-found" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Try to start server on preferred port, fallback to random available port
  const startServerOnPort = (preferredPort: number) => {
    return new Promise<number>((resolve, reject) => {
      const tryPort = (port: number) => {
        const testServer = httpServer.listen(port, HOST, () => {
          console.log(`✅ Server running on http://localhost:${port} (listening on ${HOST})`);
          console.log(`   API: http://localhost:${port}`);
          console.log(`   WebSocket: ws://localhost:${port}`);
          resolve(port);
        }).on('error', (err: any) => {
          // In production the platform assigns PORT; serving on another one would be unreachable.
          if (err.code === 'EADDRINUSE' && process.env.NODE_ENV !== "production") {
            console.log(`⚠️ Port ${port} is in use, trying ${port + 1}...`);
            tryPort(port + 1);
          } else {
            reject(err);
          }
        });
      };
      tryPort(preferredPort);
    });
  };

  const actualPort = await startServerOnPort(PORT);
  
  // Update environment for frontend
  console.log(`\n🚀 CoFounderBay is ready!`);
  console.log(`   Frontend: http://localhost:${VITE_PORT} (will be available after Vite starts)`);
  console.log(`   Backend: http://localhost:${actualPort}`);
}

startServer();
