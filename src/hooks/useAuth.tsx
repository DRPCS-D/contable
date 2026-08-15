import type { Session, User } from '@supabase/supabase-js'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { Empresa, Usuario } from '@/lib/database.types'
import { supabase } from '@/lib/supabase'

interface AuthState {
  session: Session | null
  user: User | null
  /** Fila de `usuarios`: de aca salen empresa_id y rol. */
  perfil: Usuario | null
  empresa: Empresa | null
  loading: boolean
  esSuperAdmin: boolean
  /**
   * Hay sesion valida pero la fila de `usuarios` no existe o esta inactiva.
   * Pasa cuando se creo el usuario en el dashboard de Supabase y nadie
   * corrio el alta correspondiente. Sin esto, la pantalla queda en blanco.
   */
  problemaPerfil: 'sin-perfil' | 'inactivo' | null
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  refrescarPerfil: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [perfil, setPerfil] = useState<Usuario | null>(null)
  const [empresa, setEmpresa] = useState<Empresa | null>(null)
  const [problemaPerfil, setProblemaPerfil] = useState<AuthState['problemaPerfil']>(null)
  const [loading, setLoading] = useState(true)

  // Evita que una carga de perfil vieja pise a una nueva al cambiar de sesion
  const cargaActual = useRef(0)

  const cargarPerfil = useCallback(async (userId: string | undefined) => {
    const token = ++cargaActual.current

    if (!userId) {
      setPerfil(null)
      setEmpresa(null)
      setProblemaPerfil(null)
      return
    }

    const { data: fila, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('id', userId)
      .maybeSingle()

    if (token !== cargaActual.current) return

    if (error || !fila) {
      setPerfil(null)
      setEmpresa(null)
      setProblemaPerfil('sin-perfil')
      return
    }

    const usuario = fila as Usuario
    if (!usuario.activo) {
      setPerfil(usuario)
      setEmpresa(null)
      setProblemaPerfil('inactivo')
      return
    }

    setPerfil(usuario)
    setProblemaPerfil(null)

    if (usuario.empresa_id) {
      const { data: emp } = await supabase
        .from('empresas')
        .select('*')
        .eq('id', usuario.empresa_id)
        .maybeSingle()
      if (token === cargaActual.current) setEmpresa((emp as Empresa) ?? null)
    } else {
      setEmpresa(null)
    }
  }, [])

  useEffect(() => {
    let vivo = true

    supabase.auth.getSession().then(async ({ data }) => {
      if (!vivo) return
      setSession(data.session)
      await cargarPerfil(data.session?.user?.id)
      if (vivo) setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (evento, nuevaSesion) => {
      if (!vivo) return
      setSession(nuevaSesion)

      // El refresco de token no cambia quien sos: no hace falta recargar el perfil
      if (evento === 'TOKEN_REFRESHED' || evento === 'USER_UPDATED') return

      setLoading(true)
      await cargarPerfil(nuevaSesion?.user?.id)
      if (vivo) setLoading(false)
    })

    return () => {
      vivo = false
      subscription.unsubscribe()
    }
  }, [cargarPerfil])

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })
    // No se expone el mensaje crudo de Supabase: filtra si el email existe o no
    if (error) {
      const esCredencial = /invalid login|credentials/i.test(error.message)
      return {
        error: esCredencial
          ? 'Email o contrasena incorrectos.'
          : 'No se pudo iniciar sesion. Intentalo de nuevo.',
      }
    }
    return { error: null }
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    setPerfil(null)
    setEmpresa(null)
    setProblemaPerfil(null)
  }, [])

  const refrescarPerfil = useCallback(async () => {
    const { data } = await supabase.auth.getSession()
    await cargarPerfil(data.session?.user?.id)
  }, [cargarPerfil])

  const valor = useMemo<AuthState>(
    () => ({
      session,
      user: session?.user ?? null,
      perfil,
      empresa,
      loading,
      esSuperAdmin: perfil?.rol === 'super_admin',
      problemaPerfil,
      signIn,
      signOut,
      refrescarPerfil,
    }),
    [session, perfil, empresa, loading, problemaPerfil, signIn, signOut, refrescarPerfil],
  )

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth tiene que usarse dentro de <AuthProvider>')
  return ctx
}
