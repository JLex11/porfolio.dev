import { defineConfig } from 'astro/config'

import robotsTxt from 'astro-robots-txt'

import tailwindcss from '@tailwindcss/vite'

import vercel from '@astrojs/vercel'

// https://astro.build/config
export default defineConfig({
	integrations: [robotsTxt()],
	site: 'https://alexander-porfolio-dev.vercel.app/',
	i18n: {
		defaultLocale: 'es',
		locales: ['es', 'en'],
		redirectToDefaultLocale: false,
	},
	vite: {
		plugins: [tailwindcss()],
	},
	output: 'static',
	adapter: vercel(),
})
