import React, { createContext, useContext, useEffect, useMemo, useState, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from './firebase';
import { User, UserProfile, UserRole, ProfileStatus, VerificationStatus, AccountStatus } from './types';

// Components
import Layout from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';
import CommandPalette from './components/CommandPalette';
import RouteLifecycle from './components/RouteLifecycle';
import OfflineBanner from './components/OfflineBanner';
import { ToastProvider } from './context/ToastContext';
import { LanguageProvider } from './lib/language';
import { Both } from './lib/both';
import { TenantProvider, useTenant } from './context/TenantContext';
import { MessagingProvider } from './context/MessagingContext';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import { setDataScope } from './lib/localLists';

// Lazy-loaded pages (code-splitting)
const LandingPage = lazy(() => import('./pages/LandingPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const SignUpPage = lazy(() => import('./pages/SignUpPage'));
const FitCheck = lazy(() => import('./pages/FitCheck'));
const OnboardingWizard = lazy(() => import('./pages/OnboardingWizard'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const MatchDiscovery = lazy(() => import('./pages/MatchDiscovery'));
const MentorsPage = lazy(() => import('./pages/MentorsPage'));
const CommunitiesPage = lazy(() => import('./pages/CommunitiesPage'));
const CommunicationHub = lazy(() => import('./pages/CommunicationHub'));
const MilestonesPage = lazy(() => import('./pages/MilestonesPage'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const EventsPage = lazy(() => import('./pages/Events'));
const DiscoveryPage = lazy(() => import('./pages/Discovery'));
const FounderTools = lazy(() => import('./pages/FounderTools'));
const Fundraising = lazy(() => import('./pages/Fundraising'));
const Workspace = lazy(() => import('./pages/Workspace'));
const CalendarPage = lazy(() => import('./pages/Calendar'));
const Network = lazy(() => import('./pages/Network'));
const Programs = lazy(() => import('./pages/Programs'));
const Resources = lazy(() => import('./pages/Resources'));
const Insights = lazy(() => import('./pages/Insights'));
const LegalHub = lazy(() => import('./pages/LegalHub'));
const Perks = lazy(() => import('./pages/Perks'));
const Notifications = lazy(() => import('./pages/Notifications'));
const SettingsPage = lazy(() => import('./pages/Settings'));
const Pricing = lazy(() => import('./pages/Pricing'));
const UserManagement = lazy(() => import('./pages/admin/UserManagement'));
const AutomationDashboard = lazy(() => import('./pages/admin/AutomationDashboard'));
const BrandingSettings = lazy(() => import('./pages/admin/BrandingSettings'));
const SSOSettings = lazy(() => import('./pages/admin/SSOSettings'));
const TaxonomySettings = lazy(() => import('./pages/admin/TaxonomySettings'));
const DomainSettings = lazy(() => import('./pages/admin/DomainSettings'));
const TenantBilling = lazy(() => import('./pages/admin/TenantBilling'));
const BillingPage = lazy(() => import('./pages/settings/Billing'));
const BillingOversight = lazy(() => import('./pages/superadmin/BillingOversight'));
const NotFoundPage = lazy(() => import('./pages/NotFound'));

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
    avatarUrl: 'https://picsum.photos/seed/demo/100/100',
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
  return <ProtectedRoute>{isDemoMode || isAdmin ? children : <Navigate to="/dashboard" replace />}</ProtectedRoute>;
};

/** Pages written for a `user` prop get the signed-in person, never an empty object. */
function WithUser({ render }: { render: (user: User) => React.ReactNode }) {
  const { appUser } = useAuth();
  if (!appUser) return null;
  return <>{render(appUser)}</>;
}

function TenantBillingRoute() {
  const { tenant } = useTenant();
  if (!tenant) return null;
  return <TenantBilling tenant={tenant} />;
}

/** One messaging state for the whole app, so the assistant and every page see the same conversations. */
function AppMessaging({ children }: { children: React.ReactNode }) {
  const { user, isDemoMode } = useAuth();
  return <MessagingProvider userId={user?.uid || (isDemoMode ? 'demo-user' : '')} isDemo={isDemoMode}>{children}</MessagingProvider>;
}

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(() => {
    return localStorage.getItem('demo_mode') === 'true';
  });

  const toggleDemoMode = (enabled: boolean) => {
    setIsDemoMode(enabled);
    if (enabled) {
      localStorage.setItem('demo_mode', 'true');
    } else {
      localStorage.removeItem('demo_mode');
      setUser(null);
      setProfile(null);
      setIsAdmin(false);
    }
  };

  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;
    let unsubscribeUser: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (isDemoMode) {
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

  const demo = useMemo(() => {
    if (!isDemoMode) return null;
    return {
      user: {
        uid: DEMO_USER_ID,
        email: 'demo@cofounderbay.com',
        displayName: 'Demo User',
        photoURL: 'https://picsum.photos/seed/demo/100/100',
      } as FirebaseUser,
      profile: demoProfile(),
    };
  }, [isDemoMode]);

  const activeUser = demo ? demo.user : user;
  const activeProfile = demo ? demo.profile : profile;
  const accountId = activeUser?.uid ?? null;

  useEffect(() => {
    setDataScope(demo ? null : accountId);
  }, [demo, accountId]);

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
        isAdmin: isDemoMode ? true : isAdmin,
        isDemoMode,
        toggleDemoMode
      }}>
        <Router>
          <RouteLifecycle />
          <OfflineBanner />
          <CommandPalette />
          <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<LandingPage />} />
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
