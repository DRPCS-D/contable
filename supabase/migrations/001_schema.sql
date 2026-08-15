-- ═══════════════════════════════════════════════════════════════════════════
-- 001_schema.sql — Esquema base del sistema contable
--
--   empresas (estudio contable)
--     ├── usuarios
--     └── contribuyentes
--           ├── plan_cuentas
--           └── facturas ── factura_detalles
--
-- La empresa es el limite de aislamiento: un usuario nunca ve datos de otra.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────
-- empresas — el estudio contable
-- ─────────────────────────────────────────────────────────────
create table if not exists empresas (
  id uuid default gen_random_uuid() primary key,
  nombre text not null,
  ruc text,
  email text,
  telefono text,
  direccion text,
  logo_url text,
  activo boolean not null default true,
  created_at timestamptz default now()
);

-- ─────────────────────────────────────────────────────────────
-- usuarios — perfil colgado de auth.users (comparten el id)
-- ─────────────────────────────────────────────────────────────
create table if not exists usuarios (
  id uuid primary key references auth.users (id) on delete cascade,
  empresa_id uuid references empresas (id) on delete cascade,
  nombre text not null,
  email text not null,
  rol text not null default 'usuario' check (rol in ('super_admin', 'admin', 'usuario')),
  activo boolean not null default true,
  created_at timestamptz default now(),
  -- El super_admin es el unico que vive fuera de una empresa
  constraint usuarios_empresa_requerida check (rol = 'super_admin' or empresa_id is not null)
);

create index if not exists usuarios_empresa_idx on usuarios (empresa_id);

-- ─────────────────────────────────────────────────────────────
-- contribuyentes — los clientes del estudio
-- ─────────────────────────────────────────────────────────────
create table if not exists contribuyentes (
  id uuid default gen_random_uuid() primary key,
  empresa_id uuid not null references empresas (id) on delete cascade,
  ruc text not null,
  razon_social text not null,
  nombre_fantasia text,
  tipo_persona text not null default 'juridica' check (tipo_persona in ('fisica', 'juridica')),
  direccion text,
  ciudad text,
  telefono text,
  email text,
  -- IRE General / IRE SIMPLE / RESIMPLE / IRP / IVA
  regimen text,
  activo boolean not null default true,
  created_at timestamptz default now(),
  unique (empresa_id, ruc)
);

create index if not exists contribuyentes_empresa_idx on contribuyentes (empresa_id);

-- ─────────────────────────────────────────────────────────────
-- plan_cuentas — categorizacion de facturas, por contribuyente
-- ─────────────────────────────────────────────────────────────
create table if not exists plan_cuentas (
  id uuid default gen_random_uuid() primary key,
  empresa_id uuid not null references empresas (id) on delete cascade,
  contribuyente_id uuid not null references contribuyentes (id) on delete cascade,
  codigo text not null,
  descripcion text not null,
  activo boolean not null default true,
  created_at timestamptz default now(),
  unique (contribuyente_id, codigo)
);

create index if not exists plan_cuentas_contribuyente_idx on plan_cuentas (contribuyente_id);

-- ─────────────────────────────────────────────────────────────
-- facturas
--
-- Ojo con los montos: en la factura paraguaya las columnas
-- Exentas / Gravadas 5% / Gravadas 10% vienen CON IVA incluido, y abajo
-- va la liquidacion del impuesto. Por eso:
--     total     = exentas + gravado_5 + gravado_10
--     iva_total = iva_5 + iva_10                    (columna generada)
--     subtotal  = total - iva_total                 (columna generada)
-- ─────────────────────────────────────────────────────────────
create table if not exists facturas (
  id uuid default gen_random_uuid() primary key,
  -- Denormalizado a proposito: deja la politica RLS en una sola condicion
  empresa_id uuid not null references empresas (id) on delete cascade,
  contribuyente_id uuid not null references contribuyentes (id) on delete cascade,
  plan_cuenta_id uuid references plan_cuentas (id) on delete set null,

  tipo_operacion text not null check (tipo_operacion in ('compra', 'venta')),

  numero_factura text,
  fecha_factura date,
  timbrado text,
  timbrado_vencimiento date,
  condicion_venta text check (condicion_venta in ('contado', 'credito')),

  proveedor_nombre text,
  proveedor_ruc text,
  proveedor_direccion text,
  cliente_nombre text,
  cliente_ruc text,
  cliente_direccion text,

  moneda text not null default 'PYG',
  tipo_cambio numeric(14, 4),

  exentas numeric(14, 2) not null default 0,
  gravado_5 numeric(14, 2) not null default 0,
  gravado_10 numeric(14, 2) not null default 0,
  iva_5 numeric(14, 2) not null default 0,
  iva_10 numeric(14, 2) not null default 0,
  total numeric(14, 2) not null default 0,

  iva_total numeric(14, 2) generated always as (iva_5 + iva_10) stored,
  subtotal numeric(14, 2) generated always as (total - iva_5 - iva_10) stored,

  forma_pago text,
  observaciones text,

  -- Ruta dentro del bucket 'facturas' de Storage
  archivo_path text,
  archivo_nombre text,
  archivo_mime text,

  -- Respuesta cruda de la IA, para poder auditar que leyo mal
  extraccion_raw jsonb,

  created_by uuid references usuarios (id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Anti-duplicados. En una venta el proveedor es el propio contribuyente,
-- asi que solo cuenta el numero; en una compra, el numero por proveedor.
create unique index if not exists facturas_unicas on facturas (
  contribuyente_id,
  tipo_operacion,
  (case when tipo_operacion = 'compra' then coalesce(proveedor_ruc, '') else '' end),
  numero_factura
) where numero_factura is not null and numero_factura <> '';

create index if not exists facturas_contribuyente_fecha_idx
  on facturas (contribuyente_id, fecha_factura desc);
create index if not exists facturas_empresa_idx on facturas (empresa_id);
create index if not exists facturas_plan_cuenta_idx on facturas (plan_cuenta_id);

-- ─────────────────────────────────────────────────────────────
-- factura_detalles — reemplaza la celda "Detalles (JSON)" del sistema viejo
-- ─────────────────────────────────────────────────────────────
create table if not exists factura_detalles (
  id uuid default gen_random_uuid() primary key,
  factura_id uuid not null references facturas (id) on delete cascade,
  orden int not null default 0,
  descripcion text,
  cantidad numeric(14, 4),
  precio_unitario numeric(14, 4),
  subtotal_linea numeric(14, 2),
  tasa_iva smallint check (tasa_iva in (0, 5, 10))
);

create index if not exists factura_detalles_factura_idx on factura_detalles (factura_id);

-- ─────────────────────────────────────────────────────────────
-- updated_at automatico en facturas
-- ─────────────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists facturas_updated_at on facturas;
create trigger facturas_updated_at
  before update on facturas
  for each row execute function public.set_updated_at();
