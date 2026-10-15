-- Task #165 — weekly score-movement digest, scheduled on the same
-- Vault-backed wrapper pattern as the daily jobs (20260810070000): the cron
-- command is a bare function call with NO secret embedded (readable cron.job
-- rows can't leak it), and the wrapper reads 'cron_secret' from
-- vault.decrypted_secrets with the app.cron_secret GUC as the dashboard
-- fallback. Monday 07:00 UTC — the week opens with "what moved".

CREATE OR REPLACE FUNCTION public.internal_trigger_weekly_score_digest()
RETURNS void
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
DECLARE
  _cron_secret text;
BEGIN
  _cron_secret := current_setting('app.cron_secret', true);

  IF _cron_secret IS NULL OR _cron_secret = '' THEN
    SELECT decrypted_secret INTO _cron_secret
      FROM vault.decrypted_secrets
      WHERE name = 'cron_secret'
      ORDER BY created_at DESC
      LIMIT 1;
  END IF;

  IF _cron_secret IS NULL OR _cron_secret = '' THEN
    RAISE WARNING '[weekly-score-digest] cron secret is not configured — skipping scheduled run. Store it in Supabase Vault as ''cron_secret'' (or set app.cron_secret from the dashboard SQL editor).';
    RETURN;
  END IF;

  PERFORM net.http_post(
    url     := 'https://kosmxczrwrhzmmloxobq.supabase.co/functions/v1/weekly-score-digest',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', _cron_secret
    ),
    body    := '{}'::jsonb
  );
END;
$$;

REVOKE ALL ON FUNCTION public.internal_trigger_weekly_score_digest() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.internal_trigger_weekly_score_digest() TO service_role;

-- cron.schedule is idempotent on jobname — safe to re-run.
SELECT cron.schedule(
  'weekly-score-digest',
  '0 7 * * 1',
  'SELECT public.internal_trigger_weekly_score_digest()'
);

-- Durable idempotency for the digest (code review, task #165): a sliding
-- "already notified this week" check expires before the NEXT Monday run and
-- re-sends an unchanged movement, and a read-then-insert dedupe races under
-- concurrent invocations. Instead the function atomically claims each
-- (client, latest-audit) pair here BEFORE filing the notification — the same
-- latest audit can never produce a second digest, no matter how many times
-- the cron retries or how the runs overlap.
CREATE TABLE public.score_digest_log (
  client_id          UUID NOT NULL,
  latest_recorded_at TIMESTAMPTZ NOT NULL,
  sent_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (client_id, latest_recorded_at)
);

GRANT ALL ON public.score_digest_log TO service_role;
REVOKE ALL ON public.score_digest_log FROM anon, authenticated;

ALTER TABLE public.score_digest_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service role only"
ON public.score_digest_log
FOR ALL
TO public
USING (false)
WITH CHECK (false);

-- Atomic claim-and-notify (code review round 3, task #165): inserting the
-- claim and the notification in separate calls lets a transient notification
-- failure orphan the claim — that client's digest would be suppressed
-- FOREVER. One RPC = one transaction: if the notification insert fails, the
-- claim rolls back with it and the next run retries cleanly. Returns true
-- only to the invocation that won the claim (exactly-once under retries
-- and concurrent runs).
CREATE OR REPLACE FUNCTION public.claim_score_digest(
  p_client_id UUID,
  p_latest_recorded_at TIMESTAMPTZ,
  p_title TEXT,
  p_body TEXT
) RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
DECLARE
  _claimed UUID;
BEGIN
  INSERT INTO public.score_digest_log (client_id, latest_recorded_at)
  VALUES (p_client_id, p_latest_recorded_at)
  ON CONFLICT (client_id, latest_recorded_at) DO NOTHING
  RETURNING client_id INTO _claimed;

  IF _claimed IS NULL THEN
    RETURN false;
  END IF;

  INSERT INTO public.notifications (client_id, type, title, body)
  VALUES (p_client_id, 'score_digest', p_title, p_body);

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_score_digest(UUID, TIMESTAMPTZ, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_score_digest(UUID, TIMESTAMPTZ, TEXT, TEXT) TO service_role;
