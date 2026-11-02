/**
 * The demo account's network: who is connected and whom a request went to.
 * Network lists these; Insights counts them — one list, so the "Connections"
 * KPI and the Network tab can never disagree again (Insights showed 23 from a
 * weekly activity series while Network showed 3 connected and 1 sent).
 */
export type DemoConnectionStatus = 'Connected' | 'Pending';

export const DEMO_CONNECTIONS: readonly { id: string; status: DemoConnectionStatus }[] = [
  { id: 'sarah-chen', status: 'Connected' },
  { id: 'alex-rivera', status: 'Connected' },
  { id: 'james-wilson', status: 'Pending' },
  { id: 'elena-rodriguez', status: 'Connected' },
];

export function demoNetworkCounts(): { connected: number; sent: number } {
  return {
    connected: DEMO_CONNECTIONS.filter((row) => row.status === 'Connected').length,
    sent: DEMO_CONNECTIONS.filter((row) => row.status === 'Pending').length,
  };
}
