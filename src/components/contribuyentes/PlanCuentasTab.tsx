import { FileSpreadsheet, Plus, Trash2, Upload } from 'lucide-react'
import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Cargando, ErrorBox, Vacio } from '@/components/ui/estado'
import { Field, Input } from '@/components/ui/field'
import { ConfirmModal, Modal } from '@/components/ui/modal'
import { usePlanCuentas } from '@/hooks/usePlanCuentas'
import type { PlanCuenta } from '@/lib/database.types'
import { parseCsv } from '@/lib/csv'

export function PlanCuentasTab({
  contribuyenteId,
  empresaId,
}: {
  contribuyenteId: string
  empresaId: string
}) {
  const { data, loading, error, refetch, crear, crearVarias, actualizar, eliminar } =
    usePlanCuentas(contribuyenteId)

  const [modalCuenta, setModalCuenta] = useState<PlanCuenta | 'nueva' | null>(null)
  const [modalEliminar, setModalEliminar] = useState<PlanCuenta | null>(null)
  const inputArchivo = useRef<HTMLInputElement>(null)
  const [importando, setImportando] = useState(false)

  async function onImportarCsv(e: ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0]
    e.target.value = ''
    if (!archivo) return

    setImportando(true)
    try {
      const texto = await archivo.text()
      const filas = parseCsv(texto)
      // Si la primera fila parece encabezado ("codigo", "descripcion"), se descarta
      const primera = filas[0]?.map((v) => v.trim().toLowerCase())
      const tieneEncabezado = primera?.[0] === 'codigo' || primera?.[0] === 'código'
      const filasDatos = tieneEncabezado ? filas.slice(1) : filas

      const nuevas = filasDatos
        .map((f) => ({
          empresa_id: empresaId,
          contribuyente_id: contribuyenteId,
          codigo: (f[0] ?? '').trim(),
          descripcion: (f[1] ?? '').trim(),
          activo: true,
        }))
        .filter((f) => f.codigo && f.descripcion)

      if (nuevas.length === 0) {
        toast.error('El archivo no tiene filas validas (se espera codigo,descripcion).')
        return
      }

      const existentes = new Set(data.map((c) => c.codigo))
      const aInsertar = nuevas.filter((n) => !existentes.has(n.codigo))
      const repetidas = nuevas.length - aInsertar.length

      const { insertadas, error: err } = await crearVarias(aInsertar)
      if (err) {
        toast.error(err)
        return
      }
      toast.success(
        `${insertadas} ${insertadas === 1 ? 'cuenta importada' : 'cuentas importadas'}` +
          (repetidas > 0 ? ` (${repetidas} ya existian y se omitieron)` : ''),
      )
      refetch()
    } catch {
      toast.error('No se pudo leer el archivo.')
    } finally {
      setImportando(false)
    }
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          Categorias para clasificar las facturas de este contribuyente.
        </p>
        <div className="flex gap-2">
          <input
            ref={inputArchivo}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={onImportarCsv}
          />
          <Button variant="outline" size="sm" onClick={() => inputArchivo.current?.click()} disabled={importando}>
            <Upload /> {importando ? 'Importando…' : 'Importar CSV'}
          </Button>
          <Button size="sm" onClick={() => setModalCuenta('nueva')}>
            <Plus /> Nueva cuenta
          </Button>
        </div>
      </div>

      {loading ? (
        <Cargando />
      ) : error ? (
        <ErrorBox mensaje={error} />
      ) : data.length === 0 ? (
        <Vacio
          icono={FileSpreadsheet}
          titulo="Sin plan de cuentas"
          descripcion="Agrega cuentas una por una o importa un CSV con columnas codigo,descripcion."
          accion={
            <Button size="sm" onClick={() => setModalCuenta('nueva')}>
              <Plus /> Nueva cuenta
            </Button>
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="px-4 py-2.5 font-medium">Codigo</th>
                <th className="px-4 py-2.5 font-medium">Descripcion</th>
                <th className="px-4 py-2.5 font-medium">Estado</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {data.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => setModalCuenta(c)}
                  className="cursor-pointer border-b border-border last:border-0 hover:bg-accent/40"
                >
                  <td className="px-4 py-2.5 tabular font-medium text-foreground">{c.codigo}</td>
                  <td className="px-4 py-2.5 text-foreground">{c.descripcion}</td>
                  <td className="px-4 py-2.5">
                    <button
                      onClick={async (e) => {
                        e.stopPropagation()
                        const { error: err } = await actualizar(c.id, { activo: !c.activo })
                        if (err) toast.error(err)
                        else refetch()
                      }}
                    >
                      <Badge tono={c.activo ? 'success' : 'neutral'}>
                        {c.activo ? 'Activa' : 'Inactiva'}
                      </Badge>
                    </button>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex justify-end">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation()
                          setModalEliminar(c)
                        }}
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

      <CuentaModal
        cuenta={modalCuenta}
        empresaId={empresaId}
        contribuyenteId={contribuyenteId}
        onCerrar={() => setModalCuenta(null)}
        crear={crear}
        actualizar={actualizar}
        onGuardado={() => {
          setModalCuenta(null)
          refetch()
        }}
      />

      <ConfirmModal
        abierto={modalEliminar !== null}
        titulo="Eliminar cuenta"
        mensaje={
          <>
            Se va a eliminar <strong>{modalEliminar?.codigo} — {modalEliminar?.descripcion}</strong>.
            Las facturas que la usaban quedan sin categorizar.
          </>
        }
        onCancelar={() => setModalEliminar(null)}
        onConfirmar={async () => {
          if (!modalEliminar) return
          const { error: err } = await eliminar(modalEliminar.id)
          if (err) toast.error(err)
          else {
            toast.success('Cuenta eliminada')
            refetch()
          }
          setModalEliminar(null)
        }}
      />
    </div>
  )
}

function CuentaModal({
  cuenta,
  empresaId,
  contribuyenteId,
  onCerrar,
  crear,
  actualizar,
  onGuardado,
}: {
  cuenta: PlanCuenta | 'nueva' | null
  empresaId: string
  contribuyenteId: string
  onCerrar: () => void
  crear: ReturnType<typeof usePlanCuentas>['crear']
  actualizar: ReturnType<typeof usePlanCuentas>['actualizar']
  onGuardado: () => void
}) {
  const editando = cuenta && cuenta !== 'nueva' ? cuenta : null
  const [codigo, setCodigo] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    setCodigo(editando?.codigo ?? '')
    setDescripcion(editando?.descripcion ?? '')
    setError(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cuenta])

  async function onGuardar() {
    if (!codigo.trim() || !descripcion.trim()) {
      setError('Completa codigo y descripcion.')
      return
    }
    setGuardando(true)
    setError(null)
    const resultado = editando
      ? await actualizar(editando.id, { codigo: codigo.trim(), descripcion: descripcion.trim() })
      : await crear({
          empresa_id: empresaId,
          contribuyente_id: contribuyenteId,
          codigo: codigo.trim(),
          descripcion: descripcion.trim(),
          activo: true,
        })
    setGuardando(false)
    if (resultado.error) {
      setError(resultado.error)
      return
    }
    toast.success(editando ? 'Cuenta actualizada' : 'Cuenta creada')
    onGuardado()
  }

  return (
    <Modal
      abierto={cuenta !== null}
      titulo={editando ? 'Editar cuenta' : 'Nueva cuenta'}
      onCerrar={onCerrar}
      ancho="max-w-sm"
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
        <Field label="Codigo *">
          <Input value={codigo} onChange={(e) => setCodigo(e.target.value)} autoFocus />
        </Field>
        <Field label="Descripcion *">
          <Input value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
        </Field>
        {error && <ErrorBox mensaje={error} />}
      </div>
    </Modal>
  )
}
