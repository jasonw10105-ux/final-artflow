// Color utilities: hex/rgb conversion, simple LAB distance, and nearest name mapping

export type Rgb = { r: number; g: number; b: number }

export function clamp(value: number, min = 0, max = 255): number {
  return Math.max(min, Math.min(max, value))
}

export function hexToRgb(hex: string): Rgb {
  const h = hex.replace('#', '')
  const bigint = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16)
  const r = (bigint >> 16) & 255
  const g = (bigint >> 8) & 255
  const b = bigint & 255
  return { r, g, b }
}

export function rgbToHex({ r, g, b }: Rgb): string {
  const toHex = (v: number) => clamp(Math.round(v)).toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toLowerCase()
}

// sRGB -> XYZ -> Lab
function pivotRgb(n: number): number {
  const c = n / 255
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
}

function rgbToXyz({ r, g, b }: Rgb): { x: number; y: number; z: number } {
  const R = pivotRgb(r)
  const G = pivotRgb(g)
  const B = pivotRgb(b)
  // D65
  const x = R * 0.4124 + G * 0.3576 + B * 0.1805
  const y = R * 0.2126 + G * 0.7152 + B * 0.0722
  const z = R * 0.0193 + G * 0.1192 + B * 0.9505
  return { x, y, z }
}

function xyzToLab({ x, y, z }: { x: number; y: number; z: number }): { l: number; a: number; b: number } {
  // D65, Observer=2°
  const refX = 0.95047
  const refY = 1.0
  const refZ = 1.08883

  const fx = f(x / refX)
  const fy = f(y / refY)
  const fz = f(z / refZ)

  return {
    l: 116 * fy - 16,
    a: 500 * (fx - fy),
    b: 200 * (fy - fz),
  }

  function f(t: number): number {
    return t > 0.008856 ? Math.pow(t, 1 / 3) : 7.787 * t + 16 / 116
  }
}

export function rgbToLab(rgb: Rgb): { l: number; a: number; b: number } {
  return xyzToLab(rgbToXyz(rgb))
}

export function deltaE(lab1: { l: number; a: number; b: number }, lab2: { l: number; a: number; b: number }): number {
  // CIE76
  const dl = lab1.l - lab2.l
  const da = lab1.a - lab2.a
  const db = lab1.b - lab2.b
  return Math.sqrt(dl * dl + da * da + db * db)
}

// Minimal named color set optimized for UX naming in art contexts
export const NAMED_COLORS: { name: string; hex: string }[] = [
  { name: 'black', hex: '#000000' },
  { name: 'white', hex: '#ffffff' },
  { name: 'gray', hex: '#808080' },
  { name: 'warm gray', hex: '#a89f91' },
  { name: 'cool gray', hex: '#8da1b9' },
  { name: 'red', hex: '#e53935' },
  { name: 'crimson', hex: '#b71c1c' },
  { name: 'orange', hex: '#fb8c00' },
  { name: 'amber', hex: '#ffb300' },
  { name: 'yellow', hex: '#fdd835' },
  { name: 'olive', hex: '#808000' },
  { name: 'green', hex: '#43a047' },
  { name: 'emerald', hex: '#2ecc71' },
  { name: 'teal', hex: '#009688' },
  { name: 'cyan', hex: '#00bcd4' },
  { name: 'sky', hex: '#81d4fa' },
  { name: 'blue', hex: '#1e88e5' },
  { name: 'indigo', hex: '#3949ab' },
  { name: 'violet', hex: '#8e24aa' },
  { name: 'magenta', hex: '#d81b60' },
  { name: 'brown', hex: '#795548' },
  { name: 'beige', hex: '#f5f5dc' },
  { name: 'cream', hex: '#fffdd0' },
]

const NAMED_COLOR_LABS = NAMED_COLORS.map(c => ({ ...c, lab: rgbToLab(hexToRgb(c.hex)) }))

export function nearestNamedColor(hex: string): { name: string; hex: string; distance: number } {
  const lab = rgbToLab(hexToRgb(hex))
  let best = NAMED_COLOR_LABS[0]
  let bestD = Number.POSITIVE_INFINITY
  for (const c of NAMED_COLOR_LABS) {
    const d = deltaE(lab, c.lab)
    if (d < bestD) { best = c; bestD = d }
  }
  return { name: best.name, hex: best.hex, distance: bestD }
}

export function namePalette(hexes: string[]): { name: string; hex: string; distance: number }[] {
  const unique = Array.from(new Set((hexes || []).filter(Boolean).map(h => h.toLowerCase())))
  return unique.map(h => nearestNamedColor(h))
}

export function groupByColorFamily(hexes: string[]): string[] {
  const names = namePalette(hexes).map(n => n.name)
  const familyMap: Record<string, string[]> = {
    warm: ['red', 'crimson', 'orange', 'amber', 'yellow', 'brown', 'beige', 'cream'],
    cool: ['blue', 'sky', 'cyan', 'teal', 'green', 'indigo', 'violet'],
    neutral: ['black', 'white', 'gray', 'warm gray', 'cool gray'],
  }
  const families = new Set<string>()
  for (const name of names) {
    for (const [family, list] of Object.entries(familyMap)) {
      if (list.includes(name)) families.add(family)
    }
  }
  return Array.from(families)
}

