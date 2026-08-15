import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import AppLayout from '@/components/layout/AppLayout'
import SuperAdminLayout from '@/components/layout/SuperAdminLayout'
import { Cargando } from '@/components/ui/estado'
import Contribuyentes from '@/pages/Contribuyentes'
import ContribuyenteDetalle from '@/pages/ContribuyenteDetalle'
import Empresa from '@/pages/Empresa'
import Inicio from '@/pages/Inicio'
import Login from '@/pages/Login'
import NoEncontrado from '@/pages/NoEncontrado'
import Usuarios from '@/pages/Usuarios'
import Empresas from '@/pages/admin/Empresas'
import EmpresaDetalle from '@/pages/admin/EmpresaDetalle'
import FacturasListado from '@/pages/facturas/Listado'

// pdf.js agrega ~1MB al bundle: se separa en su propio chunk para no
// penalizar el login ni el resto de la app, que no lo necesitan.
const CargarFacturas = lazy(() => import('@/pages/facturas/Cargar'))

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route path="/" element={<AppLayout />}>
        <Route index element={<Inicio />} />
        <Route path="contribuyentes" element={<Contribuyentes />} />
        <Route path="contribuyentes/:id" element={<ContribuyenteDetalle />} />
        <Route path="contribuyentes/:id/facturas" element={<FacturasListado />} />
        <Route
          path="contribuyentes/:id/facturas/cargar"
          element={
            <Suspense fallback={<Cargando texto="Cargando…" />}>
              <CargarFacturas />
            </Suspense>
          }
        />
        <Route path="usuarios" element={<Usuarios />} />
        <Route path="empresa" element={<Empresa />} />
      </Route>

      <Route path="/admindrpcs" element={<SuperAdminLayout />}>
        <Route index element={<Empresas />} />
        <Route path=":id" element={<EmpresaDetalle />} />
      </Route>

      <Route path="*" element={<NoEncontrado />} />
    </Routes>
  )
}
