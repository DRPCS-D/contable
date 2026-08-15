-- ═══════════════════════════════════════════════════════════════════════════
-- 002_rls.sql — Aislamiento por empresa
--
-- Regla unica: un usuario solo toca filas cuyo empresa_id coincide con el suyo.
-- El super_admin (empresa_id null) pasa por encima de todo.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────
-- Helpers en security definer: leen `usuarios` SALTEANDO la RLS.
-- Sin esto, cualquier politica sobre `usuarios` que a su vez consulte
-- `usuarios` dispara "infinite recursion detected in policy".
-- ─────────────────────────────────────────────────────────────
create or replace function public.mi_empresa_id()
returns uuid
language sql stable security definer set search_path = public as $$
  select empresa_id from public.usuarios where id = auth.uid()
$$;

create or replace function public.es_super_admin()
returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select rol = 'super_admin' from public.usuarios where id = auth.uid()), false)
$$;

revoke execute on function public.mi_empresa_id() from public, anon;
revoke execute on function public.es_super_admin() from public, anon;
grant execute on function public.mi_empresa_id() to authenticated;
grant execute on function public.es_super_admin() to authenticated;

-- ─────────────────────────────────────────────────────────────
-- empresas — se ve la propia; crearlas y editarlas es del super_admin
-- ─────────────────────────────────────────────────────────────
alter table empresas enable row level security;

drop policy if exists "Ver mi empresa" on empresas;
create policy "Ver mi empresa" on empresas for select to authenticated
  using (es_super_admin() or id = mi_empresa_id());

drop policy if exists "Super admin gestiona empresas" on empresas;
create policy "Super admin gestiona empresas" on empresas for all to authenticated
  using (es_super_admin()) with check (es_super_admin());

-- ─────────────────────────────────────────────────────────────
-- usuarios — se ven los de la propia empresa, pero NADIE se edita a si mismo.
-- Si un usuario pudiera hacer update sobre su fila, se pondria
-- rol = 'super_admin' y se quedaria con el sistema entero.
-- ─────────────────────────────────────────────────────────────
alter table usuarios enable row level security;

drop policy if exists "Ver usuarios de mi empresa" on usuarios;
create policy "Ver usuarios de mi empresa" on usuarios for select to authenticated
  using (es_super_admin() or (empresa_id is not null and empresa_id = mi_empresa_id()));

drop policy if exists "Super admin gestiona usuarios" on usuarios;
create policy "Super admin gestiona usuarios" on usuarios for all to authenticated
  using (es_super_admin()) with check (es_super_admin());

-- ─────────────────────────────────────────────────────────────
-- contribuyentes / plan_cuentas / facturas — CRUD completo dentro de la empresa
-- ─────────────────────────────────────────────────────────────
alter table contribuyentes enable row level security;

drop policy if exists "Acceso por empresa" on contribuyentes;
create policy "Acceso por empresa" on contribuyentes for all to authenticated
  using (es_super_admin() or empresa_id = mi_empresa_id())
  with check (es_super_admin() or empresa_id = mi_empresa_id());

alter table plan_cuentas enable row level security;

drop policy if exists "Acceso por empresa" on plan_cuentas;
create policy "Acceso por empresa" on plan_cuentas for all to authenticated
  using (es_super_admin() or empresa_id = mi_empresa_id())
  with check (es_super_admin() or empresa_id = mi_empresa_id());

alter table facturas enable row level security;

drop policy if exists "Acceso por empresa" on facturas;
create policy "Acceso por empresa" on facturas for all to authenticated
  using (es_super_admin() or empresa_id = mi_empresa_id())
  with check (es_super_admin() or empresa_id = mi_empresa_id());

-- factura_detalles no tiene empresa_id: hereda el permiso de su factura
alter table factura_detalles enable row level security;

drop policy if exists "Acceso por empresa" on factura_detalles;
create policy "Acceso por empresa" on factura_detalles for all to authenticated
  using (exists (
    select 1 from facturas f
    where f.id = factura_id and (es_super_admin() or f.empresa_id = mi_empresa_id())
  ))
  with check (exists (
    select 1 from facturas f
    where f.id = factura_id and (es_super_admin() or f.empresa_id = mi_empresa_id())
  ));

-- ─────────────────────────────────────────────────────────────
-- Permisos de tabla.
-- Supabase concede por defecto a `anon` sobre las tablas nuevas de public;
-- aca no hay nada publico, asi que se revoca de forma explicita.
-- ─────────────────────────────────────────────────────────────
revoke all on table empresas, usuarios, contribuyentes, plan_cuentas, facturas, factura_detalles from anon;

grant select on table empresas, usuarios to authenticated;
grant insert, update, delete on table empresas, usuarios to authenticated;
grant select, insert, update, delete
  on table contribuyentes, plan_cuentas, facturas, factura_detalles to authenticated;
