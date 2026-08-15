# Sistema Contable

Registro de facturas de compra y venta para estudios contables paraguayos, con
extraccion automatica de datos desde imagenes y PDFs usando GPT-4o Vision.

Reemplaza al Extractor de Facturas hecho en Google Apps Script
(`D:\CLAUDE\FACTURAS`), que guardaba todo en una hoja de Google Sheets.

## Como esta armado

```
empresas (estudio contable)      ← el limite de aislamiento
  ├── usuarios
  └── contribuyentes             ← los clientes del estudio
        ├── plan_cuentas         ← categorizacion (codigo + descripcion)
        └── facturas ── factura_detalles
```

Un usuario **solo ve datos de su empresa**. Eso no depende del frontend: lo
garantiza Row Level Security en Postgres. El unico que atraviesa empresas es el
`super_admin`, que gestiona los estudios desde `/admindrpcs`.

**Stack:** React + TypeScript + Vite · Tailwind v4 · React Router · Supabase
(Postgres + Auth + Storage) · Vercel Serverless Functions · OpenAI GPT-4o Vision.

## Puesta en marcha

### 1. Supabase

Crear un proyecto y correr, en orden, en el **SQL Editor**:

| Archivo | Que hace |
|---|---|
| `supabase/migrations/001_schema.sql` | Tablas, indices y triggers |
| `supabase/migrations/002_rls.sql` | Aislamiento por empresa |
| `supabase/migrations/003_storage.sql` | Bucket privado `facturas` |

Despues, crear el usuario super admin en **Authentication → Users → Add user**
(marcando *Auto Confirm User*), y recien ahi correr `004_super_admin.sql`
cambiando el email por el que se uso.

### 2. Variables de entorno

Copiar `.env.example` a `.env` y completar con los valores de
**Project Settings → API**.

Las `VITE_*` viajan al navegador y estan pensadas para eso. Las otras tres son
**solo del servidor**: si a alguna se le pone el prefijo `VITE_`, la clave
termina publicada dentro del bundle.

### 3. Correr

```bash
npm install
npm run dev
```

## Deploy

Vercel autodetecta Vite. Hay que cargar las cinco variables de entorno en
**Settings → Environment Variables** (las tres del servidor sin prefijo).

El `vercel.json` reescribe todo hacia `index.html` **menos** `/api/*`, para que
recargar con F5 en una ruta profunda no de 404 y las funciones sigan andando.

## Notas

- Los montos de la factura paraguaya (`exentas`, `gravado_5`, `gravado_10`)
  vienen **con IVA incluido**: `total = exentas + gravado_5 + gravado_10`.
  `iva_total` y `subtotal` los calcula Postgres, no se cargan a mano.
- El digito verificador del RUC solo genera una **advertencia** visual; nunca
  frena el guardado.
- De los PDF se rasteriza la primera pagina para mandarla a la IA, pero a
  Storage se sube el archivo original completo.
