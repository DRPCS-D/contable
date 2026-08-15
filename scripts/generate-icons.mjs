// Genera los PNG de iconos a partir del logo SVG. Se corre a mano cuando
// el logo cambia (no es parte del build normal); usa `sharp` como
// dependencia de un solo uso, sin agregarla a package.json.
import sharp from 'sharp'
import { mkdirSync, writeFileSync } from 'node:fs'

const PRIMARY = '#1659b5'
const FOLD = '#c9dbf5'

// glyph: documento con esquina doblada + check. Coordenadas pensadas para
// un viewBox de 100x100, con margen suficiente para el "safe zone" de los
// iconos maskable (contenido dentro del 80% central).
const GLYPH = `
  <path d="M32,18 L54,18 L66,30 L66,74 A6,6 0 0 1 60,80 L32,80 A6,6 0 0 1 26,74 L26,24 A6,6 0 0 1 32,18 Z" fill="#ffffff"/>
  <path d="M54,18 L66,30 L54,30 Z" fill="${FOLD}"/>
  <rect x="34" y="40" width="24" height="4.5" rx="2.25" fill="${PRIMARY}" opacity="0.16"/>
  <rect x="34" y="50" width="24" height="4.5" rx="2.25" fill="${PRIMARY}" opacity="0.16"/>
  <rect x="34" y="60" width="16" height="4.5" rx="2.25" fill="${PRIMARY}" opacity="0.16"/>
  <circle cx="68" cy="70" r="15" fill="${PRIMARY}" stroke="#ffffff" stroke-width="5"/>
  <path d="M60,70 L66,76 L77,61" fill="none" stroke="#ffffff" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round"/>
`.trim()

function svg({ rounded }) {
  const bg = rounded
    ? `<rect width="100" height="100" rx="22" fill="${PRIMARY}"/>`
    : `<rect width="100" height="100" fill="${PRIMARY}"/>`
  return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">${bg}${GLYPH}</svg>`
}

const SVG_ROUNDED = svg({ rounded: true })
const SVG_SQUARE = svg({ rounded: false })

mkdirSync('public/icons', { recursive: true })

writeFileSync('public/logo.svg', SVG_ROUNDED)
writeFileSync('public/favicon.svg', SVG_ROUNDED)

const trabajos = [
  { svg: SVG_ROUNDED, size: 32, out: 'public/favicon-32.png' },
  { svg: SVG_ROUNDED, size: 180, out: 'public/icons/apple-touch-icon.png' },
  { svg: SVG_ROUNDED, size: 192, out: 'public/icons/icon-192.png' },
  { svg: SVG_ROUNDED, size: 512, out: 'public/icons/icon-512.png' },
  { svg: SVG_SQUARE, size: 512, out: 'public/icons/icon-512-maskable.png' },
]

for (const t of trabajos) {
  await sharp(Buffer.from(t.svg)).resize(t.size, t.size).png().toFile(t.out)
  console.log('OK', t.out)
}
