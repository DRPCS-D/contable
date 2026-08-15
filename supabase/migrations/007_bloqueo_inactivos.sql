-- ═══════════════════════════════════════════════════════════════════════════
-- 007_bloqueo_inactivos.sql — "Inactivo" pasa a bloquear de verdad, en la RLS
--
-- Hasta ahora `empresas.activo` y `usuarios.activo` eran solo datos
-- visuales: la RLS nunca los miraba, asi que un usuario desactivado (o de
-- un estudio desactivado) con una sesion todavia valida seguia teniendo
-- acceso completo via la API de Supabase, aunque la app se lo negara en
-- pantalla. El bloqueo real tiene que vivir en la base, no solo en el
-- frontend.
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function public.mi_empresa_id()
returns uuid
language sql stable security definer set search_path = public as $$
  select u.empresa_id
  from usuarios u
  join empresas e on e.id = u.empresa_id
  where u.id = auth.uid() and u.activo = true and e.activo = true
$$;

create or replace function public.es_super_admin()
returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select rol = 'super_admin' and activo from public.usuarios where id = auth.uid()),
    false
  )
$$;

-- Un usuario siempre tiene que poder leer SU PROPIA fila (para que la app
-- sepa por que lo esta bloqueando), incluso si su empresa quedo inactiva y
-- mi_empresa_id() ya no lo reconoce.
drop policy if exists "Ver usuarios de mi empresa" on usuarios;
create policy "Ver usuarios de mi empresa" on usuarios for select to authenticated
  using (
    es_super_admin()
    or id = auth.uid()
    or (empresa_id is not null and empresa_id = mi_empresa_id())
  );
