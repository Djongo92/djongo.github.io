-- The cron helper had this project's URL written into it, so the same
-- migrations applied to any other Supabase project (a staging copy, a
-- restore) would have sent every scheduled run to production. The URL now
-- comes from Vault, next to cron_secret:
--
--   select vault.create_secret('https://<ref>.supabase.co', 'project_url');
--
-- Without it the run is skipped with a warning, same as a missing secret.
-- Production's value was stored before this migration was applied.

CREATE OR REPLACE FUNCTION public.internal_invoke_cron_function(p_slug text)
RETURNS void
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
DECLARE
  _cron_secret text;
  _project_url text;
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
    RAISE WARNING '[%] cron secret is not configured — skipping scheduled run. Store it in Supabase Vault as ''cron_secret''.', p_slug;
    RETURN;
  END IF;

  SELECT rtrim(decrypted_secret, '/') INTO _project_url
    FROM vault.decrypted_secrets
    WHERE name = 'project_url'
    ORDER BY created_at DESC
    LIMIT 1;

  IF _project_url IS NULL OR _project_url = '' THEN
    RAISE WARNING '[%] project URL is not configured — skipping scheduled run. Store it in Supabase Vault as ''project_url''.', p_slug;
    RETURN;
  END IF;

  PERFORM net.http_post(
    url     := _project_url || '/functions/v1/' || p_slug,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', _cron_secret
    ),
    body    := '{}'::jsonb,
    timeout_milliseconds := 150000
  );
END;
$$;

REVOKE ALL ON FUNCTION public.internal_invoke_cron_function(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.internal_invoke_cron_function(text) TO service_role;
