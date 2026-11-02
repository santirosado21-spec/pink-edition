-- Facturación: el navegador sólo puede leer sus propios registros.
-- Ninguna tarjeta, secreto de Stripe ni payload completo se guarda en estas tablas.
begin;
create table public.billing_customers (
  user_id uuid primary key references auth.users(id) on delete cascade,
  stripe_customer_id text not null unique,
  created_at timestamptz not null default now()
);
create table public.billing_checkouts (
  session_id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  stripe_customer_id text not null,
  status text check (status in ('open', 'complete', 'expired')),
  payment_status text not null check (payment_status in ('paid', 'unpaid', 'no_payment_required')),
  amount_total bigint check (amount_total >= 0),
  currency text,
  subscription_id text,
  payment_intent_id text,
  created_at timestamptz not null,
  updated_at timestamptz not null default now()
);
create index billing_checkouts_user_created on public.billing_checkouts(user_id, created_at desc);
create table public.billing_events (
  event_id text primary key,
  event_type text not null,
  object_id text not null,
  stripe_customer_id text,
  stripe_created_at timestamptz not null,
  processed_at timestamptz not null default now()
);
alter table public.billing_customers enable row level security;
alter table public.billing_checkouts enable row level security;
alter table public.billing_events enable row level security;
revoke all on public.billing_customers, public.billing_checkouts, public.billing_events from anon, authenticated;
grant select on public.billing_customers, public.billing_checkouts to authenticated;
grant all on public.billing_customers, public.billing_checkouts, public.billing_events to service_role;
create policy "billing customers owner reads" on public.billing_customers for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "billing checkouts owner reads" on public.billing_checkouts for select to authenticated
  using ((select auth.uid()) = user_id);

-- Un perfil válido debe existir antes de iniciar el flujo de edición desde la Data API.
-- RLS restrictiva complementa las políticas de propietario existentes.
create policy "videos require creator profile" on public.videos as restrictive for insert to authenticated
  with check (exists (select 1 from public.profiles p where p.user_id = (select auth.uid())));
create policy "jobs require creator profile" on public.jobs as restrictive for insert to authenticated
  with check (exists (select 1 from public.profiles p where p.user_id = (select auth.uid())));
create policy "source uploads require creator profile" on storage.objects as restrictive for insert to authenticated
  with check (bucket_id <> 'sources' or exists (select 1 from public.profiles p where p.user_id = (select auth.uid())));
commit;
