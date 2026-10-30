import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { TenantConfig } from '../types';
import { DEFAULT_TENANT, hexToHslTriplet } from '../data/tenant';

interface TenantContextType {
  /** The resolved white-label tenant, or the platform's own tenant. Never null after loading. */
  tenant: TenantConfig | null;
  /** True when a white-label tenant was resolved from the host name or a preview slug. */
  isWhiteLabel: boolean;
  loading: boolean;
  error: string | null;
  updateBranding: (branding: Partial<NonNullable<TenantConfig['branding']>>) => Promise<void>;
  updateContent: (content: Partial<NonNullable<TenantConfig['content']>>) => Promise<void>;
}

const defaultTenantContext: TenantContextType = {
  tenant: DEFAULT_TENANT,
  isWhiteLabel: false,
  loading: false,
  error: null,
  updateBranding: async () => {},
  updateContent: async () => {},
};

const TenantContext = createContext<TenantContextType>(defaultTenantContext);

function applyTheme(branding: TenantConfig['branding']) {
  if (!branding) return;
  const root = document.documentElement;
  const set = (name: string, hex?: string) => {
    if (!hex) return;
    const triplet = hexToHslTriplet(hex);
    if (triplet) root.style.setProperty(name, triplet);
  };
  set('--primary', branding.primaryColor);
  set('--secondary', branding.secondaryColor);
  set('--accent', branding.accentColor);

  // Readable text on the primary color (YIQ contrast).
  if (!branding.primaryColor) return;
  const hex = branding.primaryColor.replace('#', '');
  if (!/^[0-9a-f]{6}$/i.test(hex)) return;
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  root.style.setProperty('--primary-foreground', yiq >= 128 ? '0 0% 0%' : '0 0% 100%');
}

export function TenantProvider({ children }: { children: ReactNode }) {
  const [tenant, setTenant] = useState<TenantConfig>(DEFAULT_TENANT);
  const [isWhiteLabel, setIsWhiteLabel] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTenant = async () => {
      try {
        setLoading(true);
        const hostname = window.location.hostname;
        const previewSlug = new URLSearchParams(window.location.search).get('tenant_preview');
        const isLocal = hostname === 'localhost' || hostname === '127.0.0.1';

        // The platform's own tenant serves localhost and the main domain unless a preview is asked for.
        if (isLocal && !previewSlug) return;

        const params = new URLSearchParams({ hostname });
        if (previewSlug) params.set('preview_slug', previewSlug);
        const res = await fetch(`/api/tenants/resolve?${params.toString()}`);
        if (!res.ok) return;
        const data = (await res.json()) as TenantConfig;
        if (!data?.id || data.id === DEFAULT_TENANT.id) return;
        setTenant({ ...DEFAULT_TENANT, ...data });
        setIsWhiteLabel(true);
        applyTheme(data.branding);
      } catch {
        setError(null);
      } finally {
        setLoading(false);
      }
    };

    fetchTenant();
  }, []);

  const updateBranding = async (branding: Partial<NonNullable<TenantConfig['branding']>>) => {
    const res = await fetch(`/api/tenants/${tenant.id}/branding`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(branding),
    }).catch(() => null);
    const saved = res?.ok ? await res.json().catch(() => branding) : branding;
    const next = { ...tenant, branding: { ...tenant.branding, ...saved } };
    setTenant(next);
    applyTheme(next.branding);
  };

  const updateContent = async (content: Partial<NonNullable<TenantConfig['content']>>) => {
    const res = await fetch(`/api/tenants/${tenant.id}/content`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(content),
    }).catch(() => null);
    const saved = res?.ok ? await res.json().catch(() => content) : content;
    setTenant({ ...tenant, content: { ...tenant.content, ...saved } });
  };

  return (
    <TenantContext.Provider value={{ tenant, isWhiteLabel, loading, error, updateBranding, updateContent }}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  return useContext(TenantContext);
}
