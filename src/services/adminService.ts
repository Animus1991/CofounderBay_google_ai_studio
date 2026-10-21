import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit, 
  setDoc
} from 'firebase/firestore';
import { db } from '../firebase';
import { XPEvent, Streak, UserBadge } from '../types';

export const getAdminAnalytics = async () => {
  try {
    const xpEventsRef = collection(db, 'xpEvents');
    const xpEventsSnap = await getDocs(xpEventsRef);
    const xpEvents = xpEventsSnap.docs.map(doc => doc.data() as XPEvent);

    const totalXP = xpEvents.reduce((sum, e) => sum + e.xpAmount, 0);
    const eventTypeDistribution = xpEvents.reduce((acc, e) => {
      acc[e.eventType] = (acc[e.eventType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const usersRef = collection(db, 'users');
    const usersSnap = await getDocs(usersRef);
    const totalUsers = usersSnap.size;

    const badgesRef = collection(db, 'userBadges');
    const badgesSnap = await getDocs(badgesRef);
    const totalBadgesAwarded = badgesSnap.size;

    const aiUsageSnap = await getDocs(collection(db, 'aiUsage'));
    const aiUsageCount = aiUsageSnap.size;

    return {
      totalUsers,
      totalXP,
      totalBadgesAwarded,
      eventTypeDistribution,
      xpEventsCount: xpEvents.length,
      aiUsageCount
    };
  } catch (error) {
    console.error('Error fetching admin analytics:', error);
    return null;
  }
};

export const inspectUserScore = async (userId: string) => {
  try {
    const xpEventsRef = collection(db, 'xpEvents');
    const userEventsQuery = query(xpEventsRef, where('userId', '==', userId), orderBy('createdAt', 'desc'));
    const userEventsSnap = await getDocs(userEventsQuery);
    const events = userEventsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as XPEvent));

    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    const userData = userSnap.data();

    const streakRef = doc(db, 'streaks', userId);
    const streakSnap = await getDoc(streakRef);
    const streakData = streakSnap.data() as Streak;

    const badgesRef = collection(db, 'userBadges');
    const badgesQuery = query(badgesRef, where('userId', '==', userId));
    const badgesSnap = await getDocs(badgesQuery);
    const userBadges = badgesSnap.docs.map(doc => doc.data() as UserBadge);

    return {
      userId,
      totalXP: userData?.totalXP || 0,
      events,
      streak: streakData,
      badges: userBadges
    };
  } catch (error) {
    console.error('Error inspecting user score:', error);
    return null;
  }
};

export const detectAbuse = async () => {
  try {
    const xpEventsRef = collection(db, 'xpEvents');
    const recentEventsQuery = query(xpEventsRef, orderBy('createdAt', 'desc'), limit(1000));
    const recentEventsSnap = await getDocs(recentEventsQuery);
    const events = recentEventsSnap.docs.map(doc => doc.data() as XPEvent);

    // Group events by user and type within a short window
    const userActivity: Record<string, Record<string, number>> = {};
    const flags: any[] = [];

    events.forEach(event => {
      const activity = userActivity[event.userId] ?? (userActivity[event.userId] = {});
      activity[event.eventType] = (activity[event.eventType] || 0) + 1;
    });

    // Simple heuristic: > 50 events of the same type in the last 1000 events
    Object.entries(userActivity).forEach(([userId, activity]) => {
      Object.entries(activity).forEach(([type, count]) => {
        if (count > 50) {
          flags.push({
            userId,
            type: 'XP_FARMING',
            severity: 0.8,
            metadata: { eventType: type, count },
            createdAt: new Date().toISOString()
          });
        }
      });
    });

    return flags;
  } catch (error) {
    console.error('Error detecting abuse:', error);
    return [];
  }
};

export const updateSystemConfig = async (key: string, value: any) => {
  try {
    const configRef = doc(db, 'systemConfig', key);
    await setDoc(configRef, { value, updatedAt: new Date().toISOString() });
    return true;
  } catch (error) {
    console.error('Error updating system config:', error);
    return false;
  }
};
