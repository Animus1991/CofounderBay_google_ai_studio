import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit, 
  serverTimestamp, 
  increment,
  updateDoc,
  addDoc
} from 'firebase/firestore';
import { db } from '../firebase';
import { 
  XPEvent, 
  XPEventType, 
  Streak, 
  MentorFeedbackMetric,
  Badge
} from '../types';

// Base XP Values
const BASE_XP: Record<XPEventType, number> = {
  [XPEventType.CREATE_ARTIFACT]: 50,
  [XPEventType.COMPLETE_ARTIFACT]: 100,
  [XPEventType.IMPROVE_ARTIFACT]: 30,
  [XPEventType.CREATE_BOARD]: 40,
  [XPEventType.SYNTHESIZE_BOARD]: 150,
  [XPEventType.LINK_ARTIFACTS]: 20,
  [XPEventType.RECEIVE_MENTOR_FEEDBACK]: 100,
  [XPEventType.APPLY_FEEDBACK]: 200,
  [XPEventType.COMPLETE_MILESTONE]: 500,
  [XPEventType.TEAM_CONTRIBUTION]: 40,
  [XPEventType.HIGH_QUALITY_CONTRIBUTION]: 120,
  [XPEventType.INVITE_COLLABORATOR]: 50,
  [XPEventType.COMPLETE_REVIEW]: 80,
  [XPEventType.PROVIDE_FEEDBACK]: 60,
  [XPEventType.VALIDATED_PROGRESS]: 300,
};

// Diminishing Returns Formula: XP_effective = BaseXP * (1 / log2(count + 1))
const calculateDiminishedXP = (baseXP: number, count: number): number => {
  if (count <= 1) return baseXP;
  return Math.round(baseXP * (1 / Math.log2(count + 1)));
};

export const recordXPEvent = async (
  userId: string, 
  eventType: XPEventType, 
  entityType: string, 
  entityId: string, 
  workspaceId?: string,
  metadata?: any
) => {
  try {
    // 1. Check for recent similar events to apply diminishing returns
    const eventsRef = collection(db, 'xpEvents');
    const recentQuery = query(
      eventsRef,
      where('userId', '==', userId),
      where('eventType', '==', eventType),
      orderBy('createdAt', 'desc'),
      limit(10)
    );
    const recentSnap = await getDocs(recentQuery);
    const count = recentSnap.size;

    const baseXP = BASE_XP[eventType];
    const xpAmount = calculateDiminishedXP(baseXP, count);

    // 2. Record the event
    const eventData: Partial<XPEvent> = {
      userId,
      workspaceId,
      eventType,
      entityType,
      entityId,
      xpAmount,
      weightMultiplier: 1.0,
      createdAt: new Date().toISOString(),
      metadata
    };

    await addDoc(collection(db, 'xpEvents'), eventData);

    // 3. Update user total XP and streak
    await updateUserStats(userId, xpAmount);

    return xpAmount;
  } catch (error) {
    console.error('Error recording XP event:', error);
    return 0;
  }
};

const updateUserStats = async (userId: string, xpAmount: number) => {
  const userRef = doc(db, 'users', userId);
  const streakRef = doc(db, 'streaks', userId);

  // Update total XP
  await updateDoc(userRef, {
    totalXP: increment(xpAmount),
    updatedAt: serverTimestamp()
  });

  // Update Streak
  const streakSnap = await getDoc(streakRef);
  const now = new Date();
  
  if (streakSnap.exists()) {
    const streakData = streakSnap.data() as Streak;
    const lastActive = new Date(streakData.lastActiveAt);
    const diffDays = Math.floor((now.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      // Consecutive day
      await updateDoc(streakRef, {
        currentStreak: increment(1),
        longestStreak: Math.max(streakData.longestStreak, streakData.currentStreak + 1),
        lastActiveAt: now.toISOString()
      });
    } else if (diffDays > 1) {
      // Streak broken
      await updateDoc(streakRef, {
        currentStreak: 1,
        lastActiveAt: now.toISOString()
      });
    } else {
      // Same day, just update lastActive
      await updateDoc(streakRef, {
        lastActiveAt: now.toISOString()
      });
    }
  } else {
    // New streak
    await setDoc(streakRef, {
      userId,
      currentStreak: 1,
      longestStreak: 1,
      lastActiveAt: now.toISOString(),
      streakType: 'daily_meaningful'
    });
  }
};

export const calculateReadinessScore = async (workspaceId: string) => {
  try {
    // In a real app, this would query various collections to determine scores
    // For now, we'll implement a heuristic model based on existing data
    
    const dimensions = {
      problemClarity: 0,
      solutionClarity: 0,
      marketUnderstanding: 0,
      teamCompleteness: 0,
      artifactCompleteness: 0,
      executionReadiness: 0,
      validation: 0,
      integration: 0
    };

    // Heuristic: Check for milestones, artifacts, etc.
    // This is a simplified version for the demo
    const milestonesQuery = query(collection(db, 'milestones'), where('ownerId', '==', workspaceId));
    const milestonesSnap = await getDocs(milestonesQuery);
    dimensions.executionReadiness = Math.min(100, milestonesSnap.size * 20);

    const mentorFeedbackQuery = query(collection(db, 'mentorFeedbackMetrics'), where('workspaceId', '==', workspaceId));
    const mentorSnap = await getDocs(mentorFeedbackQuery);
    const firstMentorDoc = mentorSnap.docs[0];
    if (!mentorSnap.empty && firstMentorDoc) {
      const metric = firstMentorDoc.data() as MentorFeedbackMetric;
      dimensions.validation = Math.round(metric.appliedFeedbackRate * 100);
    }

    // Calculate composite score (weighted average)
    const weights = {
      problemClarity: 0.15,
      solutionClarity: 0.15,
      marketUnderstanding: 0.1,
      teamCompleteness: 0.1,
      artifactCompleteness: 0.2,
      executionReadiness: 0.1,
      validation: 0.1,
      integration: 0.1
    };

    let totalScore = 0;
    Object.keys(dimensions).forEach(key => {
      totalScore += (dimensions as any)[key] * (weights as any)[key];
    });

    const finalScore = Math.round(totalScore);

    const scoreRef = doc(db, 'readinessScores', workspaceId);
    await setDoc(scoreRef, {
      workspaceId,
      score: finalScore,
      dimensionScores: dimensions,
      updatedAt: new Date().toISOString()
    });

    return finalScore;
  } catch (error) {
    console.error('Error calculating readiness score:', error);
    return 0;
  }
};

export const evaluateBadges = async (userId: string) => {
  try {
    const badgesRef = collection(db, 'badges');
    const allBadges = await getDocs(badgesRef);
    
    const userBadgesRef = collection(db, 'userBadges');
    const userBadgesQuery = query(userBadgesRef, where('userId', '==', userId));
    const userBadgesSnap = await getDocs(userBadgesQuery);
    const ownedBadgeIds = new Set(userBadgesSnap.docs.map(doc => doc.data().badgeId));

    for (const badgeDoc of allBadges.docs) {
      const badge = badgeDoc.data() as Badge;
      if (ownedBadgeIds.has(badge.id)) continue;

      // Check criteria (simplified for demo)
      // In a real app, this would be a complex rule engine
      let awarded = false;
      if (badge.category === 'Progress') {
        // e.g. "First Milestone"
        const milestonesQuery = query(collection(db, 'milestones'), where('ownerId', '==', userId), where('status', '==', 'Completed'));
        const milestonesSnap = await getDocs(milestonesQuery);
        if (milestonesSnap.size >= (badge.criteria.count || 1)) awarded = true;
      }

      if (awarded) {
        await addDoc(collection(db, 'userBadges'), {
          userId,
          badgeId: badge.id,
          awardedAt: new Date().toISOString()
        });
      }
    }
  } catch (error) {
    console.error('Error evaluating badges:', error);
  }
};
