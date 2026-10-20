-- The Workshop's learning memory now covers the new writing tools too
-- (article, press pitch, LinkedIn plan, case study, directory submission,
-- page draft). Widens the tool_id allow-list; nothing else changes.
ALTER TABLE public.workshop_style_examples
  DROP CONSTRAINT IF EXISTS workshop_style_examples_tool_id_check;
ALTER TABLE public.workshop_style_examples
  ADD CONSTRAINT workshop_style_examples_tool_id_check
  CHECK (tool_id IN ('bio', 'headlines', 'copywriter', 'rewrite',
                     'article', 'pitch', 'linkedin', 'casestudy', 'submission', 'pagedraft'));
