-- ═══════════════════════════════════════════════════════════════════════════
-- 003_storage.sql — Bucket privado para las imagenes y PDFs de las facturas
--
-- Ruta de cada archivo: {empresa_id}/{contribuyente_id}/{factura_id}.{ext}
-- El primer segmento del path es lo que la politica compara contra la empresa
-- del usuario, asi que el bucket queda particionado por estudio.
-- ═══════════════════════════════════════════════════════════════════════════

insert into storage.buckets (id, name, public)
values ('facturas', 'facturas', false)
on conflict (id) do nothing;

-- El bucket es privado: las previews se sirven con signed URLs desde el cliente.
drop policy if exists "Archivos de mi empresa" on storage.objects;
create policy "Archivos de mi empresa" on storage.objects for all to authenticated
  using (
    bucket_id = 'facturas'
    and (es_super_admin() or (storage.foldername(name))[1] = mi_empresa_id()::text)
  )
  with check (
    bucket_id = 'facturas'
    and (es_super_admin() or (storage.foldername(name))[1] = mi_empresa_id()::text)
  );
