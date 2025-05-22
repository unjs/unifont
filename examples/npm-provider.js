// Example of using npm provider
import { createUnifont, providers } from 'unifont'

// Create Unifont instance
async function main() {
  // Method 1: Using only npm provider
  const unifontNpmOnly = await createUnifont([
    providers.npm({
      // Optional: Explicitly specify packages to check, if not specified it will automatically scan all @fontsource/* packages
      packages: ['@fontsource/roboto', '@fontsource/open-sans'],
    }),
  ])

  // List available fonts
  const npmFonts = await unifontNpmOnly.listFonts()
  console.warn('Locally available fonts:', npmFonts)

  // Resolve font from local npm package
  const roboto = await unifontNpmOnly.resolveFont('Roboto')
  console.warn(`Found ${roboto.fonts.length} Roboto font variants`)

  // Method 2: Combine npm provider with other providers, prioritizing local fonts
  const unifontCombined = await createUnifont(
    [
      providers.npm(), // Auto-detect installed font packages
      providers.google(), // If not found locally, get from Google Fonts
      providers.bunny(), // If not found on Google Fonts, try Bunny Fonts
    ],
    { preferLocal: true }, // Enable priority for local option
  )

  // Try to resolve font, will prioritize from local npm packages
  const lato = await unifontCombined.resolveFont('Lato')
  console.warn(
    `Lato font resolved by ${lato.provider} provider, found ${lato.fonts.length} variants`,
  )
}

main().catch(console.error)
