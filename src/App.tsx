import React, { createContext, useContext, useEffect, useState, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from './firebase';
import { UserProfile, UserRole, ProfileStatus, VerificationStatus, AccountStatus } from './types';

// Components
import Layout from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';
import CommandPalette from './components/CommandPalette';
import RouteLifecycle from './components/RouteLifecycle';
import OfflineBanner from './components/OfflineBanner';
import { ToastProvider } from './context/ToastContext';
import { LanguageProvider } from './lib/language';
import { TenantProvider } from './context/TenantContext';
import { MessagingProvider } from './context/MessagingContext';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';

// Lazy-loaded pages (code-splitting)
const LandingPage = lazy(() => import('./pages/LandingPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const SignUpPage = lazy(() => import('./pages/SignUpPage'));
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
    <p className="text-xs font-medium text-stone-400 tracking-wider">Loading</p>
   </div>
  </div>
 );
}

// Auth Context
interface AuthContextType {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  isDemoMode: boolean;
  toggleDemoMode: (enabled: boolean) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  isAdmin: false,
  isDemoMode: false,
  toggleDemoMode: () => {},
});

export const useAuth = () => useContext(AuthContext);

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

  if (!isDemoMode && requireOnboarding && !profile && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
};

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

  // Mock data for demo mode
  const demoUser = isDemoMode ? {
    uid: 'demo-user',
    email: 'demo@cofounderbay.com',
    displayName: 'Demo User',
    photoURL: 'https://picsum.photos/seed/demo/100/100',
  } as FirebaseUser : null;

  const demoProfile = isDemoMode ? {
    id: 'demo-user',
    uid: 'demo-user',
    fullName: 'Demo User',
    email: 'demo@cofounderbay.com',
    bio: 'This is a demo account for exploring the platform UI/UX.',
    headline: 'Serial Entrepreneur & Developer',
    roles: [UserRole.FOUNDER, UserRole.ADMIN],
    skills: ['React', 'TypeScript', 'Tailwind CSS'],
    interests: ['AI', 'SaaS', 'Fintech'],
    location: 'San Francisco, CA',
    stage: 'MVP',
    role: 'Founder',
    commitment: 'Full-time',
    avatarUrl: 'https://picsum.photos/seed/demo/100/100',
    profileStatus: ProfileStatus.PUBLISHED,
    verificationStatus: VerificationStatus.VERIFIED,
    profileCompletionScore: 100,
    accountStatus: AccountStatus.ACTIVE,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as unknown as UserProfile : null;

  return (
    <ErrorBoundary>
     <QueryClientProvider client={queryClient}>
     <TenantProvider>
     <ToastProvider>
     <LanguageProvider>
      <AuthContext.Provider value={{ 
        user: isDemoMode ? demoUser : user, 
        profile: isDemoMode ? demoProfile : profile, 
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
            <Route element={<Layout />}>
              <Route 
                path="/dashboard" 
                element={
                  <ProtectedRoute>
                    <DashboardPage />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/profile" 
                element={
                  <ProtectedRoute>
                    <ProfilePage />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/profile/:id" 
                element={
                  <ProtectedRoute>
                    <ProfilePage />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/matches" 
                element={
                  <ProtectedRoute>
                    <MatchDiscovery />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/discovery" 
                element={
                  <ProtectedRoute>
                    <DiscoveryPage user={user as any} />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/events" 
                element={
                  <ProtectedRoute>
                    <EventsPage user={user as any} />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/mentors" 
                element={
                  <ProtectedRoute>
                    <MentorsPage />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/communities" 
                element={
                  <ProtectedRoute>
                    <CommunitiesPage />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/messages" 
                element={
                  <ProtectedRoute>
                    <MessagingProvider userId={user?.uid || ''}>
                      <CommunicationHub user={user as any} />
                    </MessagingProvider>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/milestones" 
                element={
                  <ProtectedRoute>
                    <MilestonesPage />
                  </ProtectedRoute>
                } 
              />

              {/* Founder Tools */}
              <Route path="/founder-tools" element={<ProtectedRoute><FounderTools user={{} as any} /></ProtectedRoute>} />
              <Route path="/fundraising" element={<ProtectedRoute><Fundraising user={{} as any} /></ProtectedRoute>} />
              <Route path="/workspace" element={<ProtectedRoute><Workspace user={{} as any} /></ProtectedRoute>} />
              <Route path="/calendar" element={<ProtectedRoute><CalendarPage /></ProtectedRoute>} />

              {/* Discovery */}
              <Route path="/community" element={<ProtectedRoute><CommunitiesPage /></ProtectedRoute>} />
              <Route path="/programs" element={<ProtectedRoute><Programs user={{} as any} /></ProtectedRoute>} />
              <Route path="/network" element={<ProtectedRoute><Network user={{} as any} /></ProtectedRoute>} />

              {/* Resources */}
              <Route path="/resources" element={<ProtectedRoute><Resources user={{} as any} /></ProtectedRoute>} />
              <Route path="/insights" element={<ProtectedRoute><Insights user={{} as any} /></ProtectedRoute>} />
              <Route path="/legal" element={<ProtectedRoute><LegalHub /></ProtectedRoute>} />
              <Route path="/perks" element={<ProtectedRoute><Perks /></ProtectedRoute>} />

              {/* User */}
              <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
              <Route path="/settings/billing" element={<ProtectedRoute><BillingPage user={{} as any} /></ProtectedRoute>} />
              <Route path="/pricing" element={<Pricing />} />

              {/* Admin Routes */}
              <Route 
                path="/admin" 
                element={
                  <ProtectedRoute>
                    {(isDemoMode || isAdmin) ? <AdminDashboard /> : <Navigate to="/dashboard" replace />}
                  </ProtectedRoute>
                } 
              />
              <Route path="/admin/users" element={<ProtectedRoute>{(isDemoMode || isAdmin) ? <UserManagement user={{} as any} /> : <Navigate to="/dashboard" replace />}</ProtectedRoute>} />
              <Route path="/admin/automation" element={<ProtectedRoute>{(isDemoMode || isAdmin) ? <AutomationDashboard user={{} as any} /> : <Navigate to="/dashboard" replace />}</ProtectedRoute>} />
              <Route path="/admin/branding" element={<ProtectedRoute>{(isDemoMode || isAdmin) ? <BrandingSettings user={{} as any} /> : <Navigate to="/dashboard" replace />}</ProtectedRoute>} />
              <Route path="/admin/sso" element={<ProtectedRoute>{(isDemoMode || isAdmin) ? <SSOSettings user={{} as any} /> : <Navigate to="/dashboard" replace />}</ProtectedRoute>} />
              <Route path="/admin/taxonomy" element={<ProtectedRoute>{(isDemoMode || isAdmin) ? <TaxonomySettings user={{} as any} /> : <Navigate to="/dashboard" replace />}</ProtectedRoute>} />
              <Route path="/admin/domains" element={<ProtectedRoute>{(isDemoMode || isAdmin) ? <DomainSettings /> : <Navigate to="/dashboard" replace />}</ProtectedRoute>} />
              <Route path="/admin/billing" element={<ProtectedRoute>{(isDemoMode || isAdmin) ? <TenantBilling tenant={{} as any} /> : <Navigate to="/dashboard" replace />}</ProtectedRoute>} />
              <Route path="/admin/billing-oversight" element={<ProtectedRoute>{(isDemoMode || isAdmin) ? <BillingOversight /> : <Navigate to="/dashboard" replace />}</ProtectedRoute>} />
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
