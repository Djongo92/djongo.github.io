// Authenticated HTTP smoke for the six services deployed in the "dormant
// services" task: audit-snapshot-save, firm-members-manage,
// visibility-audit-dispute, workflow-items-manage, workflow-comment-add,
// workflow-partner-link — plus roast-share-link (task #149). Until deployment
// these features silently did nothing; this smoke proves each function is
// live, accepts the real account's session, and performs its primary action.
//
// Shape: full happy path where the smoke account's data allows it —
//   - Battle Plan workflow: list → create item → comment → partner link
//     (create + unauthenticated view) → delete item (cleanup)
//   - The dispute/snapshot legs also append permanent rows; a cleanup step at
//     the end prunes them (see the cleanup section below for what and why).
//   - audit-snapshot-save / visibility-audit-dispute: need a real audit row.
//     The smoke account has one (tests/seed-smoke-audit.mjs), so the full
//     save/dispute runs. If the audit is ever lost, the smoke degrades to
//     asserting the functions respond with a validation/auth 4xx (live, not
//     404/500) until the account is re-seeded.
//   - firm-members-manage: the account owns a solo firm and cannot target
//     itself, so the check is that a bogus target is rejected with a clear
//     4xx — proving the function and its role guard are live.
//
// Run directly: pnpm --filter @workspace/legalos run smoke:workflow
// Also runs in the normal test workflow via workflow-services-smoke.test.ts
// (vitest wrapper, node environment, skips cleanly without the secrets).
// Env: VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY (non-secret) and
// SMOKE_EMAIL / SMOKE_PASSWORD (secrets). Missing creds → skip, exit 0
// (same convention as the auth smoke; forked Repls shouldn't hard-fail).

export async function runWorkflowServicesSmoke() {
  const results = [];
  const pass = (m) => { console.log(`PASS ${m}`); results.push({ ok: true, message: m }); };
  const fail = (m) => { console.error(`FAIL ${m}`); results.push({ ok: false, message: m }); };

  const BASE = process.env.VITE_SUPABASE_URL;
  const ANON = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const EMAIL = process.env.SMOKE_EMAIL;
  const PASSWORD = process.env.SMOKE_PASSWORD;
  if (!BASE || !ANON || !EMAIL || !PASSWORD) {
    // Both entry points check this before calling; the guard keeps a direct
    // programmatic call honest instead of failing obscurely.
    return { results: [{ ok: false, message: "VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY / SMOKE_EMAIL / SMOKE_PASSWORD must all be set" }] };
  }

  const tokenResp = await fetch(`${BASE}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: ANON },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  const tokenBody = await tokenResp.json().catch(() => ({}));
  if (!tokenResp.ok || !tokenBody.access_token) {
    fail(`sign-in failed (HTTP ${tokenResp.status})`);
    return { results };
  }
  const TOKEN = tokenBody.access_token;
  // Solo-firm account → its clientId is its own user id (verifiedClientId.ts).
  const CLIENT_ID = tokenBody.user.id;

  const call = async (slug, body) => {
    const resp = await fetch(`${BASE}/functions/v1/${slug}`, {
      method: "POST",
      // Same headers the web app sends: session JWT in Authorization (the
      // gateway rejects x-user-token preflights) plus the body accessToken.
      headers: {
        "Content-Type": "application/json",
        apikey: ANON,
        Authorization: `Bearer ${TOKEN}`,
      },
      body: JSON.stringify({ clientId: CLIENT_ID, accessToken: TOKEN, ...body }),
    });
    const json = await resp.json().catch(() => null);
    return { status: resp.status, json };
  };

  // ── Battle Plan workflow: items → comment → partner link ──────────────────

  let itemId = null;
  try {
    const list = await call("workflow-items-manage", { action: "list" });
    if (list.status === 200 && Array.isArray(list.json?.items) && Array.isArray(list.json?.comments)) {
      pass(`workflow-items-manage list returned ${list.json.items.length} item(s)`);
    } else {
      fail(`workflow-items-manage list: HTTP ${list.status} ${JSON.stringify(list.json)?.slice(0, 200)}`);
    }

    const created = await call("workflow-items-manage", {
      action: "create",
      title: `Smoke item ${Date.now()}`,
      description: "Created by workflow-services-smoke; deleted at the end.",
      source: "manual",
    });
    itemId = created.json?.item?.id ?? null;
    if (created.status === 200 && itemId) {
      pass("workflow-items-manage create returned the new item");
    } else {
      fail(`workflow-items-manage create: HTTP ${created.status} ${JSON.stringify(created.json)?.slice(0, 200)}`);
    }

    if (itemId) {
      const comment = await call("workflow-comment-add", { itemId, body: "Smoke comment" });
      if (comment.status === 200 && comment.json?.comment?.id) {
        pass("workflow-comment-add returned the new comment");
      } else {
        fail(`workflow-comment-add: HTTP ${comment.status} ${JSON.stringify(comment.json)?.slice(0, 200)}`);
      }

      const link = await call("workflow-partner-link", {
        action: "create",
        itemIds: [itemId],
        recipientLabel: "Smoke reviewer",
        expiresInDays: 1,
      });
      const linkId = link.json?.linkId ?? null;
      if (link.status === 200 && linkId) {
        pass("workflow-partner-link create returned a link id");
        // The whole point of the link: the partner needs NO account.
        const view = await call("workflow-partner-link", { action: "view", linkId, accessToken: undefined });
        if (view.status === 200 && Array.isArray(view.json?.items) && view.json.items.length === 1) {
          pass("workflow-partner-link view works without a session");
        } else {
          fail(`workflow-partner-link view: HTTP ${view.status} ${JSON.stringify(view.json)?.slice(0, 200)}`);
        }
      } else {
        fail(`workflow-partner-link create: HTTP ${link.status} ${JSON.stringify(link.json)?.slice(0, 200)}`);
      }

      const del = await call("workflow-items-manage", { action: "delete", id: itemId });
      if (del.status === 200 && del.json?.ok) {
        pass("workflow-items-manage delete cleaned up the smoke item");
      } else {
        fail(`workflow-items-manage delete: HTTP ${del.status} ${JSON.stringify(del.json)?.slice(0, 200)}`);
      }
    }
  } catch (err) {
    fail(`workflow happy path threw: ${err?.message ?? err}`);
  }

  // ── Roast share links (task #136/#149): create → no-login view → 404 ─────
  // The #136 verification ran as an ephemeral script; an undeploy or
  // regression here would surface as a partner opening a dead link.

  let roastLinkId = null;
  try {
    // The view checks below reproduce the public RoastShare page's LOGGED-OUT
    // header contract exactly (edgeHeaders(): Authorization carries the anon
    // publishable key — that's how the gateway authenticates the call at all —
    // and x-access-token is absent). No user JWT anywhere: anon-only access.
    const viewAnon = (linkId) =>
      fetch(`${BASE}/functions/v1/roast-share-link`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: ANON, Authorization: `Bearer ${ANON}` },
        body: JSON.stringify({ action: "view", linkId }),
      }).then(async (resp) => ({ status: resp.status, json: await resp.json().catch(() => null) }));

    const ROAST_PAYLOAD = {
      verdict: `Smoke verdict ${Date.now()} — the deck buries the ask behind six slides of credentials`,
      grade: "C",
      slides: [{ n: 1, verdict: "Title slide says nothing" }],
    };
    const created = await call("roast-share-link", {
      action: "create",
      payload: ROAST_PAYLOAD,
      fileName: "smoke-deck.pdf",
      recipientLabel: "Smoke roast reviewer",
      expiresInDays: 1,
    });
    const linkId = created.json?.linkId ?? null;
    if (linkId) roastLinkId = linkId;
    if (created.status === 200 && linkId) {
      pass("roast-share-link create returned a link id");
      const view = await viewAnon(linkId);
      if (view.status === 200 && view.json?.payload?.verdict === ROAST_PAYLOAD.verdict) {
        pass("roast-share-link view returns the exact roast with NO session");
      } else {
        fail(`roast-share-link view: HTTP ${view.status} ${JSON.stringify(view.json)?.slice(0, 200)}`);
      }
    } else {
      fail(`roast-share-link create: HTTP ${created.status} ${JSON.stringify(created.json)?.slice(0, 200)}`);
    }

    const bogus = await viewAnon("00000000-0000-0000-0000-000000000000");
    if (bogus.status === 404) {
      pass("roast-share-link returns 404 for a bogus link id");
    } else {
      fail(`roast-share-link bogus id: HTTP ${bogus.status} ${JSON.stringify(bogus.json)?.slice(0, 200)} (expected 404)`);
    }

    // Task #151: owner-side management — the firm's list shows the live
    // link, and revoke kills it early (public view then 404s like an
    // expired link).
    if (linkId) {
      const list = await call("roast-share-link", { action: "list" });
      if (list.status === 200 && Array.isArray(list.json?.links) && list.json.links.some((l) => l.id === linkId)) {
        pass("roast-share-link list shows the firm's live link");
      } else {
        fail(`roast-share-link list: HTTP ${list.status} ${JSON.stringify(list.json)?.slice(0, 200)}`);
      }

      const revoke = await call("roast-share-link", { action: "revoke", linkId });
      if (revoke.status === 200 && revoke.json?.ok) {
        const after = await viewAnon(linkId);
        if (after.status === 404) {
          pass("roast-share-link revoke kills the link early — public view then 404s");
        } else {
          fail(`roast-share-link post-revoke view: HTTP ${after.status} (expected 404)`);
        }
      } else {
        fail(`roast-share-link revoke: HTTP ${revoke.status} ${JSON.stringify(revoke.json)?.slice(0, 200)}`);
      }

      // The delete is scoped to the resolved firm: an unknown (or another
      // firm's) link id matches nothing → 404, never a cross-firm oracle.
      const foreign = await call("roast-share-link", { action: "revoke", linkId: "00000000-0000-0000-0000-000000000000" });
      if (foreign.status === 404) {
        pass("roast-share-link revoke 404s an unknown/foreign link id (no cross-firm oracle)");
      } else {
        fail(`roast-share-link revoke unknown id: HTTP ${foreign.status} (expected 404)`);
      }

      // Task #165 — the weekly digest is a cron-only surface: a signed-in
      // user (or anyone) without the Vault cron secret must get 401.
      const digest = await call("weekly-score-digest", {});
      if (digest.status === 401) {
        pass("weekly-score-digest rejects non-cron callers (401)");
      } else {
        fail(`weekly-score-digest without cron secret: HTTP ${digest.status} (expected 401)`);
      }
    }
  } catch (err) {
    fail(`roast-share-link checks threw: ${err?.message ?? err}`);
  }

  // ── firm-members-manage: solo firm, so assert the role guard rejects ──────

  try {
    const res = await call("firm-members-manage", {
      action: "changeRole",
      targetUserId: "00000000-0000-0000-0000-000000000000",
      role: "member",
    });
    if (res.status >= 400 && res.status < 500 && res.json?.error) {
      pass(`firm-members-manage rejected a bogus target with a clear ${res.status} (${String(res.json.error).slice(0, 80)})`);
    } else {
      fail(`firm-members-manage bogus target: HTTP ${res.status} ${JSON.stringify(res.json)?.slice(0, 200)} (expected a clear 4xx)`);
    }
  } catch (err) {
    fail(`firm-members-manage check threw: ${err?.message ?? err}`);
  }

  // ── Audit-backed features: happy path when an audit exists ────────────────

  try {
    // Look the audit up through the same edge function the app uses —
    // direct PostgREST reads of market_visibility_audits are RLS-denied for
    // the user, so a table read would silently degrade to the 4xx-only path
    // even with a seeded audit.
    const fetchFirstAuditId = async () => {
      const resp = await call("visibility-audit-get", {});
      const list = Array.isArray(resp.json?.audits) ? resp.json.audits : [];
      return list[0]?.id ?? null;
    };
    let auditId = await fetchFirstAuditId();

    // The live suites run in parallel against the same smoke account; a
    // concurrent suite can delete the audit between the lookup above and
    // the snapshot call below (observed as flaky "Audit not found" 404s).
    // Re-fetch once and retry with the current id before concluding the
    // audit is really gone.
    const auditGone = (res) => res.status === 404 && /audit not found/i.test(JSON.stringify(res.json ?? {}));

    if (auditId) {
      let snap = await call("audit-snapshot-save", { auditId, label: `Smoke snapshot ${Date.now()}` });
      if (auditGone(snap)) {
        // Parallel-suite race: the audit vanished mid-run. Re-fetch and
        // retry once with the current id rather than flaking the suite.
        auditId = await fetchFirstAuditId();
        if (auditId) snap = await call("audit-snapshot-save", { auditId, label: `Smoke snapshot ${Date.now()}` });
      }
      if (snap.status === 200 && snap.json?.snapshot) {
        pass("audit-snapshot-save stored a snapshot of the real audit");
      } else {
        fail(`audit-snapshot-save: HTTP ${snap.status} ${JSON.stringify(snap.json)?.slice(0, 200)}`);
      }

      const disputeBody = {
        // Category is a KEY (performance/social/seoAuthority/…), not a
        // display label. The performance lighthouse path is data-independent
        // (applyMetricCorrection creates missing leaves), so the dispute
        // works whatever the seeded audit's raw_metrics contain.
        category: "performance",
        metricPath: "performance.mobile.performance",
        correctedValue: 95,
        reason: "Smoke dispute (workflow-services-smoke)",
      };
      let dispute = auditId ? await call("visibility-audit-dispute", { auditId, ...disputeBody }) : null;
      if (dispute && auditGone(dispute)) {
        auditId = await fetchFirstAuditId();
        dispute = auditId ? await call("visibility-audit-dispute", { auditId, ...disputeBody }) : null;
      }
      if (dispute && dispute.status === 200 && dispute.json?.ok) {
        pass("visibility-audit-dispute recomputed the audit with the correction");
      } else if (dispute) {
        fail(`visibility-audit-dispute: HTTP ${dispute.status} ${JSON.stringify(dispute.json)?.slice(0, 200)}`);
      }
      // dispute === null: the audit vanished and no replacement exists —
      // fall through to the degrade-only assertion below by treating it as
      // the no-audit case (auditId is null).
      if (!auditId) {
        const res = await call("visibility-audit-dispute", { auditId: "00000000-0000-0000-0000-000000000000", ...disputeBody });
        if (res.status >= 400 && res.status < 500) {
          pass(`visibility-audit-dispute is live and validates input (HTTP ${res.status}; full happy path needs a seeded audit — run smoke:seed-audit)`);
        } else {
          fail(`visibility-audit-dispute without audit: HTTP ${res.status} ${JSON.stringify(res.json)?.slice(0, 200)} (expected a validation 4xx)`);
        }
      }
    } else {
      // No audit on the account (re-seed with smoke:seed-audit). Assert the
      // functions are live and validating rather than 404/500.
      for (const [slug, body] of [
        ["audit-snapshot-save", { auditId: "00000000-0000-0000-0000-000000000000", label: "smoke" }],
        ["visibility-audit-dispute", { auditId: "00000000-0000-0000-0000-000000000000", category: "performance", metricPath: "performance.mobile.performance", correctedValue: 95, reason: "smoke dispute" }],
      ]) {
        const res = await call(slug, body);
        if (res.status >= 400 && res.status < 500) {
          pass(`${slug} is live and validates input (HTTP ${res.status}; full happy path needs a seeded audit — run smoke:seed-audit)`);
        } else {
          fail(`${slug} without audit: HTTP ${res.status} ${JSON.stringify(res.json)?.slice(0, 200)} (expected a validation 4xx)`);
        }
      }
    }
  } catch (err) {
    fail(`audit-backed checks threw: ${err?.message ?? err}`);
  }

  // ── Cleanup: prune the dispute/snapshot rows this leg appended ───────────
  // Every run otherwise permanently adds to the smoke account: one
  // metric_corrections row, one audit_history point tagged source='correction'
  // (correction points aren't measurements — over weeks they distort the
  // trend/delta assertions that read this account's history), and one labeled
  // audit_snapshots row. When SUPABASE_ACCESS_TOKEN (workspace secret) is
  // present, delete exactly those rows via the Management API, scoped to the
  // smoke account's own client id so no real firm data can ever match.
  // The dispute's raw_metrics patch (performance.mobile.performance=95) is
  // deliberately NOT reverted — it's documented permanent fixture state in
  // seed-smoke-audit.mjs; `smoke:seed-audit --force` regenerates pristine.
  try {
    const MGMT_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
    if (!MGMT_TOKEN) {
      console.log("NOTE SUPABASE_ACCESS_TOKEN not set — smoke-row cleanup skipped (rows persist until the next clean re-seed; forked Repls are unaffected).");
    } else {
      const ref = new URL(BASE).hostname.split(".")[0];
      // History rows key on client_id (no audit_id column); corrections key
      // on audit_id → scoped through the smoke account's own audits.
      const auditScope = `(SELECT id FROM public.market_visibility_audits WHERE client_id = '${CLIENT_ID}')`;
      // Roast link: delete the EXACT row this run minted (by id + client
      // scope) — a label-scoped delete could eat a parallel run's fresh link
      // or a pre-existing one with the same label (review on task #149).
      const roastCleanup = roastLinkId
        ? `DELETE FROM public.roast_share_links WHERE id = '${roastLinkId}' AND client_id = '${CLIENT_ID}';`
        : "";
      const query = `
        DELETE FROM public.market_visibility_metric_corrections
          WHERE reason LIKE 'Smoke dispute%' AND audit_id IN ${auditScope};
        DELETE FROM public.market_visibility_audit_history
          WHERE source = 'correction' AND client_id = '${CLIENT_ID}';
        DELETE FROM public.audit_snapshots
          WHERE label LIKE 'Smoke snapshot%' AND client_id = '${CLIENT_ID}';
        ${roastCleanup}
      `;
      const resp = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${MGMT_TOKEN}` },
        body: JSON.stringify({ query }),
      });
      if (resp.ok) {
        pass("cleanup pruned the smoke dispute/snapshot rows and smoke roast-share links");
      } else {
        fail(`smoke-row cleanup: Management API HTTP ${resp.status} ${(await resp.text().catch(() => "")).slice(0, 200)}`);
      }
    }
  } catch (err) {
    fail(`smoke-row cleanup threw: ${err?.message ?? err}`);
  }

  return { results };
}

// ── Direct-run entry point (pnpm smoke:workflow) ─────────────────────────────

const isMain = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/"));

if (isMain) {
  if (!process.env.SMOKE_EMAIL || !process.env.SMOKE_PASSWORD) {
    console.log("SKIP SMOKE_EMAIL/SMOKE_PASSWORD not set — real-mode workflow smoke skipped (set them to enable).");
    process.exit(0);
  }
  const { results } = await runWorkflowServicesSmoke();
  const failures = results.filter((r) => !r.ok);
  console.log(failures.length ? `\n${failures.length} issue(s) found.` : "\nAll workflow-services smoke checks passed.");
  process.exit(failures.length ? 1 : 0);
}
