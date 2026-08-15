import { ArrowLeft, Plus, Receipt } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Cargando, ErrorBox, Vacio } from '@/components/ui/estado'
import { useContribuyente } from '@/hooks/useContribuyentes'
import type { Factura } from '@/lib/database.types'
import { formatFecha, formatMontoConMoneda } from '@/lib/format'
import { supabase } from '@/lib/supabase'

/**
 * Listado minimo para confirmar que la carga con IA funciona de punta a
 * punta. Filtros, edicion, paginacion y borrado con limpieza de Storage se
 * completan en el siguiente paso.
 */
export default function FacturasListado() {
  const { id: contribuyenteId } = useParams<{ id: string }>()
  const { data: contribuyente, loading: cargandoContribuyente } = useContribuyente(contribuyenteId)
  const [facturas, setFacturas] = useState<Factura[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!contribuyenteId) return
    let cancelado = false
    setLoading(true)
    supabase
      .from('facturas')
      .select('*')
      .eq('contribuyente_id', contribuyenteId)
      .order('fecha_factura', { ascending: false })
      .then(({ data, error: err }) => {
        if (cancelado) return
        setFacturas((data as Factura[]) ?? [])
        setError(err ? 'No se pudieron cargar las facturas.' : null)
        setLoading(false)
      })
    return () => {
      cancelado = true
    }
  }, [contribuyenteId])

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
        <h1 className="text-lg font-semibold text-foreground">Facturas</h1>
        <Link to={`/contribuyentes/${contribuyente.id}/facturas/cargar`}>
          <Button>
            <Plus /> Cargar facturas
          </Button>
        </Link>
      </div>

      {loading ? (
        <Cargando />
      ) : error ? (
        <ErrorBox mensaje={error} />
      ) : facturas.length === 0 ? (
        <Vacio
          icono={Receipt}
          titulo="Todavia no hay facturas"
          descripcion="Cargá la primera factura de este contribuyente."
          accion={
            <Link to={`/contribuyentes/${contribuyente.id}/facturas/cargar`}>
              <Button>
                <Plus /> Cargar facturas
              </Button>
            </Link>
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="px-4 py-2.5 font-medium">Fecha</th>
                <th className="px-4 py-2.5 font-medium">N°</th>
                <th className="px-4 py-2.5 font-medium">Tipo</th>
                <th className="px-4 py-2.5 font-medium">Proveedor / Cliente</th>
                <th className="px-4 py-2.5 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {facturas.map((f) => (
                <tr key={f.id} className="border-b border-border last:border-0 hover:bg-accent/40">
                  <td className="px-4 py-2.5 text-muted-foreground">{formatFecha(f.fecha_factura)}</td>
                  <td className="px-4 py-2.5 tabular text-foreground">{f.numero_factura || '—'}</td>
                  <td className="px-4 py-2.5 capitalize text-muted-foreground">{f.tipo_operacion}</td>
                  <td className="px-4 py-2.5 text-foreground">
                    {f.tipo_operacion === 'compra' ? f.proveedor_nombre : f.cliente_nombre || '—'}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular font-medium text-foreground">
                    {formatMontoConMoneda(f.total, f.moneda)}
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
