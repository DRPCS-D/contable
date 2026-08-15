import { useLayoutEffect, useRef, useState, type ChangeEvent, type InputHTMLAttributes } from 'react'
import { formatearMontoEnVivo } from '@/lib/format'
import { Input } from './field'

interface PosicionLogica {
  /** true si el cursor esta despues de la coma decimal. */
  enDecimal: boolean
  /** digitos antes del cursor, contados desde el inicio de la parte entera o desde la coma, segun corresponda. */
  digitos: number
}

/**
 * Analiza el cursor en terminos de "cuantos digitos hay antes, y de que
 * lado de la coma decimal" en vez de solo contar digitos en general. Hace
 * falta esta distincion porque, apenas se teclea la coma, no hay ningun
 * digito decimal despues todavia -- si solo contaramos digitos totales, el
 * cursor quedaria mal ubicado ANTES de la coma en vez de despues.
 */
function analizarPosicion(texto: string, pos: number): PosicionLogica {
  const antes = texto.slice(0, pos)
  const idxComa = antes.indexOf(',')
  if (idxComa === -1) {
    return { enDecimal: false, digitos: (antes.match(/\d/g) ?? []).length }
  }
  const parteDecimalAntes = antes.slice(idxComa + 1)
  return { enDecimal: true, digitos: (parteDecimalAntes.match(/\d/g) ?? []).length }
}

/** Inverso de analizarPosicion: ubica el indice de cursor para una posicion logica dada. */
function ubicarCursor(textoFormateado: string, posicion: PosicionLogica): number {
  const idxComa = textoFormateado.indexOf(',')

  if (!posicion.enDecimal) {
    const limite = idxComa === -1 ? textoFormateado.length : idxComa
    if (posicion.digitos <= 0) return 0
    let contados = 0
    for (let i = 0; i < limite; i++) {
      if (textoFormateado[i] >= '0' && textoFormateado[i] <= '9') {
        contados++
        if (contados === posicion.digitos) return i + 1
      }
    }
    return limite
  }

  // enDecimal: el cursor va despues de la coma + N digitos decimales.
  if (idxComa === -1) return textoFormateado.length
  if (posicion.digitos <= 0) return idxComa + 1
  let contados = 0
  for (let i = idxComa + 1; i < textoFormateado.length; i++) {
    if (textoFormateado[i] >= '0' && textoFormateado[i] <= '9') {
      contados++
      if (contados === posicion.digitos) return i + 1
    }
  }
  return textoFormateado.length
}

/**
 * Input de montos con separador de miles EN VIVO, mientras se tipea (no solo
 * al perder el foco). Reformatear en cada tecla moveria el cursor al final
 * si no se corrige a mano: se registra la posicion "logica" del cursor
 * (cuantos digitos antes, de que lado de la coma decimal) en el texto viejo,
 * y se reubica en la posicion equivalente del texto ya reformateado.
 *
 * El valor que se manda por onChange ya viene con los puntos de miles --
 * parseMonto() en format.ts los entiende igual que a un numero pelado, asi
 * que no hace falta "desformatear" nada al guardar.
 */
export function MontoInput({
  value,
  onChange,
  moneda = 'PYG',
  className,
  ...props
}: {
  value: string
  onChange: (value: string) => void
  moneda?: string
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [cursorPendiente, setCursorPendiente] = useState<number | null>(null)

  useLayoutEffect(() => {
    if (cursorPendiente === null || !inputRef.current) return
    inputRef.current.setSelectionRange(cursorPendiente, cursorPendiente)
    setCursorPendiente(null)
  }, [cursorPendiente])

  function onChangeInterno(e: ChangeEvent<HTMLInputElement>) {
    const textoNuevo = e.target.value
    const cursorNuevo = e.target.selectionStart ?? textoNuevo.length
    const posicion = analizarPosicion(textoNuevo, cursorNuevo)

    const formateado = formatearMontoEnVivo(textoNuevo, moneda)

    setCursorPendiente(ubicarCursor(formateado, posicion))
    onChange(formateado)
  }

  return (
    <Input
      {...props}
      ref={inputRef}
      inputMode="decimal"
      value={value}
      className={className}
      onChange={onChangeInterno}
    />
  )
}
