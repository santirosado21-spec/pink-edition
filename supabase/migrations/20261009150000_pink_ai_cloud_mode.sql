-- Modo en la nube: el navegador sube el video, el procesador (clave de servicio)
-- hace el resto y deja recorte, póster y render en buckets privados.

alter table public.videos
  add column poster_path text,
  add column person_path text,
  add column error text;

-- El estado lo cambia sólo el procesador; el usuario no necesita editar sus videos.
drop policy "videos: dueño edita" on public.videos;
revoke update on public.videos from authenticated;

-- Una subida sólo puede apuntar a la carpeta del propio usuario.
drop policy "videos: dueño crea" on public.videos;
create policy "videos: dueño crea" on public.videos for insert to authenticated
  with check ((select auth.uid()) = owner_id and source_path like (select auth.uid())::text || '/%');

-- Un trabajo nuevo sólo puede usar un plan del mismo video, y hay uno activo a la vez.
drop policy "jobs: dueño pide" on public.jobs;
create policy "jobs: dueño pide" on public.jobs for insert to authenticated
  with check (
    status = 'queued'
    and exists (select 1 from public.videos v where v.id = video_id and v.owner_id = (select auth.uid()))
    and (plan_id is null or exists (select 1 from public.edit_plans p where p.id = plan_id and p.video_id = jobs.video_id))
  );
create unique index jobs_one_active_per_video on public.jobs (video_id) where status in ('queued', 'running');

insert into storage.buckets (id, name, public) values ('media', 'media', false);
create policy "media: dueño lee" on storage.objects for select to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = (select auth.uid())::text);
