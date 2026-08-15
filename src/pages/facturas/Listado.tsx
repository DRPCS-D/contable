import { AlertTriangle, ArrowLeft, ChevronLeft, ChevronRight, Pencil, Plus, Receipt, Search, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { EditarFacturaModal } from '@/components/facturas/EditarFacturaModal'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Cargando, ErrorBox, Vacio } from '@/components/ui/estado'
import { Input, Select } from '@/components/ui/field'
import { ConfirmModal } from '@/components/ui/modal'
import { useContribuyente } from '@/hooks/useContribuyentes'
import { FILTROS_VACIOS, useFacturas, type FiltrosFacturas } from '@/hooks/useFacturas'
import { usePlanCuentas } from '@/hooks/usePlanCuentas'
import type { FacturaConRelaciones } from '@/lib/database.types'
import { formatFecha, formatMontoConMoneda } from '@/lib/format'

export default function FacturasListado() {
  const { id: contribuyenteId } = useParams<{ id: string }>()
  const { data: contribuyente, loading: cargandoContribuyente } = useContribuyente(contribuyenteId)
  const { data: planCuentas } = usePlanCuentas(contribuyenteId)

  const [filtros, setFiltros] = useState<FiltrosFacturas>(FILTROS_VACIOS)
  const [busquedaInput, setBusquedaInput] = useState('')
  const [pagina, setPagina] = useState(1)

  // Debounce de la busqueda: no pegarle a la base en cada tecla
  useEffect(() => {
    const t = setTimeout(() => {
      setFiltros((f) => ({ ...f, busqueda: busquedaInput }))
      setPagina(1)
    }, 350)
    return () => clearTimeout(t)
  }, [busquedaInput])

  const { data, total, paginas, loading, error, refetch, actualizar, eliminar } = useFacturas(
    contribuyenteId,
    filtros,
    pagina,
  )

  const [modalEditar, setModalEditar] = useState<FacturaConRelaciones | null>(null)
  const [modalEliminar, setModalEliminar] = useState<FacturaConRelaciones | null>(null)
  const [eliminando, setEliminando] = useState(false)

  function actualizarFiltro<K extends keyof FiltrosFacturas>(key: K, valor: FiltrosFacturas[K]) {
    setFiltros((f) => ({ ...f, [key]: valor }))
    setPagina(1)
  }

  const hayFiltrosActivos =
    filtros.tipoOperacion || filtros.planCuentaId || filtros.desde || filtros.hasta || filtros.busqueda

  if (cargandoContribuyente) return <Cargando />
  if (!contribuyente) return <ErrorBox mensaje="No se encontro el contribuyente." />

  return (
    <div>
      <Link
        to={`/contribuyentes/${contribuyente.id}`}
        className="mb-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" /> {contribuyente.razon_social}
      </Link>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Facturas</h1>
          <p className="text-sm text-muted-foreground">{total} en total</p>
        </div>
        <Link to={`/contribuyentes/${contribuyente.id}/facturas/cargar`}>
          <Button>
            <Plus /> Cargar facturas
          </Button>
        </Link>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar por N°, proveedor, cliente o RUC…"
            value={busquedaInput}
            onChange={(e) => setBusquedaInput(e.target.value)}
          />
        </div>
        <Select
          className="w-auto"
          value={filtros.tipoOperacion}
          onChange={(e) => actualizarFiltro('tipoOperacion', e.target.value as FiltrosFacturas['tipoOperacion'])}
        >
          <option value="">Compras y ventas</option>
          <option value="compra">Compras</option>
          <option value="venta">Ventas</option>
        </Select>
        <Select
          className="w-auto"
          value={filtros.planCuentaId}
          onChange={(e) => actualizarFiltro('planCuentaId', e.target.value)}
        >
          <option value="">Todas las categorias</option>
          {planCuentas.map((c) => (
            <option key={c.id} value={c.id}>
              {c.codigo} — {c.descripcion}
            </option>
          ))}
        </Select>
        <Input
          type="date"
          className="w-auto"
          value={filtros.desde}
          onChange={(e) => actualizarFiltro('desde', e.target.value)}
        />
        <Input
          type="date"
          className="w-auto"
          value={filtros.hasta}
          onChange={(e) => actualizarFiltro('hasta', e.target.value)}
        />
        {hayFiltrosActivos && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setFiltros(FILTROS_VACIOS)
              setBusquedaInput('')
              setPagina(1)
            }}
          >
            Limpiar filtros
          </Button>
        )}
      </div>

      {loading ? (
        <Cargando />
      ) : error ? (
        <ErrorBox mensaje={error} />
      ) : data.length === 0 ? (
        <Vacio
          icono={Receipt}
          titulo={hayFiltrosActivos ? 'Sin resultados' : 'Todavia no hay facturas'}
          descripcion={
            hayFiltrosActivos
              ? 'Probá con otros filtros.'
              : 'Cargá la primera factura de este contribuyente.'
          }
          accion={
            !hayFiltrosActivos && (
              <Link to={`/contribuyentes/${contribuyente.id}/facturas/cargar`}>
                <Button>
                  <Plus /> Cargar facturas
                </Button>
              </Link>
            )
          }
        />
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-border bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="px-4 py-2.5 font-medium">Fecha</th>
                  <th className="px-4 py-2.5 font-medium">N°</th>
                  <th className="px-4 py-2.5 font-medium">Tipo</th>
                  <th className="px-4 py-2.5 font-medium">Proveedor / Cliente</th>
                  <th className="px-4 py-2.5 font-medium">Categoria</th>
                  <th className="px-4 py-2.5 text-right font-medium">Total</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {data.map((f) => {
                  const totalCalc = f.exentas + f.gravado_5 + f.gravado_10
                  const noCierra = Math.abs(totalCalc - f.total) > 1
                  return (
                    <tr key={f.id} className="border-b border-border last:border-0 hover:bg-accent/40">
                      <td className="px-4 py-2.5 text-muted-foreground">{formatFecha(f.fecha_factura)}</td>
                      <td className="px-4 py-2.5 tabular text-foreground">{f.numero_factura || '—'}</td>
                      <td className="px-4 py-2.5">
                        <Badge tono={f.tipo_operacion === 'compra' ? 'primary' : 'success'}>
                          {f.tipo_operacion === 'compra' ? 'Compra' : 'Venta'}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5 text-foreground">
                        {(f.tipo_operacion === 'compra' ? f.proveedor_nombre : f.cliente_nombre) || '—'}
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">
                        {f.plan_cuentas ? `${f.plan_cuentas.codigo} — ${f.plan_cuentas.descripcion}` : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <span className="tabular font-medium text-foreground">
                          {formatMontoConMoneda(f.total, f.moneda)}
                        </span>
                        {noCierra && (
                          <AlertTriangle
                            className="ml-1.5 inline size-3.5 text-warning"
                            aria-label="El total no coincide con exentas + gravadas"
                          />
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => setModalEditar(f)}>
                            <Pencil className="size-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setModalEliminar(f)}>
                            <Trash2 className="size-4 text-destructive" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {paginas > 1 && (
            <div className="mt-4 flex items-center justify-center gap-3">
              <Button
                variant="outline"
                size="icon"
                disabled={pagina <= 1}
                onClick={() => setPagina((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft />
              </Button>
              <span className="text-xs text-muted-foreground">
                Pagina {pagina} de {paginas}
              </span>
              <Button
                variant="outline"
                size="icon"
                disabled={pagina >= paginas}
                onClick={() => setPagina((p) => Math.min(paginas, p + 1))}
              >
                <ChevronRight />
              </Button>
            </div>
          )}
        </>
      )}

      <EditarFacturaModal
        factura={modalEditar}
        planCuentas={planCuentas}
        onCerrar={() => setModalEditar(null)}
        onGuardado={() => {
          setModalEditar(null)
          refetch()
        }}
        actualizar={actualizar}
      />

      <ConfirmModal
        abierto={modalEliminar !== null}
        titulo="Eliminar factura"
        mensaje={
          <>
            Se va a eliminar la factura <strong>{modalEliminar?.numero_factura || 'sin numero'}</strong>
            {modalEliminar?.proveedor_nombre && <> de {modalEliminar.proveedor_nombre}</>}, junto con su archivo.
            Esta accion no se puede deshacer.
          </>
        }
        procesando={eliminando}
        onCancelar={() => setModalEliminar(null)}
        onConfirmar={async () => {
          if (!modalEliminar) return
          setEliminando(true)
          const { error: err } = await eliminar(modalEliminar)
          setEliminando(false)
          if (err) toast.error(err)
          else {
            toast.success('Factura eliminada')
            refetch()
          }
          setModalEliminar(null)
        }}
      />
    </div>
  )
}
