import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { Server } from "socket.io";
import { createServer } from "node:http";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Port configuration - use different ports than other projects
const API_PORT = parseInt(process.env.API_PORT || process.env.PORT || "3010");
const WS_PORT = parseInt(process.env.WS_PORT || "24679"); // Different from 24678
const VITE_PORT = parseInt(process.env.VITE_PORT || "5180"); // Different from 5173/5174

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
    },
  });
  const PORT = API_PORT;

  // Default 100 kB JSON bodies everywhere except the AI proxy, which parses its
  // own larger body (slide images) — a global parser would reject it first.
  const defaultJson = express.json();
  app.use((req, res, next) => (req.path === "/api/ai/generate" ? next() : defaultJson(req, res, next)));

  // Allow cross-origin access (needed when served from same port via Vite middleware)
  app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    if (req.method === "OPTIONS") return res.sendStatus(200);
    return next();
  });

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

  // API Routes
  app.get("/api/tenants", (req, res) => res.json(db.tenants));
  app.get("/api/tenants/:slug", (req, res) => {
    const tenant = db.tenants.find(t => t.slug === req.params.slug);
    if (!tenant) return res.status(404).json({ error: "Tenant not found" });
    return res.json(tenant);
  });

  app.post("/api/tenants/:id/branding", (req, res) => {
    const tenant = db.tenants.find(t => t.id === req.params.id);
    if (!tenant) return res.status(404).json({ error: "Tenant not found" });
    tenant.branding = { ...tenant.branding, ...req.body };
    tenant.updatedAt = new Date().toISOString();
    return res.json(tenant.branding);
  });

  app.post("/api/tenants/:id/content", (req, res) => {
    const tenant = db.tenants.find(t => t.id === req.params.id);
    if (!tenant) return res.status(404).json({ error: "Tenant not found" });
    tenant.content = { ...tenant.content, ...req.body };
    tenant.updatedAt = new Date().toISOString();
    return res.json(tenant.content);
  });

  app.get("/api/users", (req, res) => res.json(db.users));
  app.get("/api/users/:id", (req, res) => {
    const user = db.users.find(u => u.id === req.params.id);
    const profile = db.profiles.find(p => p.userId === req.params.id);
    const skills = db.userSkills
      .filter(us => us.userId === req.params.id)
      .map(us => ({ ...us, ...db.skills.find(s => s.id === us.skillId) }));
    
    if (!user) return res.status(404).json({ error: "User not found" });
    return res.json({ ...user, profile, skills });
  });

  app.get("/api/matches/:userId", (req, res) => {
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

  app.get("/api/communities", (req, res) => res.json(db.communities));
  app.get("/api/communities/:id/posts", (req, res) => {
    const posts = db.posts.filter(p => p.communityId === req.params.id);
    const enrichedPosts = posts.map(p => ({
      ...p,
      author: db.users.find(u => u.id === p.authorId)
    }));
    res.json(enrichedPosts);
  });

  app.get("/api/mentors", (req, res) => {
    const mentors = db.users.filter(u => u.roles.includes("Mentor"));
    const enrichedMentors = mentors.map(m => ({
      ...m,
      profile: db.profiles.find(p => p.userId === m.id)
    }));
    res.json(enrichedMentors);
  });

  app.get("/api/conversations/:userId", (req, res) => {
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

  app.post("/api/conversations", (req, res) => {
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

  app.get("/api/messages/:conversationId", (req, res) => {
    const messages = db.messages.filter(m => m.conversationId === req.params.conversationId);
    res.json(messages);
  });

  app.post("/api/messages/mark-read", (req, res) => {
    const { conversationId, userId } = req.body;
    db.messages.forEach(m => {
      if (m.conversationId === conversationId && m.senderId !== userId) {
        m.readStatus = true;
      }
    });
    res.json({ success: true });
  });

  // ── AI Proxy ─────────────────────────────────────────────────────────────
  // Keeps the Gemini API key server-side (process.env.GEMINI_API_KEY) so it is
  // never shipped in the client bundle. Includes a simple per-caller limiter.
  //
  // Hardening:
  // - Its own JSON body limit (8 MB): the Pitch Deck Reviewer sends a slide
  //   image as base64, which the app-wide 100 kB default silently rejected.
  // - A model allow-list: the client names a model, but only the configured
  //   model (and AI_MODEL_ALLOWLIST additions) are forwarded, so a caller cannot
  //   pick an arbitrarily expensive one.
  // - An output-token ceiling and a forwarded-config allow-list.
  // - Function calls are returned next to the text, so the assistant can offer
  //   its action catalogue (tool use) through the proxy as well.
  const aiRateBuckets = new Map<string, { count: number; resetAt: number }>();
  const AI_RATE_LIMIT_PER_MINUTE = parseInt(process.env.AI_RATE_LIMIT_PER_MINUTE || "30");
  const AI_DEFAULT_MODEL = process.env.GEMINI_MODEL || "gemini-flash-latest";
  const AI_ALLOWED_MODELS = new Set(
    [AI_DEFAULT_MODEL, ...(process.env.AI_MODEL_ALLOWLIST || "").split(",")].map((m) => m.trim()).filter(Boolean),
  );
  const AI_MAX_OUTPUT_TOKENS = parseInt(process.env.AI_MAX_OUTPUT_TOKENS || "2048");
  const FORWARDED_CONFIG_KEYS = new Set([
    "systemInstruction",
    "responseMimeType",
    "responseSchema",
    "temperature",
    "topP",
    "tools",
    "toolConfig",
    "maxOutputTokens",
  ]);

  /** Rate-limit key: the bearer token's tail when present (per member), else the IP. */
  const callerKey = (req: express.Request): string => {
    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    if (token.length > 24) return `t:${token.slice(-24)}`;
    return `ip:${req.ip || req.socket.remoteAddress || "unknown"}`;
  };

  app.get("/api/ai/status", (_req, res) => {
    const configured = Boolean(process.env.GEMINI_API_KEY);
    res.json({ configured, model: configured ? AI_DEFAULT_MODEL : null });
  });

  app.post("/api/ai/generate", express.json({ limit: "8mb" }), async (req, res) => {
    const key = callerKey(req);
    const now = Date.now();
    const bucket = aiRateBuckets.get(key);
    if (!bucket || bucket.resetAt < now) {
      aiRateBuckets.set(key, { count: 1, resetAt: now + 60_000 });
    } else if (++bucket.count > AI_RATE_LIMIT_PER_MINUTE) {
      return res.status(429).json({
        error: "Rate limit exceeded",
        retryAfterMs: bucket.resetAt - now,
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(503).json({
        error: "AI proxy not configured — set GEMINI_API_KEY on the server environment",
      });
    }

    const { model: requestedModel, contents, config } = req.body ?? {};
    if (contents === undefined) {
      return res.status(400).json({ error: "`contents` is required" });
    }
    const model = typeof requestedModel === "string" && AI_ALLOWED_MODELS.has(requestedModel) ? requestedModel : AI_DEFAULT_MODEL;
    const safeConfig: Record<string, unknown> = {};
    if (config && typeof config === "object") {
      for (const [k, v] of Object.entries(config as Record<string, unknown>)) {
        if (FORWARDED_CONFIG_KEYS.has(k)) safeConfig[k] = v;
      }
    }
    const askedTokens = Number(safeConfig.maxOutputTokens);
    safeConfig.maxOutputTokens = Number.isFinite(askedTokens) && askedTokens > 0 ? Math.min(askedTokens, AI_MAX_OUTPUT_TOKENS) : AI_MAX_OUTPUT_TOKENS;

    try {
      const { GoogleGenAI } = await import("@google/genai");
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({ model, contents, config: safeConfig });
      const functionCalls = (response.functionCalls ?? [])
        .filter((call) => call.name)
        .map((call) => ({ name: call.name, args: call.args ?? {} }));
      let text = "";
      try {
        text = response.text ?? "";
      } catch {
        text = "";
      }
      return res.json({ text, functionCalls, model });
    } catch (err) {
      console.error("AI proxy upstream error:", err);
      return res.status(502).json({ error: "Upstream AI provider error" });
    }
  });

  // WebSocket logic
  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("join_room", (conversationId) => {
      socket.join(conversationId);
      console.log(`User ${socket.id} joined room ${conversationId}`);
    });

    socket.on("send_message", (data) => {
      const { conversationId, senderId, body, file } = data;
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
        const testServer = httpServer.listen(port, "localhost", () => {
          console.log(`✅ Server running on http://localhost:${port}`);
          console.log(`   API: http://localhost:${port}`);
          console.log(`   WebSocket: ws://localhost:${port}`);
          resolve(port);
        }).on('error', (err: any) => {
          if (err.code === 'EADDRINUSE') {
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
