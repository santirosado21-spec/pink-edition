-- Pink.ai: videos subidos, su transcripción, planes de edición ajustables,
-- cola de trabajos para el procesador y renders entregados.

create table public.videos (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null,
  source_path text not null,
  status text not null default 'uploaded'
    check (status in ('uploaded', 'processing', 'ready_to_edit', 'rendering', 'done', 'failed')),
  language text not null default 'es',
  duration_seconds numeric,
  width integer,
  height integer,
  fps numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index videos_owner_id_idx on public.videos (owner_id, created_at desc);

create table public.transcripts (
  video_id uuid primary key references public.videos (id) on delete cascade,
  words jsonb not null,
  created_at timestamptz not null default now()
);

-- Cada ajuste del usuario crea una versión nueva; ninguna se sobrescribe.
create table public.edit_plans (
  id uuid primary key default gen_random_uuid(),
  video_id uuid not null references public.videos (id) on delete cascade,
  version integer not null,
  style text not null default 'pink-demo-v1',
  source text not null default 'auto' check (source in ('auto', 'user')),
  config jsonb not null,
  timeline jsonb not null,
  created_at timestamptz not null default now(),
  unique (video_id, version)
);

create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  video_id uuid not null references public.videos (id) on delete cascade,
  plan_id uuid references public.edit_plans (id) on delete set null,
  kind text not null check (kind in ('analyze', 'render')),
  status text not null default 'queued'
    check (status in ('queued', 'running', 'done', 'failed')),
  progress numeric not null default 0 check (progress between 0 and 1),
  attempts integer not null default 0,
  worker text,
  error text,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz
);
create index jobs_video_id_idx on public.jobs (video_id);
create index jobs_plan_id_idx on public.jobs (plan_id);
create index jobs_queue_idx on public.jobs (created_at) where status = 'queued';

create table public.renders (
  id uuid primary key default gen_random_uuid(),
  video_id uuid not null references public.videos (id) on delete cascade,
  plan_id uuid not null references public.edit_plans (id) on delete cascade,
  job_id uuid references public.jobs (id) on delete set null,
  output_path text not null,
  duration_seconds numeric,
  qc jsonb,
  created_at timestamptz not null default now()
);
create index renders_video_id_idx on public.renders (video_id, created_at desc);
create index renders_plan_id_idx on public.renders (plan_id);
create index renders_job_id_idx on public.renders (job_id);

alter table public.videos enable row level security;
alter table public.transcripts enable row level security;
alter table public.edit_plans enable row level security;
alter table public.jobs enable row level security;
alter table public.renders enable row level security;

-- Cada persona sólo ve y cambia lo suyo. El procesador usa la clave de servicio.
create policy "videos: dueño lee" on public.videos for select to authenticated
  using ((select auth.uid()) = owner_id);
create policy "videos: dueño crea" on public.videos for insert to authenticated
  with check ((select auth.uid()) = owner_id);
create policy "videos: dueño edita" on public.videos for update to authenticated
  using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy "videos: dueño borra" on public.videos for delete to authenticated
  using ((select auth.uid()) = owner_id);

create policy "transcripts: dueño lee" on public.transcripts for select to authenticated
  using (exists (select 1 from public.videos v where v.id = video_id and v.owner_id = (select auth.uid())));

create policy "edit_plans: dueño lee" on public.edit_plans for select to authenticated
  using (exists (select 1 from public.videos v where v.id = video_id and v.owner_id = (select auth.uid())));
create policy "edit_plans: dueño crea" on public.edit_plans for insert to authenticated
  with check (source = 'user' and exists (select 1 from public.videos v where v.id = video_id and v.owner_id = (select auth.uid())));

create policy "jobs: dueño lee" on public.jobs for select to authenticated
  using (exists (select 1 from public.videos v where v.id = video_id and v.owner_id = (select auth.uid())));
create policy "jobs: dueño pide" on public.jobs for insert to authenticated
  with check (status = 'queued' and exists (select 1 from public.videos v where v.id = video_id and v.owner_id = (select auth.uid())));

create policy "renders: dueño lee" on public.renders for select to authenticated
  using (exists (select 1 from public.videos v where v.id = video_id and v.owner_id = (select auth.uid())));

grant select, insert, update, delete on public.videos to authenticated;
grant select on public.transcripts, public.renders to authenticated;
grant select, insert on public.edit_plans, public.jobs to authenticated;

-- El procesador toma un trabajo a la vez sin que dos lo agarren.
create function public.claim_next_job(worker_name text)
returns public.jobs
language sql
security invoker
set search_path = ''
as $$
  update public.jobs
  set status = 'running', worker = worker_name, started_at = now(), attempts = attempts + 1
  where id = (
    select id from public.jobs
    where status = 'queued'
    order by created_at
    for update skip locked
    limit 1
  )
  returning *;
$$;
revoke execute on function public.claim_next_job(text) from public, anon, authenticated;
grant execute on function public.claim_next_job(text) to service_role;

-- Archivos privados; la carpeta de cada quien lleva su id de usuario.
insert into storage.buckets (id, name, public) values ('sources', 'sources', false), ('renders', 'renders', false);
create policy "sources: dueño sube" on storage.objects for insert to authenticated
  with check (bucket_id = 'sources' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "sources: dueño lee" on storage.objects for select to authenticated
  using (bucket_id = 'sources' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "renders: dueño descarga" on storage.objects for select to authenticated
  using (bucket_id = 'renders' and (storage.foldername(name))[1] = (select auth.uid())::text);
