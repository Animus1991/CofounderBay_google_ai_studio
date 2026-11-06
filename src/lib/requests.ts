import { dataScope } from './localLists';
import { connectionRecords } from './social';

export function incomingRequests(): { record: ReturnType<typeof connectionRecords>[number]; name: string }[] {
  const uid = dataScope() || null;
  if (!uid) return [];
  return connectionRecords()
    .filter((record) => record.status === 'Pending' && record.receiverId === uid)
    .map((record) => ({ record, name: record.senderName || record.senderId }));
}
