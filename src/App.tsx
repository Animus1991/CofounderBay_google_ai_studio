import React, { createContext, useContext, useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from './firebase';
import { UserProfile, UserRole, ProfileStatus, VerificationStatus, AccountStatus } from './types';

// Components
import Layout from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';

// Pages
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import SignUpPage from './pages/SignUpPage';
import OnboardingWizard from './pages/OnboardingWizard';
import DashboardPage from './pages/DashboardPage';
import ProfilePage from './pages/ProfilePage';
import MatchDiscovery from './pages/MatchDiscovery';
import MentorsPage from './pages/MentorsPage';
import CommunitiesPage from './pages/CommunitiesPage';
import MessagesPage from './pages/MessagesPage';
import MilestonesPage from './pages/MilestonesPage';
import AdminDashboard from './pages/AdminDashboard';
import EventsPage from './pages/Events';
import DiscoveryPage from './pages/Discovery';

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
      <AuthContext.Provider value={{ 
        user: isDemoMode ? demoUser : user, 
        profile: isDemoMode ? demoProfile : profile, 
        loading, 
        isAdmin: isDemoMode ? true : isAdmin,
        isDemoMode,
        toggleDemoMode
      }}>
        <Router>
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
                    <MessagesPage />
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
              
              {/* Admin Routes */}
              <Route 
                path="/admin" 
                element={
                  <ProtectedRoute>
                    {(isDemoMode || isAdmin) ? <AdminDashboard /> : <Navigate to="/dashboard" replace />}
                  </ProtectedRoute>
                } 
              />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </AuthContext.Provider>
    </ErrorBoundary>
  );
}
