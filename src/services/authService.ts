import { TenantSSOConfig, UserRole } from '../types';
import { createLogger } from '../lib/logger';

const log = createLogger('auth');

// Mock data for SSO discovery
const mockDomainMappings: Record<string, string> = {
  'stanford.edu': 'tenant-stanford',
  'mit.edu': 'tenant-mit',
  'google.com': 'tenant-google',
};

const mockSSOConfigs: Record<string, TenantSSOConfig> = {
  'tenant-stanford': {
    tenantId: 'tenant-stanford',
    provider: 'OIDC',
    clientId: 'stanford-client-id',
    clientSecret: 'stanford-client-secret',
    issuerUrl: 'https://auth.stanford.edu',
    status: 'Enabled',
    isEnabled: true,
    ssoMandatory: true,
    allowedDomains: ['stanford.edu'],
    loginButtonLabel: 'Continue with Stanford SSO',
    autoProvisionEnabled: true,
    defaultRole: UserRole.CO_FOUNDER_CANDIDATE,
    jitEnabled: true,
  },
  'tenant-google': {
    tenantId: 'tenant-google',
    provider: 'Google',
    clientId: 'google-client-id',
    clientSecret: 'google-client-secret',
    issuerUrl: 'https://accounts.google.com',
    status: 'Enabled',
    isEnabled: true,
    ssoMandatory: false,
    allowedDomains: ['google.com'],
    loginButtonLabel: 'Sign in with Google Workspace',
    autoProvisionEnabled: true,
    defaultRole: UserRole.ADVISOR,
    jitEnabled: true,
  }
};

export const authService = {
  /**
   * Discovers the tenant and SSO configuration based on an email address.
   */
  async discoverSSO(email: string): Promise<{ tenantId: string | null; config: TenantSSOConfig | null }> {
    const domain = email.split('@')[1] ?? '';
    const tenantId = mockDomainMappings[domain] || null;
    const config = (tenantId ? mockSSOConfigs[tenantId] : null) ?? null;
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return { tenantId, config };
  },

  /**
   * Initiates the SSO flow for a specific tenant.
   */
  async initiateSSO(tenantId: string): Promise<string> {
    // In a real app, this would redirect to the IdP
    // For MVP, we'll return a mock auth URL
    log.info(`Initiating SSO for tenant: ${tenantId}`);
    return `/api/auth/sso/callback?tenantId=${tenantId}&code=mock_code`;
  },

  /**
   * Logs an authentication event for auditing.
   */
  async logAuthEvent(event: {
    userId?: string;
    tenantId?: string;
    eventType: string;
    providerType: string;
    metadata?: any;
  }) {
    log.info('Auth Event Logged:', {
      ...event,
      timestamp: new Date().toISOString(),
      ip: '127.0.0.1',
      userAgent: navigator.userAgent
    });
  }
};
