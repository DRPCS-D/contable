import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { ErrorBox } from '@/components/ui/estado'
import { Field, Input, Select } from '@/components/ui/field'
import { Modal } from '@/components/ui/modal'
import { useAuth } from '@/hooks/useAuth'
import { useContribuyentes } from '@/hooks/useContribuyentes'
import { REGIMENES, type Contribuyente, type ContribuyenteInsert } from '@/lib/database.types'
import { rucSospechoso } from '@/lib/format'

const VACIO: Omit<ContribuyenteInsert, 'empresa_id'> = {
  ruc: '',
  razon_social: '',
  nombre_fantasia: null,
  tipo_persona: 'juridica',
  direccion: null,
  ciudad: null,
  telefono: null,
  email: null,
  regimen: null,
  activo: true,
}

export function ContribuyenteFormModal({
  abierto,
  contribuyente,
  onCerrar,
  onGuardado,
}: {
  abierto: boolean
  /** Si viene, el modal edita; si no, crea. */
  contribuyente?: Contribuyente | null
  onCerrar: () => void
  onGuardado: () => void
}) {
  const { empresa } = useAuth()
  const { crear, actualizar } = useContribuyentes()

  const [form, setForm] = useState(VACIO)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!abierto) return
    setError(null)
    setForm(
      contribuyente
        ? {
            ruc: contribuyente.ruc,
            razon_social: contribuyente.razon_social,
            nombre_fantasia: contribuyente.nombre_fantasia,
            tipo_persona: contribuyente.tipo_persona,
            direccion: contribuyente.direccion,
            ciudad: contribuyente.ciudad,
            telefono: contribuyente.telefono,
            email: contribuyente.email,
            regimen: contribuyente.regimen,
            activo: contribuyente.activo,
          }
        : VACIO,
    )
  }, [abierto, contribuyente])

  const rucAdvertencia = form.ruc && rucSospechoso(form.ruc) ? 'El digito verificador no parece cerrar. Revisalo antes de guardar.' : undefined

  async function onGuardar() {
    if (!form.ruc.trim()) return setError('El RUC es obligatorio.')
    if (!form.razon_social.trim()) return setError('La razon social es obligatoria.')
    if (!empresa && !contribuyente) return setError('No se pudo determinar el estudio.')

    setGuardando(true)
    setError(null)

    const payload = {
      ...form,
      ruc: form.ruc.trim(),
      razon_social: form.razon_social.trim(),
      nombre_fantasia: form.nombre_fantasia?.trim() || null,
      direccion: form.direccion?.trim() || null,
      ciudad: form.ciudad?.trim() || null,
      telefono: form.telefono?.trim() || null,
      email: form.email?.trim() || null,
      regimen: form.regimen || null,
    }

    const resultado = contribuyente
      ? await actualizar(contribuyente.id, payload)
      : await crear({ ...payload, empresa_id: empresa!.id })

    setGuardando(false)
    if (resultado.error) {
      setError(resultado.error)
      return
    }
    toast.success(contribuyente ? 'Contribuyente actualizado' : 'Contribuyente creado')
    onGuardado()
  }

  return (
    <Modal
      abierto={abierto}
      titulo={contribuyente ? 'Editar contribuyente' : 'Nuevo contribuyente'}
      onCerrar={onCerrar}
      ancho="max-w-xl"
      footer={
        <>
          <Button variant="outline" onClick={onCerrar} disabled={guardando}>
            Cancelar
          </Button>
          <Button onClick={onGuardar} disabled={guardando}>
            {guardando ? 'Guardando…' : 'Guardar'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="RUC *" warning={rucAdvertencia}>
            <Input
              value={form.ruc}
              onChange={(e) => setForm((f) => ({ ...f, ruc: e.target.value }))}
              placeholder="80012345-6"
              autoFocus
            />
          </Field>
          <Field label="Tipo de persona">
            <Select
              value={form.tipo_persona}
              onChange={(e) =>
                setForm((f) => ({ ...f, tipo_persona: e.target.value as 'fisica' | 'juridica' }))
              }
            >
              <option value="juridica">Juridica</option>
              <option value="fisica">Fisica</option>
            </Select>
          </Field>
        </div>

        <Field label="Razon social *">
          <Input
            value={form.razon_social}
            onChange={(e) => setForm((f) => ({ ...f, razon_social: e.target.value }))}
          />
        </Field>

        <Field label="Nombre de fantasia">
          <Input
            value={form.nombre_fantasia ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, nombre_fantasia: e.target.value }))}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Direccion">
            <Input
              value={form.direccion ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, direccion: e.target.value }))}
            />
          </Field>
          <Field label="Ciudad">
            <Input
              value={form.ciudad ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, ciudad: e.target.value }))}
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Telefono">
            <Input
              value={form.telefono ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, telefono: e.target.value }))}
            />
          </Field>
          <Field label="Email">
            <Input
              type="email"
              value={form.email ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
          </Field>
        </div>

        <Field label="Regimen">
          <Select
            value={form.regimen ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, regimen: e.target.value || null }))}
          >
            <option value="">Sin especificar</option>
            {REGIMENES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </Select>
        </Field>

        {error && <ErrorBox mensaje={error} />}
      </div>
    </Modal>
  )
}
