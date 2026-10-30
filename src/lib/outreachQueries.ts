/**
 * Server data for outreach (due-diligence links, email, the weekly digest),
 * read through TanStack Query: one request per resource however many
 * components show it, one cache every write updates (lib/outreach and
 * lib/dueDiligence invalidate or set it), and the shared retry policy
 * (lib/queryClient: a 401 or 422 is not retried, a dropped connection is).
 */
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from './queryClient';
import { listDDShares } from './dueDiligence';
import { digestHistory, emailLog, emailStatus, getDigestSettings } from './outreach';

/** The founder's open share links, with view counts. */
export const useDdShares = (enabled = true) =>
  useQuery({ queryKey: queryKeys.ddShares, queryFn: listDDShares, enabled, staleTime: 15_000 });

/** Whether the server can send email, or only logs it. Rarely changes. */
export const useEmailStatus = (enabled = true) =>
  useQuery({ queryKey: queryKeys.emailStatus, queryFn: emailStatus, enabled, staleTime: 5 * 60_000 });

export const useEmailLog = (investorId?: string, enabled = true) =>
  useQuery({ queryKey: queryKeys.emailLog(investorId), queryFn: () => emailLog(investorId), enabled });

export const useDigestSettings = (enabled = true) =>
  useQuery({ queryKey: queryKeys.digestSettings, queryFn: getDigestSettings, enabled });

export const useDigestHistory = (enabled = true) =>
  useQuery({ queryKey: queryKeys.digestHistory, queryFn: digestHistory, enabled });
