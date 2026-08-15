-- ═══════════════════════════════════════════════════════════════════════════
-- 005_rpc_facturas.sql — Alta transaccional de factura + sus lineas de detalle
--
-- Sin esto, insertar la factura y despues sus detalles son dos llamadas
-- separadas desde el cliente: si la segunda falla queda una factura
-- huerfana sin lineas. La funcion hace las dos en una sola transaccion.
--
-- security invoker (el default) a proposito: corre con el rol del que
-- llama, asi que la RLS de `facturas` se sigue aplicando -- esto no es una
-- puerta trasera para saltarse el aislamiento por empresa.
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function public.crear_factura_con_detalles(factura jsonb, detalles jsonb default '[]'::jsonb)
returns uuid
language plpgsql security invoker as $$
declare
  nueva_id uuid;
begin
  insert into facturas (
    empresa_id, contribuyente_id, plan_cuenta_id, tipo_operacion,
    numero_factura, fecha_factura, timbrado, timbrado_vencimiento, condicion_venta,
    proveedor_nombre, proveedor_ruc, proveedor_direccion,
    cliente_nombre, cliente_ruc, cliente_direccion,
    moneda, tipo_cambio,
    exentas, gravado_5, gravado_10, iva_5, iva_10, total,
    forma_pago, observaciones,
    archivo_path, archivo_nombre, archivo_mime,
    extraccion_raw, created_by
  )
  select
    (factura->>'empresa_id')::uuid,
    (factura->>'contribuyente_id')::uuid,
    nullif(factura->>'plan_cuenta_id', '')::uuid,
    factura->>'tipo_operacion',
    nullif(factura->>'numero_factura', ''),
    nullif(factura->>'fecha_factura', '')::date,
    nullif(factura->>'timbrado', ''),
    nullif(factura->>'timbrado_vencimiento', '')::date,
    nullif(factura->>'condicion_venta', ''),
    nullif(factura->>'proveedor_nombre', ''),
    nullif(factura->>'proveedor_ruc', ''),
    nullif(factura->>'proveedor_direccion', ''),
    nullif(factura->>'cliente_nombre', ''),
    nullif(factura->>'cliente_ruc', ''),
    nullif(factura->>'cliente_direccion', ''),
    coalesce(nullif(factura->>'moneda', ''), 'PYG'),
    nullif(factura->>'tipo_cambio', '')::numeric,
    coalesce((factura->>'exentas')::numeric, 0),
    coalesce((factura->>'gravado_5')::numeric, 0),
    coalesce((factura->>'gravado_10')::numeric, 0),
    coalesce((factura->>'iva_5')::numeric, 0),
    coalesce((factura->>'iva_10')::numeric, 0),
    coalesce((factura->>'total')::numeric, 0),
    nullif(factura->>'forma_pago', ''),
    nullif(factura->>'observaciones', ''),
    nullif(factura->>'archivo_path', ''),
    nullif(factura->>'archivo_nombre', ''),
    nullif(factura->>'archivo_mime', ''),
    factura->'extraccion_raw',
    nullif(factura->>'created_by', '')::uuid
  returning id into nueva_id;

  insert into factura_detalles (factura_id, orden, descripcion, cantidad, precio_unitario, subtotal_linea, tasa_iva)
  select
    nueva_id,
    coalesce((d->>'orden')::int, (ord - 1)::int),
    d->>'descripcion',
    nullif(d->>'cantidad', '')::numeric,
    nullif(d->>'precio_unitario', '')::numeric,
    nullif(d->>'subtotal_linea', '')::numeric,
    nullif(d->>'tasa_iva', '')::smallint
  from jsonb_array_elements(detalles) with ordinality as t (d, ord);

  return nueva_id;
end;
$$;

revoke execute on function public.crear_factura_con_detalles(jsonb, jsonb) from public, anon;
grant execute on function public.crear_factura_con_detalles(jsonb, jsonb) to authenticated;
