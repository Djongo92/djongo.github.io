---
name: Task agents share the production database
description: A task agent's isolated environment covers code, NOT the hosted Supabase project — its migrations land in prod mid-flight and collide with main-branch DB work.
---

Task agents work in isolated code environments, but edge deploys and Management API migrations from that environment target the **same production Supabase project**. While a task is IN_PROGRESS, its agent may already have created tables/functions in prod that main-branch work can't see in the repo yet.

**Why:** I started implementing an IN_PROGRESS task in the main workspace and created a `claim_audit_refresh` RPC with a different signature than the one the task agent had already applied — prod ended up with two overloads, which makes every PostgREST `rpc()` call ambiguous ("Could not choose a best candidate function") and would have broken the agent's deployed code. Had to drop my variant and delete my local migration file (an unrecorded local migration fails `check:schema-drift`, and its `CREATE OR REPLACE` would have stomped theirs if applied).

**How to apply:** before doing DB work for any task in IN_PROGRESS/MERGING state, check prod for the agent's objects first (`pg_proc`, `information_schema`, `supabase_migrations.schema_migrations` via the Management API). Never create same-named DB objects for a task an agent owns. If a collision happens anyway: drop your variant, delete your local migration file, verify the agent's object works, and confirm `check:schema-drift` is green.
