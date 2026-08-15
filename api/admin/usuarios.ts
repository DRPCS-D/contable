import { clienteAdmin, exigeSuperAdmin } from '../_lib/auth.js'
import { conManejoDeErrores, error, exigeMetodo, leerBody, type ApiHandler } from '../_lib/http.js'

/**
 * Operaciones de usuarios que NO se pueden hacer desde el navegador porque
 * necesitan la service_role key: crear una cuenta de Auth, borrarla,
 * cambiarle la contrasena o el email de login.
 *
 * Todo lo demas (listar usuarios, activar/desactivar) lo hace el cliente
 * directo contra PostgREST, protegido por la RLS.
 */

const ROLES_PERMITIDOS = ['admin', 'usuario'] as const
const LARGO_MINIMO_PASSWORD = 8

interface Body {
  accion?: 'crear' | 'editar' | 'eliminar' | 'password'
  id?: string
  empresa_id?: string
  nombre?: string
  email?: string
  password?: string
  rol?: string
}

const handler: ApiHandler = async (req, res) => {
  if (!exigeMetodo(req, res, 'POST')) return

  const actor = await exigeSuperAdmin(req, res)
  if (!actor) return

  const body = leerBody<Body>(req)
  const admin = clienteAdmin()

  switch (body.accion) {
    // ─────────────────────────────────────────────────────────
    case 'crear': {
      const nombre = body.nombre?.trim()
      const email = body.email?.trim().toLowerCase()
      const password = body.password ?? ''
      const rol = body.rol ?? 'usuario'

      if (!nombre) return error(res, 400, 'Falta el nombre.')
      if (!email) return error(res, 400, 'Falta el email.')
      if (!body.empresa_id) return error(res, 400, 'Falta el estudio.')
      if (password.length < LARGO_MINIMO_PASSWORD) {
        return error(res, 400, `La contrasena necesita al menos ${LARGO_MINIMO_PASSWORD} caracteres.`)
      }
      // El super_admin no se crea desde la app: se da de alta a mano en la base
      if (!ROLES_PERMITIDOS.includes(rol as (typeof ROLES_PERMITIDOS)[number])) {
        return error(res, 400, 'Rol invalido.')
      }

      const { data: creado, error: errCrear } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      })

      if (errCrear || !creado.user) {
        const yaExiste = /already|registered|exists/i.test(errCrear?.message ?? '')
        return error(
          res,
          yaExiste ? 409 : 400,
          yaExiste ? 'Ya existe un usuario con ese email.' : 'No se pudo crear el usuario.',
        )
      }

      const { error: errPerfil } = await admin.from('usuarios').insert({
        id: creado.user.id,
        empresa_id: body.empresa_id,
        nombre,
        email,
        rol,
      })

      if (errPerfil) {
        // Sin esto queda una cuenta de Auth huerfana que bloquea el email
        await admin.auth.admin.deleteUser(creado.user.id)
        return error(res, 400, 'No se pudo crear el perfil del usuario.')
      }

      res.status(200).json({ ok: true, id: creado.user.id })
      return
    }

    // ─────────────────────────────────────────────────────────
    case 'editar': {
      if (!body.id) return error(res, 400, 'Falta el usuario.')

      const nombre = body.nombre?.trim()
      const email = body.email?.trim().toLowerCase()
      const rol = body.rol ?? 'usuario'

      if (!nombre) return error(res, 400, 'Falta el nombre.')
      if (!email) return error(res, 400, 'Falta el email.')
      if (!ROLES_PERMITIDOS.includes(rol as (typeof ROLES_PERMITIDOS)[number])) {
        return error(res, 400, 'Rol invalido.')
      }

      const { data: objetivo } = await admin
        .from('usuarios')
        .select('email, rol')
        .eq('id', body.id)
        .maybeSingle()

      if (!objetivo) return error(res, 404, 'Usuario no encontrado.')
      if (objetivo.rol === 'super_admin') {
        return error(res, 403, 'No se puede editar a un super administrador desde la app.')
      }

      // El email de login vive en Auth, no en `usuarios`: si cambio, hay que
      // actualizarlo ahi tambien o el usuario quedaria mostrando un email
      // con el que en realidad no puede iniciar sesion.
      if (email !== objetivo.email) {
        const { error: errEmail } = await admin.auth.admin.updateUserById(body.id, {
          email,
          email_confirm: true,
        })
        if (errEmail) {
          const yaExiste = /already|registered|exists/i.test(errEmail.message)
          return error(
            res,
            yaExiste ? 409 : 400,
            yaExiste ? 'Ya existe un usuario con ese email.' : 'No se pudo cambiar el email.',
          )
        }
      }

      const { error: errPerfil } = await admin
        .from('usuarios')
        .update({ nombre, email, rol })
        .eq('id', body.id)

      if (errPerfil) return error(res, 400, 'No se pudo guardar el usuario.')

      res.status(200).json({ ok: true })
      return
    }

    // ─────────────────────────────────────────────────────────
    case 'eliminar': {
      if (!body.id) return error(res, 400, 'Falta el usuario.')
      if (body.id === actor.id) return error(res, 400, 'No podes eliminar tu propia cuenta.')

      const { data: objetivo } = await admin
        .from('usuarios')
        .select('rol')
        .eq('id', body.id)
        .maybeSingle()

      if (objetivo?.rol === 'super_admin') {
        return error(res, 403, 'No se puede eliminar a un super administrador desde la app.')
      }

      // Borrar de auth.users arrastra la fila de usuarios por el on delete cascade
      const { error: errBorrar } = await admin.auth.admin.deleteUser(body.id)
      if (errBorrar) return error(res, 400, 'No se pudo eliminar el usuario.')

      res.status(200).json({ ok: true })
      return
    }

    // ─────────────────────────────────────────────────────────
    case 'password': {
      if (!body.id) return error(res, 400, 'Falta el usuario.')
      const password = body.password ?? ''
      if (password.length < LARGO_MINIMO_PASSWORD) {
        return error(res, 400, `La contrasena necesita al menos ${LARGO_MINIMO_PASSWORD} caracteres.`)
      }

      const { error: errUpd } = await admin.auth.admin.updateUserById(body.id, { password })
      if (errUpd) return error(res, 400, 'No se pudo cambiar la contrasena.')

      res.status(200).json({ ok: true })
      return
    }

    default:
      return error(res, 400, 'Accion desconocida.')
  }
}

export default conManejoDeErrores(handler)
