/**
 * Sources the firm context a workshop tool run should carry:
 * - Signed out (demo/anonymous): the demo firm's context — same values the
 *   web seeds — matching the demo scores and leaderboard the app shows.
 * - Signed in: the account's own `firm_context` from server-side user state
 *   (the same key the web's Settings page writes), so a real firm's runs are
 *   grounded in *their* practice, size, and goal — never Petrović & Partners'.
 *   If the account hasn't filled it in (or the fetch fails / is still in
 *   flight), this is null and the edge functions honestly omit the
 *   firm-context block rather than getting demo facts passed off as theirs.
 *
 * Gated strictly on authentication — NOT on DataContext.isDemo, which only
 * flips after a visibility-audit response and would let a signed-in account
 * without an audit (or mid-load) submit the demo firm's context.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { callEdgeFunction } from '@/lib/api';
import {
  DEMO_FIRM_CONTEXT,
  FIRM_CONTEXT_SERVER_KEY,
  onFirmContextSaved,
  parseFirmContext,
  type FirmContext,
} from '@/lib/firmContext';

const SERVER_KEY = FIRM_CONTEXT_SERVER_KEY;

export function useFirmContext(): { firmContext: FirmContext | null; resolvedClientId: string | undefined } {
  const { user, session, isLoading } = useAuth();
  const signedIn = !!(user && session);
  // Null until identity is resolved: while auth restoration is in flight a
  // persisted session may still turn out to be signed in, and demo facts must
  // never ride along on a real account's run. The demo object only appears
  // once restoration has completed with no session.
  const [firmContext, setFirmContext] = useState<FirmContext | null>(
    !signedIn && !isLoading ? DEMO_FIRM_CONTEXT : null,
  );
  // Which identity the read resolved to (solo uid or a member firm). A
  // follow-up user-state-set MUST echo this as requestedFirmId — the resolver
  // may auto-detect a different member firm on each call, so an unpinned
  // save can land on a different firm than the one the user was shown (the
  // pattern useBattlePlanSlots established).
  const [resolvedClientId, setResolvedClientId] = useState<string | undefined>(undefined);

  // Same staleness guard as useBattlePlanSlots: a late user-state-get reply
  // must never paint a previous account's firm context onto the current one.
  const generation = useRef(0);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const load = useCallback(async () => {
    const gen = ++generation.current;
    const commit = (next: FirmContext | null, resolved?: string) => {
      if (mounted.current && gen === generation.current) {
        setFirmContext(next);
        setResolvedClientId(resolved);
      }
    };

    if (!user || !session) {
      // While auth restoration is unresolved (or the authenticated state is
      // transiently incomplete), stay null — never demo.
      commit(isLoading ? null : DEMO_FIRM_CONTEXT, undefined);
      return;
    }

    // Clear any demo/previous-account value synchronously, before awaiting —
    // a run fired during the fetch must carry nothing, not stale facts.
    commit(null, undefined);
    const res = await callEdgeFunction<{ state?: Record<string, unknown>; resolvedClientId?: unknown }>(
      'user-state-get',
      {
        clientId: user.id,
        accessToken: session.access_token,
        keys: [SERVER_KEY],
      },
    );
    // On transport failure keep null — an omitted prompt block degrades the
    // output less than wrong facts in it.
    const resolved =
      res.ok && typeof res.data?.resolvedClientId === 'string' ? res.data.resolvedClientId : undefined;
    commit(res.ok ? parseFirmContext(res.data?.state?.[SERVER_KEY]) : null, resolved);
  }, [user, session, isLoading]);

  useEffect(() => {
    load();
  }, [load]);

  // Refetch when the firm-profile screen saves: it sits on top of the tab
  // stack, so this hook stays mounted with the pre-save value — the next
  // tool run after returning must carry the updated context.
  useEffect(() => onFirmContextSaved(load), [load]);

  return { firmContext, resolvedClientId };
}
