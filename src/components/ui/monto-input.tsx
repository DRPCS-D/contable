import { useState, type InputHTMLAttributes } from 'react'
import { formatMonto } from '@/lib/format'
import { Input } from './field'

/**
 * Input para montos: mientras se edita muestra el numero tal cual (para no
 * pelear con el cursor insertando puntos de miles mientras se tipea), y al
 * perder el foco lo formatea con separador de miles. El valor que se manda
 * por onChange es siempre el texto crudo que escribio el usuario -- el
 * formateo es solo de presentacion, parseMonto() sigue siendo quien decide
 * el numero real al guardar.
 *
 * Se formatea en base al `value` actual en cada render (no solo cuando el
 * usuario tipea), asi que un campo que llego con datos de la extraccion por
 * IA y nunca se toco tambien se ve con puntos de miles desde el vamos.
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
  const [enfocado, setEnfocado] = useState(false)

  const mostrado = enfocado || !value.trim() ? value : formatMonto(value, moneda)

  return (
    <Input
      {...props}
      inputMode="decimal"
      value={mostrado}
      className={className}
      onFocus={(e) => {
        setEnfocado(true)
        props.onFocus?.(e)
      }}
      onBlur={(e) => {
        setEnfocado(false)
        props.onBlur?.(e)
      }}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}
