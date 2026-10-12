-- Estilo del creador: lo que contesta una vez en el cuestionario (tema, estilo de
-- edición, gráficos, color de marca, sonido). Se copia al plan de cada video nuevo.

create table public.profiles (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  preferences jsonb not null
    check (jsonb_typeof(preferences) = 'object' and pg_column_size(preferences) < 4096),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Cada persona sólo ve y cambia su propio estilo. El procesador lo lee con la clave de servicio.
create policy "profiles: dueño lee" on public.profiles for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "profiles: dueño crea" on public.profiles for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "profiles: dueño edita" on public.profiles for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

grant select, insert, update on public.profiles to authenticated;
