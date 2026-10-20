// Demo-only series — pretty charts for the demo account, never real members.
// Every page that quotes a demo number reads it through the helpers below so
// the dashboard card, the profile row and the insights KPI can never disagree.
export const DEMO_READINESS = [
 { name: 'Jan', score: 45 }, { name: 'Feb', score: 52 }, { name: 'Mar', score: 48 },
 { name: 'Apr', score: 61 }, { name: 'May', score: 58 }, { name: 'Jun', score: 72 }, { name: 'Jul', score: 85 },
];
export const DEMO_ACTIVITY = [
 { name: 'Mon', connections: 4, messages: 12, views: 24 },
 { name: 'Tue', connections: 2, messages: 8, views: 18 },
 { name: 'Wed', connections: 6, messages: 15, views: 32 },
 { name: 'Thu', connections: 3, messages: 10, views: 28 },
 { name: 'Fri', connections: 5, messages: 20, views: 45 },
 { name: 'Sat', connections: 1, messages: 5, views: 12 },
 { name: 'Sun', connections: 2, messages: 7, views: 15 },
];

export function demoWeeklyViews(): number {
 return DEMO_ACTIVITY.reduce((sum, day) => sum + day.views, 0);
}

export function demoWeeklyConnections(): number {
 return DEMO_ACTIVITY.reduce((sum, day) => sum + day.connections, 0);
}

/** Last point minus the previous one — what "trending" means on this series. */
export function demoReadinessDelta(): number {
 const last = DEMO_READINESS[DEMO_READINESS.length - 1]?.score ?? 0;
 const prev = DEMO_READINESS[DEMO_READINESS.length - 2]?.score ?? 0;
 return last - prev;
}

/** Last day vs previous day as a signed percent; null when the previous day is zero. */
export function demoActivityDelta(key: 'connections' | 'messages' | 'views'): number | null {
 const last = DEMO_ACTIVITY[DEMO_ACTIVITY.length - 1]?.[key] ?? 0;
 const prev = DEMO_ACTIVITY[DEMO_ACTIVITY.length - 2]?.[key] ?? 0;
 if (!prev) return null;
 return Math.round(((last - prev) / prev) * 100);
}
