import { BillingPlan, Subscription, Invoice, UserRole } from "../types";
import { readPlan } from "../lib/localLists";

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

// --- Service Implementation ---

export const billingService = {
  getPlans: async (): Promise<BillingPlan[]> => {
    return MOCK_PLANS;
  },

  getSubscription: async (id: string, type: 'user' | 'tenant'): Promise<Subscription | null> => {
    const planId = planIdForAccount(type);
    return {
      id: type === "user" ? `sub-${id}` : "sub_tenant",
      userId: type === 'user' ? id : undefined,
      tenantId: type === 'tenant' ? id : "default_tenant",
      planId,
      billingCycle: "Annual",
      status: "Active",
      renewalDate: "2027-01-01T00:00:00Z",
      seatLimit: type === 'tenant' ? 50 : 1,
      activeSeatCount: type === 'tenant' ? 12 : 1,
      currentPeriodEnd: "2027-01-01T00:00:00Z",
    };
  },

  getInvoices: async (id: string, type: 'user' | 'tenant'): Promise<Invoice[]> => {
    if (type === 'user' && planIdForAccount('user') === 'free-individual') return [];
    return [
      {
        id: "inv_001",
        subscriptionId: "sub_123",
        userId: type === 'user' ? id : undefined,
        number: "INV-2024-001",
        status: "Paid",
        currency: "USD",
        total: 190,
        amount: 190,
        dueDate: "2024-01-01T00:00:00Z",
        paidAt: "2024-01-01T00:00:00Z",
        createdAt: "2024-01-01T00:00:00Z",
      },
      {
        id: "inv_002",
        subscriptionId: "sub_123",
        userId: type === 'user' ? id : undefined,
        number: "INV-2025-001",
        status: "Open",
        currency: "USD",
        total: 190,
        amount: 190,
        dueDate: "2025-01-01T00:00:00Z",
        createdAt: "2024-12-15T00:00:00Z",
      }
    ];
  },

  updateSubscription: async (subscriptionId: string, planId: string, cycle: 'Monthly' | 'Annual'): Promise<void> => {
    console.log(`Updating subscription ${subscriptionId} to plan ${planId} (${cycle})`);
    return new Promise(resolve => setTimeout(resolve, 1000));
  },

  cancelSubscription: async (subscriptionId: string, immediate: boolean = false): Promise<void> => {
    console.log(`Canceling subscription ${subscriptionId} (immediate: ${immediate})`);
    return new Promise(resolve => setTimeout(resolve, 1000));
  },

  requestSeats: async (subscriptionId: string, count: number): Promise<void> => {
    console.log(`Requesting ${count} seats for subscription ${subscriptionId}`);
    return new Promise(resolve => setTimeout(resolve, 1000));
  }
};
