import { Route, Routes } from 'react-router-dom'
import AppLayout from '@/components/layout/AppLayout'
import SuperAdminLayout from '@/components/layout/SuperAdminLayout'
import Contribuyentes from '@/pages/Contribuyentes'
import ContribuyenteDetalle from '@/pages/ContribuyenteDetalle'
import Inicio from '@/pages/Inicio'
import Login from '@/pages/Login'
import NoEncontrado from '@/pages/NoEncontrado'
import Usuarios from '@/pages/Usuarios'
import Empresas from '@/pages/admin/Empresas'
import EmpresaDetalle from '@/pages/admin/EmpresaDetalle'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route path="/" element={<AppLayout />}>
        <Route index element={<Inicio />} />
        <Route path="contribuyentes" element={<Contribuyentes />} />
        <Route path="contribuyentes/:id" element={<ContribuyenteDetalle />} />
        <Route path="usuarios" element={<Usuarios />} />
      </Route>

      <Route path="/admindrpcs" element={<SuperAdminLayout />}>
        <Route index element={<Empresas />} />
        <Route path=":id" element={<EmpresaDetalle />} />
      </Route>

      <Route path="*" element={<NoEncontrado />} />
    </Routes>
  )
}
