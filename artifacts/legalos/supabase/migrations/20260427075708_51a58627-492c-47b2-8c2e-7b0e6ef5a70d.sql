create table public.firm_benchmarks (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null unique,
  practice_area text,
  firm_size text,
  chapters_read int not null default 0,
  implementation_pct int not null default 0,
  analyses_run int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.firm_benchmarks enable row level security;

create policy "anyone can read benchmarks"
on public.firm_benchmarks for select
using (true);

create policy "anyone can insert benchmarks"
on public.firm_benchmarks for insert
with check (true);

create policy "anyone can update benchmarks by client_id"
on public.firm_benchmarks for update
using (true);

create index idx_firm_benchmarks_practice on public.firm_benchmarks(practice_area);
create index idx_firm_benchmarks_size on public.firm_benchmarks(firm_size);

create or replace function public.update_firm_benchmarks_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql set search_path = public;

create trigger trg_firm_benchmarks_updated_at
before update on public.firm_benchmarks
for each row execute function public.update_firm_benchmarks_updated_at();