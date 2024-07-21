import tailwind from '@astrojs/tailwind'
import Biome from '@playform/format'
import compressor from 'astro-compressor'
import { defineConfig } from 'astro/config'

import robotsTxt from 'astro-robots-txt'

// https://astro.build/config
export default defineConfig({
	integrations: [
		tailwind(),
		robotsTxt(),
		Biome(),
		compressor({ brotli: true }),
	],
	site: 'https://alexander-porfolio-dev.vercel.app/',
	i18n: {
		defaultLocale: 'es',
		locales: ['es', 'en'],
	},
})
