import { pdfAPrimeraPaginaPng } from './pdf'

export const TIPOS_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
export const EXTENSIONES_PERMITIDAS = '.jpg,.jpeg,.png,.webp,.pdf'
const LIMITE_MB = 15

export function tipoPermitido(archivo: File): boolean {
  return TIPOS_PERMITIDOS.includes(archivo.type)
}

export function archivoDemasiadoGrande(archivo: File): boolean {
  return archivo.size > LIMITE_MB * 1024 * 1024
}

function leerComoDataUrl(archivo: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const lector = new FileReader()
    lector.onload = () => resolve(lector.result as string)
    lector.onerror = () => reject(new Error('No se pudo leer el archivo.'))
    lector.readAsDataURL(archivo)
  })
}

/**
 * Devuelve la imagen que se manda a la IA de vision (PNG en base64) y la que
 * se muestra en pantalla. Para PDF ambas son la primera pagina rasterizada;
 * el archivo ORIGINAL completo se sube a Storage aparte, sin pasar por aca.
 */
export async function prepararParaExtraccion(
  archivo: File,
): Promise<{ base64: string; mime: string; previewDataUrl: string }> {
  if (archivo.type === 'application/pdf') {
    const dataUrl = await pdfAPrimeraPaginaPng(archivo)
    return { base64: dataUrl.split(',')[1] ?? '', mime: 'image/png', previewDataUrl: dataUrl }
  }
  const dataUrl = await leerComoDataUrl(archivo)
  return { base64: dataUrl.split(',')[1] ?? '', mime: archivo.type, previewDataUrl: dataUrl }
}
