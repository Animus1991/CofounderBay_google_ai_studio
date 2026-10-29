import React, { createContext, useContext, useEffect, useMemo, useState, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from './firebase';
import { User, UserProfile, UserRole, ProfileStatus, VerificationStatus, AccountStatus } from './types';

// Components
import Layout from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';
import CommandPalette from './components/CommandPalette';
import GlobalStudioModals from './components/GlobalStudioModals';
import RouteLifecycle from './components/RouteLifecycle';
import OfflineBanner from './components/OfflineBanner';
import { ToastProvider } from './context/ToastContext';
import { LanguageProvider } from './lib/language';
import { Both } from './lib/both';
import { TenantProvider, useTenant } from './context/TenantContext';
import { MessagingProvider } from './context/MessagingContext';
import { mergeFitIntoViewer } from './lib/fitCheck';
import { readUxPrefs, UX_PREFS_KEY } from './lib/personalization';
import { useStored } from './lib/useStored';
import { applyPaletteToDocument, useUIStore } from './stores/useUIStore';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import { keys, readProfileLocal, setDataScope } from './lib/localLists';
import { startCloudSync, stopCloudSync } from './lib/cloudSync';
import { startDirectory, stopDirectory } from './lib/directory';
import { setOwnConnectionIds, setSocialIdentity, startPresence, startSocial, stopSocial } from './lib/social';
import { getLang } from './lib/language';
import { markEmailVerified } from './lib/account';
import { coverFor } from './data/photos';
import { lazyPage, prefetchPages } from './lib/lazyPage';
import { topPages } from './lib/usage';

// First-paint pages load with the app; every other page is its own chunk (see lib/lazyPage).
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import SignUpPage from './pages/SignUpPage';
import DashboardPage from './pages/DashboardPage';
import NotFoundPage from './pages/NotFound';

const FitCheck = lazyPage('FitCheck', () => import('./pages/FitCheck'));
const OnboardingWizard = lazyPage('OnboardingWizard', () => import('./pages/OnboardingWizard'));
const ProfilePage = lazyPage('ProfilePage', () => import('./pages/ProfilePage'));
const MatchDiscovery = lazyPage('MatchDiscovery', () => import('./pages/MatchDiscovery'));
const MentorsPage = lazyPage('MentorsPage', () => import('./pages/MentorsPage'));
const CommunitiesPage = lazyPage('CommunitiesPage', () => import('./pages/CommunitiesPage'));
const CommunicationHub = lazyPage('CommunicationHub', () => import('./pages/CommunicationHub'));
const MilestonesPage = lazyPage('MilestonesPage', () => import('./pages/MilestonesPage'));
const AdminDashboard = lazyPage('AdminDashboard', () => import('./pages/AdminDashboard'));
const EventsPage = lazyPage('EventsPage', () => import('./pages/Events'));
const DiscoveryPage = lazyPage('DiscoveryPage', () => import('./pages/Discovery'));
const FounderTools = lazyPage('FounderTools', () => import('./pages/FounderTools'));
const Fundraising = lazyPage('Fundraising', () => import('./pages/Fundraising'));
const Workspace = lazyPage('Workspace', () => import('./pages/Workspace'));
const CalendarPage = lazyPage('CalendarPage', () => import('./pages/Calendar'));
const Network = lazyPage('Network', () => import('./pages/Network'));
const Programs = lazyPage('Programs', () => import('./pages/Programs'));
const Resources = lazyPage('Resources', () => import('./pages/Resources'));
const Insights = lazyPage('Insights', () => import('./pages/Insights'));
const LegalHub = lazyPage('LegalHub', () => import('./pages/LegalHub'));
const Perks = lazyPage('Perks', () => import('./pages/Perks'));
const Notifications = lazyPage('Notifications', () => import('./pages/Notifications'));
const SettingsPage = lazyPage('SettingsPage', () => import('./pages/Settings'));
const Pricing = lazyPage('Pricing', () => import('./pages/Pricing'));
const UserManagement = lazyPage('UserManagement', () => import('./pages/admin/UserManagement'));
const AutomationDashboard = lazyPage('AutomationDashboard', () => import('./pages/admin/AutomationDashboard'));
const BrandingSettings = lazyPage('BrandingSettings', () => import('./pages/admin/BrandingSettings'));
const SSOSettings = lazyPage('SSOSettings', () => import('./pages/admin/SSOSettings'));
const TaxonomySettings = lazyPage('TaxonomySettings', () => import('./pages/admin/TaxonomySettings'));
const DomainSettings = lazyPage('DomainSettings', () => import('./pages/admin/DomainSettings'));
const TenantBilling = lazyPage('TenantBilling', () => import('./pages/admin/TenantBilling'));
const BillingPage = lazyPage('BillingPage', () => import('./pages/settings/Billing'));
const BillingOversight = lazyPage('BillingOversight', () => import('./pages/superadmin/BillingOversight'));
const AssistantPage = lazyPage('AssistantPage', () => import('./pages/AssistantPage'));

// Page loading fallback
function PageLoader() {
 return (
  <div className="min-h-[60vh] flex items-center justify-center">
   <div className="flex flex-col items-center gap-3">
    <div className="w-8 h-8 border-3 border-stone-200 border-t-stone-900 rounded-full animate-spin" />
    <p className="text-xs font-medium text-stone-400"><Both en="Loading" el="Φόρτωση" /></p>
   </div>
  </div>
 );
}

// Auth Context
interface AuthContextType {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  /** The signed-in person in the app's own shape, for pages that take a `user` prop. */
  appUser: User | null;
  loading: boolean;
  isAdmin: boolean;
  isDemoMode: boolean;
  toggleDemoMode: (enabled: boolean) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  appUser: null,
  loading: true,
  isAdmin: false,
  isDemoMode: false,
  toggleDemoMode: () => {},
});

export const useAuth = () => useContext(AuthContext);

export const DEMO_USER_ID = 'demo-user';

function demoProfile(): UserProfile {
  const now = new Date().toISOString();
  return {
    id: DEMO_USER_ID,
    uid: DEMO_USER_ID,
    fullName: 'Demo User',
    email: 'demo@cofounderbay.com',
    bio: 'Technical founder exploring CoFounderBay with sample data. Nothing here is saved to a server.',
    headline: 'Technical founder building a FinTech product',
    roles: [UserRole.FOUNDER, UserRole.ADMIN],
    skills: ['React', 'TypeScript', 'Node.js'],
    lookingFor: ['Sales', 'Growth', 'Fundraising'],
    interests: ['FinTech', 'SaaS', 'AI'],
    industry: 'FinTech',
    location: 'Athens, Greece',
    timezone: 'Europe/Athens',
    stage: 'Pre-seed',
    role: 'Founder',
    commitment: 'Full-time',
    avatarUrl: coverFor('demo-account', ['aegean'], 200, 200),
    profileStatus: ProfileStatus.PUBLISHED,
    verificationStatus: VerificationStatus.VERIFIED,
    profileCompletionScore: 100,
    accountStatus: AccountStatus.ACTIVE,
    onboardingCompleted: true,
    createdAt: now,
    updatedAt: now,
  } as unknown as UserProfile;
}

function toAppUser(id: string, profile: UserProfile | null, firebaseUser: FirebaseUser | null): User {
  const now = new Date().toISOString();
  const roles = Array.isArray(profile?.roles) && profile.roles.length > 0 ? profile.roles : [UserRole.FOUNDER];
  return {
    id,
    fullName: profile?.fullName || firebaseUser?.displayName || firebaseUser?.email?.split('@')[0] || 'Founder',
    email: profile?.email || firebaseUser?.email || '',
    roles,
    profileStatus: profile?.profileStatus ?? ProfileStatus.DRAFT,
    verificationStatus: profile?.verificationStatus ?? VerificationStatus.UNVERIFIED,
    profileCompletionScore: profile?.profileCompletionScore ?? 0,
    accountStatus: profile?.accountStatus ?? AccountStatus.ACTIVE,
    onboardingCompleted: !!profile?.onboardingCompleted,
    createdAt: profile?.createdAt || now,
    updatedAt: profile?.updatedAt || now,
  };
}

// Protected Route Component
const ProtectedRoute = ({ children, requireOnboarding = true }: { children: React.ReactNode, requireOnboarding?: boolean }) => {
  const { user, profile, loading, isDemoMode } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="w-12 h-12 border-4 border-stone-200 border-t-stone-900 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user && !isDemoMode) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!isDemoMode && requireOnboarding && !profile?.onboardingCompleted && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
};

const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAdmin, isDemoMode } = useAuth();
  // Demo mode: show admin pages with sample data (read-only preview)
  // Real mode: require verified admin role from Firebase custom claims
  if (!isDemoMode && !isAdmin) return <ProtectedRoute><Navigate to="/dashboard" replace /></ProtectedRoute>;
  return <ProtectedRoute>{children}</ProtectedRoute>;
};

/** Pages written for a `user` prop get the signed-in person, never an empty object. */
function WithUser({ render }: { render: (user: User) => React.ReactNode }) {
  const { appUser } = useAuth();
  if (!appUser) return null;
  return <>{render(appUser)}</>;
}


/** "/" shows the landing page to guests; a member who set a home page lands there instead. */
function HomeGate() {
  const { user, isDemoMode } = useAuth();
  const prefs = useStored(readUxPrefs, [UX_PREFS_KEY]);
  if ((user || isDemoMode) && prefs.homePath) return <Navigate to={prefs.homePath} replace />;
  return <LandingPage />;
}

function TenantBillingRoute() {
  const { tenant } = useTenant();
  if (!tenant) return null;
  return <TenantBilling tenant={tenant} />;
}

/** One messaging state for the whole app, so the assistant and every page see the same conversations. */
function AppMessaging({ children }: { children: React.ReactNode }) {
  const { user, profile, isDemoMode } = useAuth();
  const userId = user?.uid || (isDemoMode ? 'demo-user' : '');
  const me = useMemo(
    () => ({
      id: userId,
      fullName: profile?.fullName || user?.displayName || 'You',
      avatar: profileAvatar(profile) || user?.photoURL || '',
      headline: profile?.headline || '',
      role: profile?.role || profile?.roles?.[0] || 'Founder',
      assistant: mergeFitIntoViewer(profile ? {
        fullName: profile.fullName,
        headline: profile.headline,
        bio: profile.bio,
        skills: profile.skills,
        lookingFor: profile.lookingFor,
        interests: profile.interests,
        industry: profile.industry,
        stage: profile.stage,
        commitment: profile.commitment,
        location: profile.location,
        timezone: profile.timezone,
      } : null),
    }),
    [userId, profile, user],
  );
  return <MessagingProvider userId={userId} isDemo={isDemoMode} me={me}>{children}</MessagingProvider>;
}

function profileAvatar(profile: UserProfile | null): string {
  if (!profile) return '';
  const record = profile as unknown as { avatarUrl?: string; profile?: { profilePhoto?: string } };
  return record.avatarUrl || record.profile?.profilePhoto || '';
}

/**
 * Starts the live services of a signed-in account (member directory,
 * connections, notifications, blocks, cloud sync of the account's lists and
 * presence) and stops them on sign-out or when the sample account opens.
 */
function useAccountServices(accountId: string | null, isDemo: boolean, profile: UserProfile | null, firebaseUser: FirebaseUser | null) {
  const real = Boolean(accountId) && !isDemo;
  const uid = real ? accountId : null;

  useEffect(() => {
    if (!uid) {
      setSocialIdentity(null);
      stopSocial();
      stopDirectory();
      stopCloudSync();
      return undefined;
    }
    startCloudSync(uid);
    startDirectory(uid);
    startSocial(uid, getLang);
    return () => {
      stopSocial();
      stopDirectory();
      stopCloudSync();
      setSocialIdentity(null);
    };
  }, [uid]);

  useEffect(() => {
    if (!uid) return;
    const record = profile as unknown as { connectionIds?: unknown; sharePresence?: unknown } | null;
    setSocialIdentity({
      uid,
      name: profile?.fullName || firebaseUser?.displayName || firebaseUser?.email?.split('@')[0] || 'Member',
      headline: profile?.headline || '',
      avatar: profileAvatar(profile) || firebaseUser?.photoURL || '',
      role: profile?.role || profile?.roles?.[0] || 'Founder',
    });
    setOwnConnectionIds(Array.isArray(record?.connectionIds) ? (record.connectionIds as string[]) : []);
  }, [uid, profile, firebaseUser]);

  // A confirmed e-mail address becomes the Verified badge on the profile.
  useEffect(() => {
    if (!uid || !firebaseUser?.emailVerified || !profile || profile.verificationStatus === VerificationStatus.VERIFIED) return;
    void markEmailVerified(uid).catch(() => undefined);
  }, [uid, firebaseUser?.emailVerified, profile]);

  const sharePresence = (profile as unknown as { sharePresence?: boolean } | null)?.sharePresence !== false;
  useEffect(() => {
    if (!uid) return undefined;
    startPresence(uid, sharePresence);
    return () => startPresence(uid, false);
  }, [uid, sharePresence]);
}

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(() => {
    const stored = localStorage.getItem('demo_mode');
    if (stored === null) {
      localStorage.setItem('demo_mode', 'true');
      return true;
    }
    return stored === 'true';
  });

  // Warm the chunks of the pages this account opens most (plus the core loop) once the app is idle.
  useEffect(() => {
    const chunkFor: Record<string, string> = {
      '/matches': 'MatchDiscovery', '/messages': 'CommunicationHub', '/profile': 'ProfilePage', '/discovery': 'DiscoveryPage',
      '/network': 'Network', '/workspace': 'Workspace', '/fundraising': 'Fundraising', '/founder-tools': 'FounderTools',
      '/milestones': 'MilestonesPage', '/calendar': 'CalendarPage', '/events': 'EventsPage', '/mentors': 'MentorsPage',
      '/assistant': 'AssistantPage', '/settings': 'SettingsPage', '/notifications': 'Notifications',
    };
    const visited = topPages(4).map((row) => chunkFor[row.path]).filter((name): name is string => Boolean(name));
    prefetchPages([...new Set([...visited, 'MatchDiscovery', 'CommunicationHub'])]);
  }, []);

  const paletteTheme = useUIStore((s) => s.paletteTheme);
  useEffect(() => {
    applyPaletteToDocument(paletteTheme);
  }, [paletteTheme]);

  const toggleDemoMode = (enabled: boolean) => {
    // A signed-in account must not be swapped for the demo identity.
    if (enabled && auth.currentUser) return;
    setIsDemoMode(enabled);
    if (enabled) {
      localStorage.setItem('demo_mode', 'true');
    } else {
      localStorage.setItem('demo_mode', 'false');
      setIsAdmin(false);
      if (!auth.currentUser) {
        setUser(null);
        setProfile(null);
      }
    }
  };

  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;
    let unsubscribeUser: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        if (localStorage.getItem('demo_mode') === 'true') {
          localStorage.removeItem('demo_mode');
          setIsDemoMode(false);
        }
      } else if (isDemoMode) {
        setLoading(false);
        return;
      }

      setUser(firebaseUser);

      // Clean up previous listeners
      if (unsubscribeProfile) unsubscribeProfile();
      if (unsubscribeUser) unsubscribeUser();

      if (firebaseUser) {
        setLoading(true);

        let userData: any = null;
        let profileData: any = null;
        let userChecked = false;
        let profileChecked = false;

        const checkDone = () => {
          if (userChecked && profileChecked) {
            if (userData || profileData) {
              setProfile({
                ...userData,
                ...profileData,
                uid: firebaseUser.uid // Ensure uid is present
              } as UserProfile);
            } else {
              setProfile(null);
            }
            setLoading(false);
          }
        };

        // Listen to user changes
        unsubscribeUser = onSnapshot(doc(db, 'users', firebaseUser.uid), (doc) => {
          if (doc.exists()) {
            userData = doc.data();
            if (userData.roles?.includes(UserRole.ADMIN) || userData.roles?.includes(UserRole.SUPER_ADMIN)) {
              setIsAdmin(true);
            } else {
              setIsAdmin(false);
            }
          } else {
            userData = null;
            setIsAdmin(false);
          }
          userChecked = true;
          checkDone();
        }, (error) => {
          console.error('Error listening to user:', error);
          userChecked = true;
          checkDone();
        });

        // Listen to profile changes
        unsubscribeProfile = onSnapshot(doc(db, 'profiles', firebaseUser.uid), (doc) => {
          if (doc.exists()) {
            profileData = doc.data();
          } else {
            profileData = null;
          }
          profileChecked = true;
          checkDone();
        }, (error) => {
          console.error('Error listening to profile:', error);
          profileChecked = true;
          checkDone();
        });

      } else {
        setProfile(null);
        setIsAdmin(false);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
      if (unsubscribeUser) unsubscribeUser();
    };
  }, [isDemoMode]);

  const profileLocal = useStored(readProfileLocal, [keys.profileLocal]);
  const demo = useMemo(() => {
    if (!isDemoMode) return null;
    return {
      user: {
        uid: DEMO_USER_ID,
        email: 'demo@cofounderbay.com',
        displayName: profileLocal.fullName ?? 'Demo User',
        photoURL: coverFor('demo-account', ['aegean'], 200, 200),
      } as FirebaseUser,
      profile: { ...demoProfile(), ...profileLocal },
    };
  }, [isDemoMode, profileLocal]);

  const activeUser = demo ? demo.user : user;
  const activeProfile = demo ? demo.profile : profile;
  const accountId = activeUser?.uid ?? null;

  useEffect(() => {
    setDataScope(demo ? null : accountId);
  }, [demo, accountId]);

  useAccountServices(accountId, Boolean(demo), activeProfile, activeUser);

  const appUser = useMemo(
    () => (accountId ? toAppUser(accountId, activeProfile, activeUser) : null),
    [accountId, activeProfile, activeUser],
  );

  return (
    <ErrorBoundary>
     <QueryClientProvider client={queryClient}>
     <TenantProvider>
     <ToastProvider>
     <LanguageProvider>
      <AuthContext.Provider value={{
        user: activeUser,
        profile: activeProfile,
        appUser,
        loading,
        isAdmin,
        isDemoMode,
        toggleDemoMode
      }}>
        <Router>
          <RouteLifecycle />
          <OfflineBanner />
          <CommandPalette />
          <GlobalStudioModals />
          <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<HomeGate />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignUpPage />} />
            <Route path="/quiz" element={<FitCheck />} />

            {/* Onboarding */}
            <Route
              path="/onboarding"
              element={
                <ProtectedRoute requireOnboarding={false}>
                  <OnboardingWizard />
                </ProtectedRoute>
              }
            />

            {/* App Layout Routes */}
            <Route element={<AppMessaging><Layout /></AppMessaging>}>
              <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
              <Route path="/profile/:id" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
              <Route path="/matches" element={<ProtectedRoute><MatchDiscovery /></ProtectedRoute>} />
              <Route path="/discovery" element={<ProtectedRoute><WithUser render={(u) => <DiscoveryPage user={u} />} /></ProtectedRoute>} />
              <Route path="/events" element={<ProtectedRoute><WithUser render={(u) => <EventsPage user={u} />} /></ProtectedRoute>} />
              <Route path="/mentors" element={<ProtectedRoute><MentorsPage /></ProtectedRoute>} />
              <Route path="/communities" element={<ProtectedRoute><CommunitiesPage /></ProtectedRoute>} />
              <Route path="/messages" element={<ProtectedRoute><WithUser render={(u) => <CommunicationHub user={u} />} /></ProtectedRoute>} />
              <Route path="/assistant" element={<ProtectedRoute><AssistantPage /></ProtectedRoute>} />
              <Route path="/milestones" element={<ProtectedRoute><MilestonesPage /></ProtectedRoute>} />

              {/* Founder Tools */}
              <Route path="/founder-tools" element={<ProtectedRoute><WithUser render={(u) => <FounderTools user={u} />} /></ProtectedRoute>} />
              <Route path="/fundraising" element={<ProtectedRoute><WithUser render={(u) => <Fundraising user={u} />} /></ProtectedRoute>} />
              <Route path="/workspace" element={<ProtectedRoute><WithUser render={(u) => <Workspace user={u} />} /></ProtectedRoute>} />
              <Route path="/calendar" element={<ProtectedRoute><CalendarPage /></ProtectedRoute>} />

              {/* Discovery */}
              <Route path="/community" element={<Navigate to="/communities" replace />} />
              <Route path="/programs" element={<ProtectedRoute><WithUser render={(u) => <Programs user={u} />} /></ProtectedRoute>} />
              <Route path="/network" element={<ProtectedRoute><WithUser render={(u) => <Network user={u} />} /></ProtectedRoute>} />

              {/* Resources */}
              <Route path="/resources" element={<ProtectedRoute><WithUser render={(u) => <Resources user={u} />} /></ProtectedRoute>} />
              <Route path="/insights" element={<ProtectedRoute><WithUser render={(u) => <Insights user={u} />} /></ProtectedRoute>} />
              <Route path="/legal" element={<ProtectedRoute><LegalHub /></ProtectedRoute>} />
              <Route path="/perks" element={<ProtectedRoute><Perks /></ProtectedRoute>} />

              {/* User */}
              <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
              <Route path="/settings/billing" element={<ProtectedRoute><WithUser render={(u) => <BillingPage user={u} />} /></ProtectedRoute>} />
              <Route path="/pricing" element={<Pricing />} />

              {/* Admin Routes */}
              <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
              <Route path="/admin/users" element={<AdminRoute><WithUser render={(u) => <UserManagement user={u} />} /></AdminRoute>} />
              <Route path="/admin/automation" element={<AdminRoute><WithUser render={(u) => <AutomationDashboard user={u} />} /></AdminRoute>} />
              <Route path="/admin/branding" element={<AdminRoute><WithUser render={(u) => <BrandingSettings user={u} />} /></AdminRoute>} />
              <Route path="/admin/sso" element={<AdminRoute><WithUser render={(u) => <SSOSettings user={u} />} /></AdminRoute>} />
              <Route path="/admin/taxonomy" element={<AdminRoute><WithUser render={(u) => <TaxonomySettings user={u} />} /></AdminRoute>} />
              <Route path="/admin/taxonomies" element={<Navigate to="/admin/taxonomy" replace />} />
              <Route path="/admin/domains" element={<AdminRoute><DomainSettings /></AdminRoute>} />
              <Route path="/admin/billing" element={<AdminRoute><TenantBillingRoute /></AdminRoute>} />
              <Route path="/admin/billing-oversight" element={<AdminRoute><BillingOversight /></AdminRoute>} />
            </Route>

            {/* Fallback — professional 404 instead of a silent redirect */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
          </Suspense>
        </Router>
      </AuthContext.Provider>
     </LanguageProvider>
     </ToastProvider>
     </TenantProvider>
     </QueryClientProvider>
    </ErrorBoundary>
  );
}
