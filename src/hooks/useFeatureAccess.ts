import { useState, useEffect } from "react";
import { User, BillingPlan, Subscription } from "../types";
import { billingService, MOCK_PLANS } from "../services/billingService";

export type FeatureKey = string;
export type LimitKey = string;

export function useFeatureAccess(user: User | null, activeTenantId?: string) {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [plan, setPlan] = useState<BillingPlan | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAccess() {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        let sub: Subscription | null = null;
        
        // 1. Check if we are in a tenant context and user is a member
        if (activeTenantId) {
          sub = await billingService.getSubscription(activeTenantId, 'tenant');
        } else {
          // 2. Otherwise check user's individual subscription
          sub = await billingService.getSubscription(user.id, 'user');
        }

        if (sub) {
          setSubscription(sub);
          const activePlan = MOCK_PLANS.find(p => p.id === sub?.planId);
          if (activePlan) setPlan(activePlan);
        }
      } catch (error) {
        console.error("Error loading feature access:", error);
      } finally {
        setLoading(false);
      }
    }

    loadAccess();
  }, [user, activeTenantId]);

  const hasFeature = (feature: FeatureKey): boolean => {
    if (!plan) return false;
    return plan.features.includes(feature);
  };

  const getLimit = (limit: LimitKey): number => {
    if (!plan?.limits) return 0;
    return plan.limits[limit] ?? 0;
  };

  const isLimitExceeded = (limit: LimitKey, currentCount: number): boolean => {
    const max = getLimit(limit);
    if (max === -1) return false; // Unlimited
    return currentCount >= max;
  };

  return {
    subscription,
    plan,
    loading,
    hasFeature,
    getLimit,
    isLimitExceeded
  };
}
