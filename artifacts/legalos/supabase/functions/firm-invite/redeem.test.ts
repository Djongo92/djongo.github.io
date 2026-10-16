// Regression tests for the firm-invite single-use race (fixed 2026-08-15):
// two concurrent redeems of the same token must yield exactly one firm
// membership. The old read-then-write code let both callers pass the
// "is it used?" check before either wrote — the fake below is built to
// reproduce that exact interleaving (both reads resolve before either
// claim executes), so a refactor back to read-then-write FAILS here.
//
// Runs under the Deno test gate (`pnpm --filter @workspace/uvid run
// test:deno`) — the file is listed explicitly in that script.

import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { redeemInvite } from "./redeem.ts";

// ─── Fake supabase client ─────────────────────────────────────────────────────
// Models just the chains redeemInvite uses, with PostgREST's atomic
// conditional-UPDATE semantics: an update whose filters don't match touches
// zero rows. Every terminal resolves on a macrotask so concurrent callers
// interleave read-read-claim-claim (the old losing pattern).

interface InviteRow {
  token: string;
  firm_id: string;
  role: string;
  expires_at: string;
  used_at: string | null;
  used_by: string | null;
  firms: { name: string };
}

interface FakeState {
  invite: InviteRow;
  memberships: Array<{ firm_id: string; user_id: string; role: string }>;
  failNextUpsert: boolean;
}

const tick = () => new Promise((r) => setTimeout(r, 0));

function fakeClient(state: FakeState) {
  return {
    from(table: string) {
      // deno-lint-ignore no-explicit-any
      const chain: any = {
        _op: null as null | "select" | "update",
        _fields: null as null | Record<string, unknown>,
        _filters: [] as Array<{ col: string; op: "eq" | "is" | "gt"; val: unknown }>,
        select(_cols: string) {
          if (this._op === null) this._op = "select";
          return this;
        },
        update(fields: Record<string, unknown>) {
          this._op = "update";
          this._fields = fields;
          return this;
        },
        eq(col: string, val: unknown) {
          this._filters.push({ col, op: "eq", val });
          return this;
        },
        is(col: string, val: unknown) {
          this._filters.push({ col, op: "is", val });
          return this;
        },
        gt(col: string, val: unknown) {
          this._filters.push({ col, op: "gt", val });
          return this;
        },
        async upsert(row: { firm_id: string; user_id: string; role: string }) {
          await tick();
          if (state.failNextUpsert) {
            state.failNextUpsert = false;
            return { error: { message: "simulated membership failure" } };
          }
          state.memberships.push(row);
          return { error: null };
        },
        async maybeSingle() {
          await tick();
          if (table !== "firm_invites") throw new Error(`unexpected table ${table}`);
          const row = state.invite;
          const matches = () =>
            chain._filters.every((f: { col: string; op: string; val: unknown }) => {
              // deno-lint-ignore no-explicit-any
              const cur = (row as any)[f.col];
              if (f.op === "eq") return cur === f.val;
              if (f.op === "is") return cur === f.val;
              if (f.op === "gt") return String(cur) > String(f.val);
              return false;
            });
          if (chain._op === "select") {
            // The read path filters by token only.
            return { data: matches() ? { ...row } : null, error: null };
          }
          // Conditional UPDATE — the atomic claim. Filters don't match →
          // zero rows → data: null, exactly like PostgREST.
          if (!matches()) return { data: null, error: null };
          Object.assign(row, chain._fields);
          return { data: { token: row.token }, error: null };
        },
        // Thenable so `await chain` (the rollback update) works without a
        // terminal call, mirroring supabase-js.
        then(resolve: (v: { error: null }) => void) {
          if (chain._op === "update" && table === "firm_invites") {
            const ok = chain._filters.every((f: { col: string; op: string; val: unknown }) => {
              // deno-lint-ignore no-explicit-any
              const cur = (state.invite as any)[f.col];
              return f.op === "eq" ? cur === f.val : true;
            });
            if (ok) Object.assign(state.invite, chain._fields);
          }
          return tick().then(() => resolve({ error: null }));
        },
      };
      return chain;
    },
  };
}

function freshState(overrides: Partial<InviteRow> = {}): FakeState {
  return {
    invite: {
      token: "tok-123",
      firm_id: "firm-1",
      role: "marketing",
      expires_at: new Date(Date.now() + 60_000).toISOString(),
      used_at: null,
      used_by: null,
      firms: { name: "Test Firm" },
      ...overrides,
    },
    memberships: [],
    failNextUpsert: false,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

Deno.test("concurrent redeems by two different users yield exactly one membership", async () => {
  const state = freshState();
  const client = fakeClient(state);

  const [a, b] = await Promise.all([
    redeemInvite(client, "tok-123", "user-a"),
    redeemInvite(client, "tok-123", "user-b"),
  ]);

  const statuses = [a.status, b.status].sort();
  assertEquals(statuses, [200, 400], "one winner, one loser");
  const loser = a.status === 400 ? a : b;
  assertEquals(loser.body.error, "This invite has already been used");
  assertEquals(state.memberships.length, 1, "exactly one membership row");
  const winner = a.status === 200 ? "user-a" : "user-b";
  assertEquals(state.memberships[0].user_id, winner);
  assertEquals(state.invite.used_by, winner);
});

Deno.test("same user re-redeeming is idempotent, not an error", async () => {
  const state = freshState();
  const client = fakeClient(state);

  const first = await redeemInvite(client, "tok-123", "user-a");
  assertEquals(first.status, 200);

  const retry = await redeemInvite(client, "tok-123", "user-a");
  assertEquals(retry.status, 200);
  assertEquals(retry.body.alreadyMember, true);
  assertEquals(retry.body.firmId, "firm-1");
  assertEquals(state.memberships.length, 1);
});

Deno.test("a used invite rejects a different user", async () => {
  const state = freshState();
  const client = fakeClient(state);

  await redeemInvite(client, "tok-123", "user-a");
  const other = await redeemInvite(client, "tok-123", "user-b");
  assertEquals(other.status, 400);
  assertEquals(other.body.error, "This invite has already been used");
  assertEquals(state.memberships.length, 1);
});

Deno.test("membership failure rolls the claim back so the invite isn't burned", async () => {
  const state = freshState();
  state.failNextUpsert = true;
  const client = fakeClient(state);

  const failed = await redeemInvite(client, "tok-123", "user-a");
  assertEquals(failed.status, 500);
  assertEquals(failed.body.error, "Couldn't join the firm");
  assertEquals(state.invite.used_at, null, "claim rolled back");
  assertEquals(state.invite.used_by, null);
  assertEquals(state.memberships.length, 0);

  const retry = await redeemInvite(client, "tok-123", "user-a");
  assertEquals(retry.status, 200);
  assertEquals(state.memberships.length, 1);
});

Deno.test("expired and unknown invites are rejected", async () => {
  const expired = freshState({ expires_at: new Date(Date.now() - 60_000).toISOString() });
  const r1 = await redeemInvite(fakeClient(expired), "tok-123", "user-a");
  assertEquals(r1.status, 400);
  assertEquals(r1.body.error, "This invite has expired");

  const state = freshState();
  const r2 = await redeemInvite(fakeClient(state), "no-such-token", "user-a");
  assertEquals(r2.status, 404);
});
