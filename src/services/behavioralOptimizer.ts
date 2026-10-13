import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit, 
  updateDoc,
  setDoc
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { XPEvent, XPEventType } from '../types';

export enum UserBehavioralState {
  NEWLY_ONBOARDED = 'NEWLY_ONBOARDED',
  PROFILE_INCOMPLETE = 'PROFILE_INCOMPLETE',
  ACTIVELY_EXPLORING = 'ACTIVELY_EXPLORING',
  MATCHING_FOCUSED = 'MATCHING_FOCUSED',
  ARTIFACT_BUILDING = 'ARTIFACT_BUILDING',
  STUCK_INACTIVE = 'STUCK_INACTIVE',
  FEEDBACK_PROCESSING = 'FEEDBACK_PROCESSING',
  HIGH_MOMENTUM = 'HIGH_MOMENTUM',
  LOW_CONFIDENCE = 'LOW_CONFIDENCE',
  REVIEW_READY = 'REVIEW_READY',
  READINESS_PLATEAUED = 'READINESS_PLATEAUED',
}

export interface NextBestAction {
  id: string;
  type: XPEventType;
  description: string;
  priority: number;
  reason: string;
  section: string;
}

export const determineUserState = async (userId: string): Promise<UserBehavioralState> => {
  if (!userId || userId === 'demo-user' || !auth.currentUser || auth.currentUser.uid !== userId) {
    return UserBehavioralState.ACTIVELY_EXPLORING;
  }

  try {
    const profileRef = doc(db, 'profiles', userId);
    const profileSnap = await getDoc(profileRef);
    const profile = profileSnap.data();

    if (!profile) return UserBehavioralState.NEWLY_ONBOARDED;
    
    const completionScore = profile.profileCompletionScore || 0;
    if (completionScore < 70) return UserBehavioralState.PROFILE_INCOMPLETE;

    const xpEventsRef = collection(db, 'xpEvents');
    const recentEventsQuery = query(xpEventsRef, where('userId', '==', userId), orderBy('createdAt', 'desc'), limit(10));
    const recentEventsSnap = await getDocs(recentEventsQuery);
    const recentEvents = recentEventsSnap.docs.map(doc => doc.data() as XPEvent);

    if (recentEvents.length === 0) return UserBehavioralState.STUCK_INACTIVE;

    const lastEvent = recentEvents[0];
    if (!lastEvent) return UserBehavioralState.STUCK_INACTIVE;
    const lastEventDate = new Date(lastEvent.createdAt);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - lastEventDate.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays > 7) return UserBehavioralState.STUCK_INACTIVE;

    // Check for specific activity patterns
    const eventTypes = recentEvents.map(e => e.eventType);
    if (eventTypes.includes(XPEventType.CREATE_ARTIFACT) || eventTypes.includes(XPEventType.IMPROVE_ARTIFACT)) {
      return UserBehavioralState.ARTIFACT_BUILDING;
    }

    if (eventTypes.includes(XPEventType.RECEIVE_MENTOR_FEEDBACK)) {
      return UserBehavioralState.FEEDBACK_PROCESSING;
    }

    return UserBehavioralState.ACTIVELY_EXPLORING;
  } catch (error) {
    console.warn('Could not determine live user state from Firestore, falling back to default:', error);
    return UserBehavioralState.ACTIVELY_EXPLORING;
  }
};

export const getNextBestActions = async (userId: string): Promise<NextBestAction[]> => {
  if (!userId || userId === 'demo-user' || !auth.currentUser) {
    return [
      {
        id: 'resume-research',
        type: XPEventType.CREATE_BOARD,
        description: 'Resume your research on the market hypothesis.',
        priority: 7,
        reason: 'Returning to research can help regain momentum.',
        section: 'founder-tools'
      }
    ];
  }

  const state = await determineUserState(userId);
  const actions: NextBestAction[] = [];

  switch (state) {
    case UserBehavioralState.NEWLY_ONBOARDED:
    case UserBehavioralState.PROFILE_INCOMPLETE:
      actions.push({
        id: 'complete-profile',
        type: XPEventType.VALIDATED_PROGRESS,
        description: 'Complete your profile to increase match quality.',
        priority: 10,
        reason: 'Profile completion is the primary driver for successful matching.',
        section: 'profile'
      });
      break;

    case UserBehavioralState.ACTIVELY_EXPLORING:
      actions.push({
        id: 'send-connection',
        type: XPEventType.INVITE_COLLABORATOR,
        description: 'Send a connection request to a potential co-founder.',
        priority: 8,
        reason: 'You have viewed several profiles, it is time to reach out.',
        section: 'discovery'
      });
      break;

    case UserBehavioralState.ARTIFACT_BUILDING:
      actions.push({
        id: 'request-review',
        type: XPEventType.COMPLETE_REVIEW,
        description: 'Request an expert review for your pitch deck.',
        priority: 9,
        reason: 'Your artifact is nearing completion, expert feedback will elevate it.',
        section: 'founder-tools'
      });
      break;

    case UserBehavioralState.FEEDBACK_PROCESSING:
      actions.push({
        id: 'apply-feedback',
        type: XPEventType.APPLY_FEEDBACK,
        description: 'Apply the feedback received from your mentor.',
        priority: 10,
        reason: 'Applying feedback is the fastest way to improve your readiness score.',
        section: 'founder-tools'
      });
      break;

    case UserBehavioralState.STUCK_INACTIVE:
      actions.push({
        id: 'resume-research',
        type: XPEventType.CREATE_BOARD,
        description: 'Resume your research on the market hypothesis.',
        priority: 7,
        reason: 'Returning to research can help regain momentum.',
        section: 'founder-tools'
      });
      break;

    default:
      actions.push({
        id: 'daily-discovery',
        type: XPEventType.VALIDATED_PROGRESS,
        description: 'View 5 new founder profiles today.',
        priority: 5,
        reason: 'Consistent exploration keeps your network fresh.',
        section: 'discovery'
      });
  }

  return actions;
};

export const logNudgeExposure = async (userId: string, actionId: string, surface: string) => {
  if (!userId || userId === 'demo-user' || !auth.currentUser) return;
  try {
    const nudgeRef = doc(db, 'nudgeExposures', `${userId}_${actionId}`);
    await setDoc(nudgeRef, {
      userId,
      actionId,
      surface,
      exposedAt: new Date().toISOString(),
      converted: false
    });
  } catch (error) {
    console.warn('Error logging nudge exposure:', error);
  }
};

export const logNudgeConversion = async (userId: string, actionId: string) => {
  if (!userId || userId === 'demo-user' || !auth.currentUser) return;
  try {
    const nudgeRef = doc(db, 'nudgeExposures', `${userId}_${actionId}`);
    await updateDoc(nudgeRef, {
      converted: true,
      convertedAt: new Date().toISOString()
    });
  } catch (error) {
    console.warn('Error logging nudge conversion:', error);
  }
};
