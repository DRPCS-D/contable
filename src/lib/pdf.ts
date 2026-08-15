import * as pdfjsLib from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl

/**
 * Rasteriza la primera pagina de un PDF a un data URL PNG, para mandarla a
 * la IA de vision (que no lee PDFs). El archivo ORIGINAL se sube a Storage
 * tal cual, asi que un PDF de varias paginas no pierde informacion: solo se
 * analiza la primera con la IA.
 */
export async function pdfAPrimeraPaginaPng(archivo: File): Promise<string> {
  const buffer = await archivo.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise
  const pagina = await pdf.getPage(1)

  const escala = 2.0
  const viewport = pagina.getViewport({ scale: escala })

  const canvas = document.createElement('canvas')
  canvas.width = viewport.width
  canvas.height = viewport.height
  const contexto = canvas.getContext('2d')
  if (!contexto) throw new Error('No se pudo preparar el canvas para el PDF.')

  await pagina.render({ canvasContext: contexto, viewport, canvas }).promise
  return canvas.toDataURL('image/png')
}
