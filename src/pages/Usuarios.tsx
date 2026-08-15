import { UserRound } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Cargando, ErrorBox, Vacio } from '@/components/ui/estado'
import { useAuth } from '@/hooks/useAuth'
import { useUsuarios } from '@/hooks/useUsuarios'

export default function Usuarios() {
  const { empresa } = useAuth()
  const { data, loading, error } = useUsuarios(empresa?.id)

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-lg font-semibold text-foreground">Usuarios</h1>
        <p className="text-sm text-muted-foreground">
          Quienes tienen acceso a {empresa?.nombre ?? 'este estudio'}. Las altas y bajas las
          gestiona el administrador del sistema.
        </p>
      </div>

      {loading ? (
        <Cargando />
      ) : error ? (
        <ErrorBox mensaje={error} />
      ) : data.length === 0 ? (
        <Vacio icono={UserRound} titulo="Sin usuarios" />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="px-4 py-2.5 font-medium">Nombre</th>
                <th className="px-4 py-2.5 font-medium">Email</th>
                <th className="px-4 py-2.5 font-medium">Rol</th>
                <th className="px-4 py-2.5 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody>
              {data.map((u) => (
                <tr key={u.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-2.5 font-medium text-foreground">{u.nombre}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{u.email}</td>
                  <td className="px-4 py-2.5 capitalize text-muted-foreground">{u.rol}</td>
                  <td className="px-4 py-2.5">
                    <Badge tono={u.activo ? 'success' : 'neutral'}>
                      {u.activo ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
