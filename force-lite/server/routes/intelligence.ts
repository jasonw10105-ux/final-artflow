import { Router } from 'express'
import { namePalette, groupByColorFamily } from '../../src/services/color'

const router = Router()

// POST /api/intelligence/palette/names
router.post('/intelligence/palette/names', async (req, res, next) => {
  try {
    const chunks: Buffer[] = []
    for await (const ch of req) chunks.push(ch)
    const body = JSON.parse(Buffer.concat(chunks).toString('utf-8')) as { colors?: string[] }
    const colors = Array.isArray(body.colors) ? body.colors : []
    const named = namePalette(colors)
    const families = groupByColorFamily(colors)
    res.json({ named, families })
  } catch (e) { next(e) }
})

// POST /api/intelligence/type-artwork
// Heuristic smart item typing using text and optional palette
router.post('/intelligence/type-artwork', async (req, res, next) => {
  try {
    const chunks: Buffer[] = []
    for await (const ch of req) chunks.push(ch)
    const body = JSON.parse(Buffer.concat(chunks).toString('utf-8')) as {
      title?: string; description?: string; medium?: string; keywords?: string[]; colors?: string[]
    }
    const text = [body.title, body.description, body.medium, ...(body.keywords || [])].filter(Boolean).join(' ').toLowerCase()

    const rules: { label: string; patterns: RegExp[] }[] = [
      { label: 'abstract', patterns: [/abstract/, /non-?objective/, /gestural/, /color field/] },
      { label: 'figurative', patterns: [/portrait|figure|figurative|human|body|face|self-portrait/] },
      { label: 'landscape', patterns: [/landscape|seascape|mountain|valley|coast|skyline|forest|field|river|ocean/] },
      { label: 'still life', patterns: [/still life|flowers|vase|fruit|bowl|tabletop|object/ ] },
      { label: 'minimal', patterns: [/minimal|reductive|monochrome|geometric simplicity|clean/ ] },
      { label: 'surreal', patterns: [/surreal|dream|fantasy|impossible|dali|magritte/] },
      { label: 'street', patterns: [/street art|graffiti|stencil|urban|murals?/] },
    ]

    const matchedGenres = rules.filter(r => r.patterns.some(p => p.test(text))).map(r => r.label)

    const mediumRules: { label: string; patterns: RegExp[] }[] = [
      { label: 'oil on canvas', patterns: [/oil(\s+on)?\s+canvas/] },
      { label: 'acrylic on canvas', patterns: [/acrylic(\s+on)?\s+canvas/] },
      { label: 'watercolor', patterns: [/watercolor|watercolour/] },
      { label: 'photography', patterns: [/photograph|photo|c-print|inkjet print|gelatin silver/] },
      { label: 'sculpture', patterns: [/bronze|marble|stone|wood|steel|ceramic|resin|sculpt/ ] },
      { label: 'mixed media', patterns: [/mixed media|collage|assemblage/] },
      { label: 'print', patterns: [/etching|lithograph|screenprint|linocut|woodcut|monotype|gicl[eé]/] },
      { label: 'digital', patterns: [/digital|ai|nft|generative|plotter|algorithmic|code|video/] },
    ]
    const matchedMediums = mediumRules.filter(r => r.patterns.some(p => p.test(text))).map(r => r.label)

    const colorFamilies = groupByColorFamily(body.colors || [])
    const paletteNames = namePalette(body.colors || []).map(n => n.name)

    // subjects
    const subjects: string[] = []
    if (/portrait|face|self-portrait/.test(text)) subjects.push('portrait')
    if (/animal|bird|cat|dog|horse|wildlife/.test(text)) subjects.push('animal')
    if (/flower|botanical|plant|bloom/.test(text)) subjects.push('botanical')
    if (/architecture|building|city|urban/.test(text)) subjects.push('architecture')

    // vibes/moods inferred from palette
    const moods: string[] = []
    if (colorFamilies.includes('cool')) moods.push('calming')
    if (colorFamilies.includes('warm')) moods.push('vibrant')
    if (paletteNames.includes('black') || paletteNames.includes('gray')) moods.push('minimal')

    const result = {
      inferred_genres: Array.from(new Set(matchedGenres)),
      inferred_mediums: Array.from(new Set(matchedMediums)),
      inferred_subjects: Array.from(new Set(subjects)),
      color_families: colorFamilies,
      color_names: paletteNames,
      suggested_keywords: Array.from(new Set([...paletteNames, ...moods, ...matchedGenres, ...matchedMediums, ...subjects])),
    }

    res.json(result)
  } catch (e) { next(e) }
})

export default router

