export interface NpmFont {
  /** As the site lists it. A stylesheet declaring one family answers to any name. */
  family: string
  package: string
  /** As the package publishes it, which is not always the licence of the fonts inside. */
  licence: string
  /** For packages whose CSS is not where the provider looks by default. */
  file?: string
  note: string
}

/**
 * Families the `npm` provider can resolve and the others cannot. It has no `listFonts()` of its
 * own, so this list is what the site lists it as carrying. `scripts/check-npm-fonts.mjs` checks it.
 */
export const NPM_FONTS: NpmFont[] = [
  {
    family: 'Cal Sans',
    package: 'cal-sans',
    licence: 'OFL-1.1',
    note: 'A display face published to npm and nowhere else.',
  },
  {
    family: 'Hack',
    package: 'hack-font',
    licence: 'MIT',
    file: 'build/web/hack.css',
    note: 'The canonical web build of Hack, which no font CDN carries.',
  },
  {
    family: 'Fira Code',
    package: 'firacode',
    licence: 'OFL-1.1',
    file: 'distr/fira_code.css',
    note: 'Upstream Fira Code, including the ligature build.',
  },
  {
    family: 'JetBrains Mono',
    package: 'jetbrains-mono',
    licence: 'MIT',
    file: 'css/jetbrains-mono.css',
    note: 'The full weight and italic range, wider than the Google Fonts cut.',
  },
  {
    family: 'IBM Plex Sans',
    package: '@ibm/plex-sans',
    licence: 'OFL-1.1',
    note: 'IBM publishes a package per family; the monolithic `@ibm/plex` is too large for a CDN to serve.',
  },
  {
    family: 'IBM Plex Serif',
    package: '@ibm/plex-serif',
    licence: 'OFL-1.1',
    note: 'The serif companion, on the same per-family split.',
  },
  {
    family: 'IBM Plex Mono',
    package: '@ibm/plex-mono',
    licence: 'OFL-1.1',
    note: 'The monospace companion, on the same per-family split.',
  },
  {
    family: 'IBM Plex Sans Condensed',
    package: '@ibm/plex-sans-condensed',
    licence: 'OFL-1.1',
    note: 'A width the font CDNs do not carry at all.',
  },
  {
    family: 'Inter',
    package: 'inter-ui',
    licence: 'OFL-1.1',
    note: 'Upstream Inter, which runs ahead of the copy on the font CDNs.',
  },
  {
    family: 'Public Sans',
    package: 'public-sans',
    licence: 'OFL-1.1',
    file: 'public-sans.css',
    note: 'The US Web Design System face, published by its maintainers.',
  },
  {
    family: 'CMU Serif',
    package: 'computer-modern',
    licence: 'MIT',
    note: 'Knuth’s Computer Modern, behind a stylesheet that is nothing but `@import`s.',
  },
  {
    family: 'LXGW WenKai',
    package: 'lxgw-wenkai-webfont',
    licence: 'MIT',
    file: 'lxgwwenkai-regular.css',
    note: 'A CJK face in 97 subset files. Worth seeing before you hand-write a `@font-face` block.',
  },
  {
    family: 'LXGW WenKai Mono',
    package: 'lxgw-wenkai-webfont',
    licence: 'MIT',
    file: 'lxgwwenkaimono-regular.css',
    note: 'The fixed-width cut, from the same package under a different stylesheet.',
  },
  {
    family: 'LXGW WenKai TC',
    package: 'lxgw-wenkai-tc-webfont',
    licence: 'MIT',
    file: 'style.css',
    note: 'Traditional Chinese, in 291 subset files.',
  },
  {
    family: 'Material Symbols Outlined',
    package: 'material-symbols',
    licence: 'Apache-2.0',
    file: 'outlined.css',
    note: 'Google’s own npm build, separate from the `googleicons` provider.',
  },
  {
    family: 'Material Icons',
    package: 'material-icons',
    licence: 'Apache-2.0',
    file: 'iconfont/material-icons.css',
    note: 'The set Material Symbols replaced, still shipped for existing code.',
  },
  {
    family: 'Material Design Icons',
    package: '@mdi/font',
    licence: 'Apache-2.0',
    file: 'css/materialdesignicons.css',
    note: 'The community set, unrelated to Google’s.',
  },
  {
    family: 'Tabler Icons',
    package: '@tabler/icons-webfont',
    licence: 'MIT',
    file: 'dist/tabler-icons.css',
    note: 'An icon font, so npm is the only distribution there is.',
  },
  {
    family: 'Bootstrap Icons',
    package: 'bootstrap-icons',
    licence: 'MIT',
    file: 'font/bootstrap-icons.css',
    note: 'Ships one face per stylesheet, named for the package rather than a family.',
  },
  {
    family: 'Font Awesome 7 Free',
    package: '@fortawesome/fontawesome-free',
    licence: 'CC-BY-4.0 AND OFL-1.1 AND MIT',
    file: 'css/all.css',
    note: 'One stylesheet declaring four families, so the name here picks which one resolves.',
  },
  {
    family: 'Line Awesome Free',
    package: 'line-awesome',
    licence: 'MIT',
    file: 'dist/line-awesome/css/line-awesome.css',
    note: 'Also declares a brands family from the same stylesheet.',
  },
  {
    family: 'Remix Icon',
    package: 'remixicon',
    licence: 'Apache-2.0',
    note: 'A single variable-free icon face.',
    file: 'fonts/remixicon.css',
  },
  {
    family: 'Boxicons',
    package: 'boxicons',
    licence: 'CC-BY-4.0 OR OFL-1.1 OR MIT',
    file: 'css/boxicons.css',
    note: 'Triple-licensed, so check which one you are taking it under.',
  },
  {
    family: 'Phosphor',
    package: '@phosphor-icons/web',
    licence: 'MIT',
    file: 'src/regular/style.css',
    note: 'One stylesheet per weight; this is the regular cut.',
  },
  {
    family: 'Simple Icons',
    package: 'simple-icons-font',
    licence: 'CC0-1.0',
    file: 'font/simple-icons.css',
    note: 'Brand marks, released into the public domain.',
  },
  {
    family: 'Eva Icons',
    package: 'eva-icons',
    licence: 'MIT',
    file: 'style/eva-icons.css',
    note: 'An icon font with no CDN distribution of its own.',
  },
  {
    family: 'Typicons',
    package: 'typicons.font',
    licence: 'CC-BY-SA-3.0 AND OFL-1.1',
    file: 'src/font/typicons.css',
    note: 'Share-alike, which is unusual for an icon font.',
  },
]

export function npmFontFor(family: string): NpmFont | undefined {
  return NPM_FONTS.find(font => font.family.toLowerCase() === family.toLowerCase())
}

/** The `options.npm` a caller needs to resolve the family themselves. */
export function npmFamilyOptions(font: NpmFont) {
  return [`package: '${font.package}'`, font.file && `file: '${font.file}'`].filter(Boolean).join(', ')
}
