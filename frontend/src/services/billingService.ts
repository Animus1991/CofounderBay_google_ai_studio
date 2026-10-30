import { BillingPlan, Subscription, Invoice } from "../types";
import { readPlan } from "../lib/localLists";
import { db, auth } from "../firebase";
import { addDoc, collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";

function isDemoBilling() {
  try {
    return localStorage.getItem("demo_mode") === "true";
  } catch {
    return false;
  }
}

function planIdForAccount(type: "user" | "tenant"): string {
  if (type === "tenant") return "organization-standard";
  if (isDemoBilling()) return "premium-individual";
  const plan = readPlan();
  if (plan === "pro") return "premium-individual";
  if (plan === "studio") return "organization-standard";
  return "free-individual";
}

// --- Mock Data ---

export const MOCK_PLANS: BillingPlan[] = [
  {
    id: "free-individual",
    name: "Individual Free",
    description: "Essential tools for finding your next co-founder.",
    priceMonthly: 0,
    priceAnnual: 0,
    price: 0,
    currency: "USD",
    interval: "month",
    customerType: "Individual",
    features: [
      "communityModules"
    ],
    limits: {
      seats: 1,
      communities: 3,
      mentorships: 1,
      storageGb: 0.5,
    },
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "premium-individual",
    name: "Individual Premium",
    description: "Advanced matching and exclusive community access.",
    priceMonthly: 19,
    priceAnnual: 190,
    price: 19,
    currency: "USD",
    interval: "month",
    customerType: "Individual",
    features: [
      "advancedAnalytics",
      "communityModules",
      "mentorModules",
      "advancedFilters",
      "privateCommunities",
      "advancedExports"
    ],
    limits: {
      seats: 1,
      communities: 10,
      mentorships: 5,
      storageGb: 5,
    },
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "organization-standard",
    name: "Organization",
    description: "Perfect for small incubators and accelerators.",
    priceMonthly: 99,
    priceAnnual: 990,
    price: 99,
    currency: "USD",
    interval: "month",
    customerType: "Tenant",
    features: [
      "sso",
      "advancedAnalytics",
      "communityModules",
      "mentorModules",
      "cohortModules",
      "advancedFilters",
      "privateCommunities",
      "advancedExports",
      "programManagement"
    ],
    limits: {
      seats: 50,
      communities: 5,
      mentorships: 20,
      storageGb: 20,
    },
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "tenant-multi-seat",
    name: "Multi-Seat Tenant",
    description: "Scale your ecosystem with advanced management tools.",
    priceMonthly: 499,
    priceAnnual: 4990,
    price: 499,
    currency: "USD",
    interval: "month",
    customerType: "Tenant",
    features: [
      "sso",
      "whiteLabeling",
      "advancedAnalytics",
      "communityModules",
      "mentorModules",
      "cohortModules",
      "advancedFilters",
      "privateCommunities",
      "advancedExports",
      "programManagement"
    ],
    limits: {
      seats: 500,
      communities: 20,
      mentorships: 100,
      storageGb: 100,
    },
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "enterprise-custom",
    name: "Enterprise",
    description: "Custom solutions for large-scale institutions.",
    priceMonthly: 0, // Contact for quote
    priceAnnual: 0,
    price: 0,
    currency: "USD",
    interval: "month",
    customerType: "Enterprise",
    features: [
      "sso",
      "whiteLabeling",
      "advancedAnalytics",
      "communityModules",
      "mentorModules",
      "cohortModules",
      "advancedFilters",
      "privateCommunities",
      "advancedExports",
      "programManagement"
    ],
    limits: {
      seats: -1,
      communities: -1,
      mentorships: -1,
      storageGb: -1,
    },
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const ALL_PLAN_FEATURE_KEYS = [
  "communityModules",
  "advancedFilters",
  "mentorModules",
  "privateCommunities",
  "advancedAnalytics",
  "cohortModules",
  "programManagement",
  "advancedExports",
  "sso",
  "whiteLabeling",
] as const;

export function hasPlanFeature(features: unknown, key: string): boolean {
  if (!features) return false;
  if (Array.isArray(features)) return features.includes(key);
  if (typeof features === "object") return Boolean((features as Record<string, unknown>)[key]);
  return false;
}

// --- Service Implementation ---
//
// Subscriptions and invoices are Firestore documents. There is no payment
// processor wired yet, so user-initiated plan changes are persisted as
// `billingRequests` records that admins (or a future payments backend) act on —
// they never pretend a charge happened.

export const billingService = {
  getPlans: async (): Promise<BillingPlan[]> => {
    return MOCK_PLANS;
  },

  getSubscription: async (id: string, type: 'user' | 'tenant'): Promise<Subscription | null> => {
    const docId = `${type}-${id}`;
    // Signed-out sessions (incl. demo mode) cannot read billing docs — skip the
    // denied read and derive the view below.
    if (auth.currentUser) {
      try {
        const snap = await getDoc(doc(db, 'subscriptions', docId));
        if (snap.exists()) return { ...(snap.data() as Subscription), id: snap.id };
      } catch (error) {
        console.error('Error reading subscription:', error);
      }
    }
    // No billing record yet: derive an honest view from the plan the account actually chose.
    const planId = planIdForAccount(type);
    const plan = MOCK_PLANS.find((p) => p.id === planId);
    return {
      id: docId,
      userId: type === 'user' ? id : undefined,
      tenantId: type === 'tenant' ? id : '',
      planId,
      status: 'Active',
      seatLimit: typeof plan?.limits?.seats === 'number' && plan.limits.seats > 0 ? plan.limits.seats : 1,
      currentPeriodEnd: '',
    } as Subscription;
  },

  getInvoices: async (id: string, type: 'user' | 'tenant'): Promise<Invoice[]> => {
    if (!auth.currentUser) return [];
    try {
      const field = type === 'user' ? 'userId' : 'tenantId';
      const snap = await getDocs(query(collection(db, 'invoices'), where(field, '==', id)));
      return snap.docs.map((d) => ({ ...(d.data() as Invoice), id: d.id }));
    } catch (error) {
      console.error('Error reading invoices:', error);
      return [];
    }
  },

  /** Persists a billing change request for the platform to process — no charge is made client-side. */
  requestChange: async (kind: 'upgrade' | 'cancel' | 'seats', payload: Record<string, any>): Promise<void> => {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error('Sign in required');
    await addDoc(collection(db, 'billingRequests'), {
      kind,
      userId: uid,
      createdAt: new Date().toISOString(),
      status: 'pending',
      ...payload,
    });
  },

  updateSubscription: async (subscriptionId: string, planId: string, cycle: 'Monthly' | 'Annual'): Promise<void> => {
    await billingService.requestChange('upgrade', { subscriptionId, planId, billingCycle: cycle });
  },

  cancelSubscription: async (subscriptionId: string, immediate: boolean = false): Promise<void> => {
    await billingService.requestChange('cancel', { subscriptionId, immediate });
  },

  requestSeats: async (subscriptionId: string, count: number): Promise<void> => {
    await billingService.requestChange('seats', { subscriptionId, seats: count });
  }
};
