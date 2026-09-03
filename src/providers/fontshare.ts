import type { FontMetrics, FontStyles, ResolveFontOptions } from '../types'

import { hash } from 'ohash'
import { extractFontFaceData } from '../css/parse'
import { cleanFontFaces, defineFontProvider, prepareWeights } from '../utils'

const BASE_URL = 'https://api.fontshare.com/v2'

// every family fontshare serves is drawn on a 1000-unit em, and its API reports metrics in
// font units without saying so
const UNITS_PER_EM = 1000

function getMetrics(style: FontshareFontStyle): FontMetrics | undefined {
  const properties = style.properties
  if (!properties) {
    return
  }
  const metrics: FontMetrics = { unitsPerEm: UNITS_PER_EM }
  // `y_min`/`y_max` are glyph bounds rather than vertical metrics, and `descending_leading` does
  // not match the font's descender, so the descender is not reported
  if (properties.ascending_leading != null) {
    metrics.ascent = properties.ascending_leading
  }
  if (properties.cap_height != null) {
    metrics.capHeight = properties.cap_height
  }
  if (properties.x_height != null) {
    metrics.xHeight = properties.x_height
  }
  return metrics
}

function getFallbacks(category: string): string[] | undefined {
  if (category.includes('Serif'))
    return ['serif']
  if (category.includes('Sans'))
    return ['sans-serif']
  return undefined
}

export default defineFontProvider('fontshare', async (_options, ctx) => {
  const fontshareFamilies = new Set<string>()

  const fonts = await ctx.storage.getItem('fontshare:meta.json', async () => {
    const fonts: FontshareFontMeta[] = []
    let offset = 0
    let chunk
    do {
      chunk = await ctx.fetch(`${BASE_URL}/fonts?offset=${offset}&limit=100`).then(res => res.json() as Promise<{ fonts: FontshareFontMeta[], has_more: boolean }>)
      fonts.push(...chunk.fonts)
      offset++
    } while (chunk.has_more)
    return fonts
  })

  for (const font of fonts) {
    fontshareFamilies.add(font.name)
  }

  async function getFontDetails(font: FontshareFontMeta, options: ResolveFontOptions) {
    const numbers: number[] = []

    let axis
    const hasVariable = font.styles.some(e => e.is_variable)
    if (hasVariable) {
      axis = font.axes.find(e => e.property === 'wght')
    }

    const staticWeights = font.styles.filter(s => !s.is_variable).map(s => String(s.weight.weight))
    const axisRange = axis ? `${axis.range_left} ${axis.range_right}` : undefined

    const weights = new Set<string>()
    for (const { weight, variable } of prepareWeights({
      inputWeights: options.weights,
      hasVariableWeights: hasVariable && !!axis,
      weights: staticWeights,
    })) {
      if (!variable) {
        weights.add(weight)
        continue
      }
      const [min, max] = weight.split(' ').map(Number) as [number, number]
      // fontshare serves the variable file as-is, so it can only satisfy a range
      // that covers the whole axis; narrower ranges resolve to static weights
      if (axis && min <= axis.range_left && max >= axis.range_right) {
        weights.add(axisRange!)
        continue
      }
      for (const staticWeight of staticWeights) {
        if (Number(staticWeight) >= min && Number(staticWeight) <= max) {
          weights.add(staticWeight)
        }
      }
    }

    for (const style of font.styles) {
      if (style.is_italic && !options.styles.includes('italic')) {
        continue
      }
      if (!style.is_italic && !options.styles.includes('normal')) {
        continue
      }
      if (style.is_variable && (!axisRange || !weights.has(axisRange))) {
        continue
      }
      if (!style.is_variable && !weights.has(String(style.weight.weight))) {
        continue
      }
      numbers.push(style.weight.number)
    }

    if (numbers.length === 0)
      return []

    const css = await ctx.fetch(`${BASE_URL}/css?f[]=${font.slug}@${numbers.join(',')}`).then(res => res.text())

    const fontFaces = extractFontFaceData(css)
    for (const face of fontFaces) {
      for (const source of face.src) {
        // fontshare serves protocol-relative URLs, which are only resolvable from within a
        // stylesheet loaded over http(s)
        if ('url' in source && source.url.startsWith('//')) {
          source.url = `https:${source.url}`
        }
      }
    }

    const faces = cleanFontFaces(fontFaces, options.formats)

    for (const face of faces) {
      const isItalic = face.style === 'italic'
      const isVariable = Array.isArray(face.weight)
      const style = font.styles.find(style => !!style.is_italic === isItalic
        && (isVariable
          ? style.is_variable
          : !style.is_variable && String(style.weight.weight) === String(face.weight)))
      const metrics = style && getMetrics(style)
      if (metrics) {
        face.metrics = metrics
      }
    }

    return faces
  }

  return {
    listFonts() {
      return [...fontshareFamilies]
    },
    getFontProperties(fontFamily) {
      if (!fontshareFamilies.has(fontFamily))
        return
      const font = fonts.find(f => f.name === fontFamily)!
      const styles = new Set<FontStyles>(['normal'])
      const weights = new Set<string>()
      for (const style of font.styles) {
        if (style.is_italic) {
          styles.add('italic')
        }
        if (style.is_variable) {
          const axis = font.axes.find(e => e.property === 'wght')
          if (axis) {
            weights.add(`${axis.range_left} ${axis.range_right}`)
          }
        }
        else {
          weights.add(style.weight.weight.toString())
        }
      }
      const metrics = getMetrics(font.styles.find(style => style.default) ?? font.styles[0]!)

      return {
        formats: ['woff2', 'woff', 'ttf'],
        styles: [...styles],
        weights: [...weights],
        ...(metrics ? { metrics } : {}),
      }
    },
    async resolveFont(fontFamily, defaults) {
      if (!fontshareFamilies.has(fontFamily)) {
        return
      }

      // https://api.fontshare.com/v2/css?f[]=alpino@300
      const font = fonts.find(f => f.name === fontFamily)!

      return {
        fonts: await ctx.storage.getItem(`fontshare:${fontFamily}-${hash(defaults)}-data.json`, () => getFontDetails(font, defaults)),
        fallbacks: getFallbacks(font.category),
      }
    },
  }
})

/** internal */

interface FontshareFontStyle {
  default: boolean
  file: string
  id: string
  is_italic: boolean
  is_variable: boolean
  properties: {
    ascending_leading: number
    body_height: null
    cap_height: number
    descending_leading: number
    max_char_width: number
    x_height: number
    y_max: number
    y_min: number
  }
  weight: {
    label: string
    name: string
    native_name: null
    number: number
    weight: number
  }
}

interface FontshareFontMeta {
  slug: string
  name: string
  category: string
  styles: FontshareFontStyle[]
  axes: Array<{
    name: string
    property: 'wght' | 'ital' | 'opsz'
    range_default: number
    range_left: number
    range_right: number
  }>
}
