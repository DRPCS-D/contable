import { ArrowLeft, KeyRound, Plus, Trash2, UserRound } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Cargando, ErrorBox, Vacio } from '@/components/ui/estado'
import { Field, Input, Select } from '@/components/ui/field'
import { ConfirmModal, Modal } from '@/components/ui/modal'
import { useEmpresas } from '@/hooks/useEmpresas'
import { useUsuarios } from '@/hooks/useUsuarios'
import type { Empresa, Usuario } from '@/lib/database.types'
import { formatFecha, formatRuc } from '@/lib/format'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

export default function EmpresaDetalle() {
  const { id } = useParams<{ id: string }>()
  const { actualizar: actualizarEmpresa } = useEmpresas()
  const {
    data: usuarios,
    loading: cargandoUsuarios,
    error: errorUsuarios,
    refetch: refetchUsuarios,
    crear,
    eliminar,
    cambiarPassword,
    setActivo,
  } = useUsuarios(id)

  const [empresa, setEmpresa] = useState<Empresa | null>(null)
  const [cargandoEmpresa, setCargandoEmpresa] = useState(true)

  const [modalUsuario, setModalUsuario] = useState(false)
  const [modalPassword, setModalPassword] = useState<Usuario | null>(null)
  const [modalEliminar, setModalEliminar] = useState<Usuario | null>(null)

  useEffect(() => {
    if (!id) return
    let cancelado = false
    setCargandoEmpresa(true)
    supabase
      .from('empresas')
      .select('*')
      .eq('id', id)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelado) {
          setEmpresa((data as Empresa) ?? null)
          setCargandoEmpresa(false)
        }
      })
    return () => {
      cancelado = true
    }
  }, [id])

  async function alternarActivoEmpresa() {
    if (!empresa) return
    const { error } = await actualizarEmpresa(empresa.id, { activo: !empresa.activo })
    if (error) {
      toast.error('No se pudo actualizar el estudio.')
      return
    }
    setEmpresa({ ...empresa, activo: !empresa.activo })
    toast.success(empresa.activo ? 'Estudio desactivado' : 'Estudio activado')
  }

  if (cargandoEmpresa) return <Cargando />
  if (!empresa) return <ErrorBox mensaje="No se encontro el estudio." />

  return (
    <div>
      <Link
        to="/admindrpcs"
        className="mb-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" /> Estudios
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold text-foreground">{empresa.nombre}</h1>
            <Badge tono={empresa.activo ? 'success' : 'neutral'}>
              {empresa.activo ? 'Activo' : 'Inactivo'}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            RUC {formatRuc(empresa.ruc)} · Creado {formatFecha(empresa.created_at)}
          </p>
        </div>
        <Button variant="outline" onClick={alternarActivoEmpresa}>
          {empresa.activo ? 'Desactivar estudio' : 'Activar estudio'}
        </Button>
      </div>

      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Usuarios</h2>
        <Button size="sm" onClick={() => setModalUsuario(true)}>
          <Plus /> Nuevo usuario
        </Button>
      </div>

      {cargandoUsuarios ? (
        <Cargando />
      ) : errorUsuarios ? (
        <ErrorBox mensaje={errorUsuarios} />
      ) : usuarios.length === 0 ? (
        <Vacio
          icono={UserRound}
          titulo="Este estudio no tiene usuarios"
          descripcion="Crea el primer usuario para que puedan entrar a la app."
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="px-4 py-2.5 font-medium">Nombre</th>
                <th className="px-4 py-2.5 font-medium">Email</th>
                <th className="px-4 py-2.5 font-medium">Rol</th>
                <th className="px-4 py-2.5 font-medium">Estado</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u) => (
                <tr key={u.id} className="border-b border-border last:border-0 hover:bg-accent/40">
                  <td className="px-4 py-2.5 font-medium text-foreground">{u.nombre}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{u.email}</td>
                  <td className="px-4 py-2.5 capitalize text-muted-foreground">{u.rol}</td>
                  <td className="px-4 py-2.5">
                    <button
                      onClick={async () => {
                        const { error } = await setActivo(u.id, !u.activo)
                        if (error) toast.error('No se pudo actualizar.')
                        else {
                          toast.success(u.activo ? 'Usuario desactivado' : 'Usuario activado')
                          refetchUsuarios()
                        }
                      }}
                    >
                      <Badge tono={u.activo ? 'success' : 'neutral'}>
                        {u.activo ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </button>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Cambiar contrasena"
                        onClick={() => setModalPassword(u)}
                      >
                        <KeyRound className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Eliminar"
                        onClick={() => setModalEliminar(u)}
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <NuevoUsuarioModal
        abierto={modalUsuario}
        empresaId={empresa.id}
        onCerrar={() => setModalUsuario(false)}
        onCreado={() => {
          setModalUsuario(false)
          refetchUsuarios()
        }}
        crear={crear}
      />

      <CambiarPasswordModal
        usuario={modalPassword}
        onCerrar={() => setModalPassword(null)}
        cambiarPassword={cambiarPassword}
      />

      <ConfirmModal
        abierto={modalEliminar !== null}
        titulo="Eliminar usuario"
        mensaje={
          <>
            Se va a eliminar a <strong>{modalEliminar?.nombre}</strong> ({modalEliminar?.email}).
            Esta accion no se puede deshacer.
          </>
        }
        onCancelar={() => setModalEliminar(null)}
        onConfirmar={async () => {
          if (!modalEliminar) return
          const { error } = await eliminar(modalEliminar.id)
          if (error) toast.error(error)
          else {
            toast.success('Usuario eliminado')
            refetchUsuarios()
          }
          setModalEliminar(null)
        }}
      />
    </div>
  )
}

function NuevoUsuarioModal({
  abierto,
  empresaId,
  onCerrar,
  onCreado,
  crear,
}: {
  abierto: boolean
  empresaId: string
  onCerrar: () => void
  onCreado: () => void
  crear: ReturnType<typeof useUsuarios>['crear']
}) {
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rol, setRol] = useState<'admin' | 'usuario'>('usuario')
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    if (abierto) {
      setNombre('')
      setEmail('')
      setPassword('')
      setRol('usuario')
      setError(null)
    }
  }, [abierto])

  async function onGuardar() {
    if (!nombre.trim() || !email.trim() || !password) {
      setError('Completa todos los campos.')
      return
    }
    setGuardando(true)
    setError(null)
    const { error: err } = await crear({
      empresa_id: empresaId,
      nombre: nombre.trim(),
      email: email.trim(),
      password,
      rol,
    })
    setGuardando(false)
    if (err) setError(err)
    else {
      toast.success('Usuario creado')
      onCreado()
    }
  }

  return (
    <Modal
      abierto={abierto}
      titulo="Nuevo usuario"
      onCerrar={onCerrar}
      footer={
        <>
          <Button variant="outline" onClick={onCerrar} disabled={guardando}>
            Cancelar
          </Button>
          <Button onClick={onGuardar} disabled={guardando}>
            {guardando ? 'Creando…' : 'Crear usuario'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Nombre *">
          <Input value={nombre} onChange={(e) => setNombre(e.target.value)} autoFocus />
        </Field>
        <Field label="Email *">
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Contrasena *" hint="Minimo 8 caracteres">
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        <Field label="Rol">
          <Select value={rol} onChange={(e) => setRol(e.target.value as 'admin' | 'usuario')}>
            <option value="usuario">Usuario</option>
            <option value="admin">Admin</option>
          </Select>
        </Field>
        {error && <ErrorBox mensaje={error} />}
      </div>
    </Modal>
  )
}

function CambiarPasswordModal({
  usuario,
  onCerrar,
  cambiarPassword,
}: {
  usuario: Usuario | null
  onCerrar: () => void
  cambiarPassword: ReturnType<typeof useUsuarios>['cambiarPassword']
}) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    setPassword('')
    setError(null)
  }, [usuario])

  async function onGuardar() {
    if (!usuario) return
    if (password.length < 8) {
      setError('Minimo 8 caracteres.')
      return
    }
    setGuardando(true)
    const { error: err } = await cambiarPassword(usuario.id, password)
    setGuardando(false)
    if (err) setError(err)
    else {
      toast.success('Contrasena actualizada')
      onCerrar()
    }
  }

  return (
    <Modal
      abierto={usuario !== null}
      titulo={`Cambiar contrasena — ${usuario?.nombre ?? ''}`}
      onCerrar={onCerrar}
      ancho="max-w-sm"
      footer={
        <>
          <Button variant="outline" onClick={onCerrar} disabled={guardando}>
            Cancelar
          </Button>
          <Button onClick={onGuardar} disabled={guardando}>
            {guardando ? 'Guardando…' : 'Cambiar'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Nueva contrasena" hint="Minimo 8 caracteres">
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
          />
        </Field>
        {error && <ErrorBox mensaje={error} />}
      </div>
    </Modal>
  )
}
