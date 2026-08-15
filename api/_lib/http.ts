/**
 * Tipos y helpers minimos para las funciones serverless.
 *
 * Se definen a mano en vez de usar @vercel/node porque ese paquete arrastra
 * mas de cien dependencias solo para aportar dos interfaces.
 */

export interface ApiRequest {
  method?: string
  url?: string
  headers: Record<string, string | string[] | undefined>
  body?: unknown
}

export interface ApiResponse {
  status: (code: number) => ApiResponse
  json: (body: unknown) => void
  setHeader: (nombre: string, valor: string) => void
  end: (body?: string) => void
}

export type ApiHandler = (req: ApiRequest, res: ApiResponse) => Promise<void> | void

export function error(res: ApiResponse, code: number, mensaje: string): void {
  res.status(code).json({ error: mensaje })
}

/** Vercel ya parsea el body con Content-Type json, pero no siempre. */
export function leerBody<T = Record<string, unknown>>(req: ApiRequest): T {
  if (!req.body) return {} as T
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body) as T
    } catch {
      return {} as T
    }
  }
  return req.body as T
}

/** Corta si el metodo no es el esperado. Devuelve false si ya respondio. */
export function exigeMetodo(req: ApiRequest, res: ApiResponse, metodo: string): boolean {
  if (req.method !== metodo) {
    error(res, 405, `Metodo no permitido. Se esperaba ${metodo}.`)
    return false
  }
  return true
}
