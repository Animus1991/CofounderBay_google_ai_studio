import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { TenantConfig } from '../types';
import { DEFAULT_TENANT, hexToHslTriplet } from '../data/tenant';
import { studioApi } from '../lib/studioApi';
import { ApiError } from '../lib/apiClient';

/** Whether a branding or content change reached the server; the theme is previewed locally either way. */
export type TenantSaveResult = { saved: boolean; message?: string };

function saveFailure(error: unknown): TenantSaveResult {
  if (error instanceof ApiError) {
    const body = error.body as { error?: unknown } | null;
    return { saved: false, message: typeof body?.error === 'string' ? body.error : error.message };
  }
  return { saved: false, message: 'The server could not be reached.' };
}

interface TenantContextType {
  /** The resolved white-label tenant, or the platform's own tenant. Never null after loading. */
  tenant: TenantConfig | null;
  /** True when a white-label tenant was resolved from the host name or a preview slug. */
  isWhiteLabel: boolean;
  loading: boolean;
  error: string | null;
  updateBranding: (branding: Partial<NonNullable<TenantConfig['branding']>>) => Promise<TenantSaveResult>;
  updateContent: (content: Partial<NonNullable<TenantConfig['content']>>) => Promise<TenantSaveResult>;
}

const defaultTenantContext: TenantContextType = {
  tenant: DEFAULT_TENANT,
  isWhiteLabel: false,
  loading: false,
  error: null,
  updateBranding: async () => ({ saved: false }),
  updateContent: async () => ({ saved: false }),
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

  // Changes go through the shared API client with the caller's sign-in (server/tenants.ts
  // validates every field and allows only tenant administrators on a sign-in server).
  // The new look is applied locally either way, so an admin can preview it; the result
  // says whether it was saved, and why not.
  const updateBranding = async (branding: Partial<NonNullable<TenantConfig['branding']>>): Promise<TenantSaveResult> => {
    let result: TenantSaveResult = { saved: true };
    let saved: Partial<NonNullable<TenantConfig['branding']>> = branding;
    try {
      saved = await studioApi<Partial<NonNullable<TenantConfig['branding']>>>(`/tenants/${encodeURIComponent(tenant.id)}/branding`, { method: 'POST', body: branding });
    } catch (error) {
      result = saveFailure(error);
    }
    const next = { ...tenant, branding: { ...tenant.branding, ...saved } };
    setTenant(next);
    applyTheme(next.branding);
    return result;
  };

  const updateContent = async (content: Partial<NonNullable<TenantConfig['content']>>): Promise<TenantSaveResult> => {
    let result: TenantSaveResult = { saved: true };
    let saved: Partial<NonNullable<TenantConfig['content']>> = content;
    try {
      saved = await studioApi<Partial<NonNullable<TenantConfig['content']>>>(`/tenants/${encodeURIComponent(tenant.id)}/content`, { method: 'POST', body: content });
    } catch (error) {
      result = saveFailure(error);
    }
    setTenant({ ...tenant, content: { ...tenant.content, ...saved } });
    return result;
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
