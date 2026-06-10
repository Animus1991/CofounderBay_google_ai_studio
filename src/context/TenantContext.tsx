import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { TenantConfig } from '../types';

interface TenantContextType {
  tenant: TenantConfig | null;
  loading: boolean;
  error: string | null;
  updateBranding: (branding: Partial<TenantConfig['branding']>) => Promise<void>;
  updateContent: (content: Partial<TenantConfig['content']>) => Promise<void>;
}

const defaultTenantContext: TenantContextType = {
  tenant: null,
  loading: false,
  error: null,
  updateBranding: async () => {},
  updateContent: async () => {},
};

const TenantContext = createContext<TenantContextType>(defaultTenantContext);

export function TenantProvider({ children }: { children: ReactNode }) {
  const [tenant, setTenant] = useState<TenantConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTenant = async () => {
      try {
        setLoading(true);
        const hostname = window.location.hostname;
        const searchParams = new URLSearchParams(window.location.search);
        const previewSlug = searchParams.get('tenant_preview');

        // Skip tenant resolution for localhost / dev — no multi-tenancy needed
        if (hostname === 'localhost' || hostname === '127.0.0.1' || !previewSlug) {
          setTenant(null);
          setLoading(false);
          return;
        }

        let endpoint = `/api/tenants/resolve?hostname=${hostname}`;
        if (previewSlug) {
          endpoint += `&preview_slug=${previewSlug}`;
        }

        const res = await fetch(endpoint);
        if (!res.ok) {
          setTenant(null);
          return;
        }
        const data = await res.json();
        setTenant(data);
        if (data.branding) {
          applyTheme(data.branding);
        }
      } catch {
        setTenant(null);
      } finally {
        setLoading(false);
      }
    };

    fetchTenant();
  }, []);

  const applyTheme = (branding: TenantConfig['branding']) => {
    if (!branding) return;
    const root = document.documentElement;
    if (branding.primaryColor) root.style.setProperty('--primary', branding.primaryColor);
    if (branding.secondaryColor) root.style.setProperty('--secondary', branding.secondaryColor);
    if (branding.accentColor) root.style.setProperty('--accent', branding.accentColor);
    
    // Calculate contrast for primary color (simple YIQ)
    if (!branding.primaryColor) return;
    const hex = branding.primaryColor.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const yiq = (r * 299 + g * 587 + b * 114) / 1000;
    root.style.setProperty('--primary-foreground', yiq >= 128 ? '#000000' : '#ffffff');
  };

  const updateBranding = async (branding: Partial<TenantConfig['branding']>) => {
    if (!tenant) return;
    const res = await fetch(`/api/tenants/${tenant.id}/branding`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(branding),
    });
    if (res.ok) {
      const updatedBranding = await res.json();
      const newTenant = { ...tenant, branding: { ...tenant.branding, ...updatedBranding } };
      setTenant(newTenant);
      applyTheme(newTenant.branding);
    }
  };

  const updateContent = async (content: Partial<TenantConfig['content']>) => {
    if (!tenant) return;
    const res = await fetch(`/api/tenants/${tenant.id}/content`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(content),
    });
    if (res.ok) {
      const updatedContent = await res.json();
      setTenant({ ...tenant, content: { ...tenant.content, ...updatedContent } });
    }
  };

  return (
    <TenantContext.Provider value={{ tenant, loading, error, updateBranding, updateContent }}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  return useContext(TenantContext);
}
