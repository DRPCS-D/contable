import { Building2, LogOut, ShieldCheck } from 'lucide-react'
import { useEffect } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Cargando } from '@/components/ui/estado'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'

const NAV = [
  { to: '/', label: 'Inicio', end: true },
  { to: '/contribuyentes', label: 'Contribuyentes', end: false },
  { to: '/usuarios', label: 'Usuarios', end: false },
]

export default function AppLayout() {
  const { user, perfil, empresa, loading, esSuperAdmin, problemaPerfil, signOut } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!loading && !user) navigate('/login', { replace: true })
  }, [user, loading, navigate])

  if (loading) return <Cargando className="min-h-screen" texto="Cargando tu cuenta…" />
  if (!user) return null

  // Sesion valida sin fila en `usuarios`: sin esto la pantalla queda en blanco
  // y no hay forma de entender por que.
  if (problemaPerfil) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="max-w-md rounded-lg border border-border bg-card p-6 text-center shadow-xs">
          <h1 className="text-sm font-semibold text-foreground">
            {problemaPerfil === 'inactivo' ? 'Cuenta desactivada' : 'Cuenta sin configurar'}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {problemaPerfil === 'inactivo'
              ? 'Tu usuario fue desactivado. Contactate con el administrador del sistema.'
              : 'Tu usuario existe pero todavia no esta asignado a ningun estudio. Contactate con el administrador del sistema.'}
          </p>
          <Button variant="outline" className="mt-5" onClick={signOut}>
            <LogOut /> Cerrar sesion
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-card/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4 sm:px-6">
          <Link to="/" className="flex min-w-0 items-center gap-2">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Building2 className="size-4" />
            </span>
            <span className="truncate text-sm font-semibold text-foreground">
              {empresa?.nombre ?? (esSuperAdmin ? 'Administracion' : 'Sistema Contable')}
            </span>
          </Link>

          <nav className="ml-2 hidden items-center gap-1 sm:flex">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    'rounded-md px-3 py-1.5 text-sm transition-colors',
                    isActive
                      ? 'bg-accent font-medium text-accent-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            {esSuperAdmin && (
              <Link
                to="/admindrpcs"
                className="hidden items-center gap-1.5 rounded-md bg-warning/15 px-2.5 py-1.5 text-xs font-medium text-warning sm:flex"
              >
                <ShieldCheck className="size-3.5" />
                Super admin
              </Link>
            )}
            <div className="hidden text-right sm:block">
              <p className="text-xs font-medium text-foreground">{perfil?.nombre}</p>
              <p className="text-[11px] text-muted-foreground">{perfil?.email}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={signOut} title="Cerrar sesion">
              <LogOut />
            </Button>
          </div>
        </div>

        {/* Navegacion en mobile: la fila de arriba se queda sin lugar */}
        <nav className="flex items-center gap-1 overflow-x-auto border-t border-border px-4 py-1.5 sm:hidden">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'shrink-0 rounded-md px-3 py-1.5 text-sm',
                  isActive
                    ? 'bg-accent font-medium text-accent-foreground'
                    : 'text-muted-foreground',
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        <Outlet />
      </main>
    </div>
  )
}
