/**
 * The signed-in founder as the assistant and its helpers see them: the profile
 * fields the router and the model read, with the fit-check archetype merged in.
 * One definition for the chat, the daily step and the AI profile review.
 */
import type { useAuth } from '../App';
import { mergeFitIntoViewer } from './fitCheck';

export function viewerFromAuth(profile: ReturnType<typeof useAuth>['profile']) {
  const base = profile
    ? {
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
      }
    : null;
  return mergeFitIntoViewer(base);
}
