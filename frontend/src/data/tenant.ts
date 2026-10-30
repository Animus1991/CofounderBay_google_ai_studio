import type { TenantConfig } from '../types';

/** The platform's own tenant, used whenever no white-label tenant is resolved (localhost, the main domain). */
export const DEFAULT_TENANT: TenantConfig = {
  id: 't1',
  tenantId: 't1',
  slug: 'default',
  name: 'CoFounderBay Global',
  displayName: 'CoFounderBay',
  fullDescription: 'The ecosystem for finding co-founders, mentors and investors.',
  supportEmail: 'support@cofounderbay.com',
  branding: {
    logoUrl: '',
    primaryColor: '#1c1917',
    secondaryColor: '#78716c',
    accentColor: '#f5f5f4',
    backgroundStyle: 'solid',
  },
  content: {
    heroTitle: 'Build your startup team with precision.',
    heroSubtitle: 'CoFounderBay reduces founder risk by connecting you with compatible partners.',
    ctaLabel: 'Join platform',
    dashboardWelcomeText: "Your profile is {score}% complete. Let's find your partner.",
    communityNamingConvention: 'Communities',
    emailSignature: 'The CoFounderBay Team',
  },
  features: ['matching', 'messaging', 'communities', 'events', 'fundraising'],
  settings: {},
};

/** "#1c1917" → "24 10% 10%", the triplet format the CSS tokens use inside hsl(). */
export function hexToHslTriplet(hex: string): string | null {
  const clean = hex.trim().replace('#', '');
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  if (!/^[0-9a-f]{6}$/i.test(full)) return null;
  const r = parseInt(full.slice(0, 2), 16) / 255;
  const g = parseInt(full.slice(2, 4), 16) / 255;
  const b = parseInt(full.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  return `${Math.round(h)} ${Math.round(s * 1000) / 10}% ${Math.round(l * 1000) / 10}%`;
}
