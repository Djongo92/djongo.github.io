-- ===========================================================================
-- Directory removal requests: the consent/notice mechanism for firms that
-- appear on the public Directory Standing Index without ever having run an
-- audit themselves. The underlying Chambers/Legal 500 rankings were always
-- public, so this isn't a data-deletion queue in the GDPR sense — it's a
-- lightweight "please review whether we should list this firm" request,
-- logged for manual follow-up rather than an automatic self-service
-- removal (which would be trivially abusable without any auth to verify
-- the requester actually represents the firm in question).
-- Same posture as directory_lookup_requests: service_role only, no anon/
-- authenticated grants.
-- ===========================================================================
CREATE TABLE public.directory_removal_requests (
  id           UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  market       TEXT NOT NULL,
  firm_name    TEXT NOT NULL,
  note         TEXT,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT ALL ON public.directory_removal_requests TO service_role;
REVOKE ALL ON public.directory_removal_requests FROM anon, authenticated;

ALTER TABLE public.directory_removal_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service role only"
ON public.directory_removal_requests
FOR ALL
TO public
USING (false)
WITH CHECK (false);

CREATE INDEX idx_directory_removal_requests_market ON public.directory_removal_requests (market, requested_at DESC);
