---
name: Access control model (edge functions)
description: How anonymous access to edge functions is decided, why metering is not authorization, and the rules to follow when adding or gating a new function.
---

# Access control model

`requireAccess` grants access in three tiers, first match wins: a legacy HMAC
password token, a real Supabase session (unmetered), then anonymous — allowed
only for an explicit allowlist, and metered.

## A new edge function is denied to anonymous callers by default

It becomes publicly reachable only if you deliberately add it to the metered
allowlist in `_shared/access.ts`. Adding a function that spends money without
deciding this is the mistake to avoid.

**Why:** the predecessor was a single global bypass constant that made
`requireAccess` return null immediately, so every protected endpoint —
including ~22 that call Anthropic — was callable by anyone who read the public
anon key out of the JS bundle. When that was replaced, the first attempt
metered *all* anonymous traffic uniformly, which still left account-state and
admin-adjacent routes reachable by strangers.

**Metering is a spend control, not an authorization control.** Never let a
quota stand in for a permission check.

## Authorization that depends on the action cannot live in the middleware

Some functions are public for one action and privileged for another — a
partner-review link is viewable/commentable by anyone holding the link id, but
minting a new link must prove a session, or anyone could forge a link for any
firm they can guess. The action lives in the request body, and middleware must
never read the body, so a URL-keyed allowlist cannot express this.

**How to apply:** such functions parse their body first and call
`requireAccess` only on the privileged branch. Do not add a whole-function
public exemption to work around it — that was the bug a review caught.

## The session JWT cannot travel in the request body

`requireAccess` must never read the request body: handlers downstream call
`req.json()`, and a `Request` body can only be consumed once. Hence a dedicated
header for the JWT.

Note this differs from identity resolution, which *does* take an access token
from the body, because it runs inside the handler after parsing. Two different
mechanisms, deliberately.

**How to apply:** any new middleware-level check must be header-only. Any new
client (web, mobile, a script) must send that header or its logged-in users
will be classified anonymous and 401 — mobile shipped this bug twice, in two
different call helpers.

## Anonymous quota is exact, unlike the other rate-limit buckets

The demo bucket runs as a DB-side RPC rather than the shared read-then-upsert
helper.

**Why:** the shared helper races (concurrent requests all read the same count
and all pass) and fails *open* on a DB error. Both are tolerable for the
buckets guarding cheap endpoints and are left as-is there. Neither is
acceptable for the only thing standing between an anonymous caller and per-call
Anthropic spend. A limiter that fails open is not a limiter.

**Pair every per-IP limit with an absolute ceiling.** The per-IP key derives
from proxy headers a direct caller can vary per request to mint unlimited fresh
buckets, so per-IP alone bounds nothing.

**Reserve both buckets in one atomic step, checking before incrementing.**
Consuming the caller's unit and only then discovering the global ceiling is
full charges them for a request that never ran.

## Only `cf-connecting-ip` is a trustworthy per-caller bucket key

`x-forwarded-for` and `x-real-ip` are ordinary headers any HTTP client sets to
whatever it wants — reproduced directly against a live Supabase project
(supabase/discussions#34647: a spoofed `x-forwarded-for` passes through
unmodified). `cf-connecting-ip` is different: this project's edge functions
are only reached through Supabase's shared `*.supabase.co` gateway, which is
Cloudflare-fronted, and Cloudflare unconditionally overwrites any inbound
`CF-Connecting-IP` with the real TCP peer address before forwarding — a caller
cannot spoof it on a request that genuinely reaches the function.

**How to apply:** trust only `cf-connecting-ip` as a per-caller bucket key; if
it's absent, fold the request into one shared bucket rather than trusting
`x-forwarded-for`/`x-real-ip` as a distinguishing key (either would let one
caller mint an unlimited number of fresh buckets).

**The same spoofable-identifier problem applies beyond IPs.** Any bucket keyed
by a value the caller supplies in the body — not just a proxy header — has the
identical hole; a per-caller limit alone bounds nothing if the caller also
controls the key.

**A limiter that races under concurrent requests is not a limiter for a
brute-force target.** Read-then-upsert (read current count, then write it
back) lets every simultaneous caller for the same key observe the same
pre-increment count and all pass. Tolerable for buckets guarding cheap,
non-adversarial endpoints; not for anything guarding a password or secret
worth guessing in parallel — those need a row-locked, atomic DB-side consume
function (and must deny, not allow, on its own error).

## Account-keyed endpoints must verify the token, never trust a caller-supplied id

Identity resolution has exactly two modes — the lenient "no token → trust
the caller's clientId" resolver was deleted; do not reintroduce it. Strict
(null unless the token verifies → 401) is for account-only endpoints;
guarded is for endpoints with legitimate token-less callers (legacy
benchmark/workshop HMAC holders, anonymous browser-id flows) and lets a
token-less caller use only ids no account owns.

**Ownership must be checked against the complete registry, and probes must
fail closed.** The complete registry of account ids is auth.users itself;
provisioning tables (firm_members, firms) miss accounts created before
provisioning existed. And an errored ownership lookup must read as
"claimed" (401), never "unclaimed" — a transient outage must not reopen
the hole. Same rule anywhere a caller supplies a "source" id: the
anonymous-id a claim flow re-keys from must be verified unclaimed first,
or a signed-in caller can pass a victim's account id and steal their rows.

**Why:** account ids are not unguessable the way random per-browser ids
were; the legacy trust model only survives where the id space is unlisted
and worthless to guess.

**How to apply:** when adding or reviewing an edge function over
client-keyed rows, pick the resolver by caller population, not convenience:
signed-in-only → strict; mixed → guarded. Identity tokens can arrive in
the body (web) or in session headers (mobile) — resolution must accept
both. Related durable patterns: writes that must not overwrite a
concurrent writer go through an atomic create-if-absent variant that
returns the authoritative winner, and read-then-write flows pin the target
firm explicitly (membership-validated server-side) because per-call
auto-resolution can pick different firms for a multi-firm consultant.
