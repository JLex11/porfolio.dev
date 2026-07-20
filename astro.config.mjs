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
        build: {
            // Lightning CSS folds animation-timeline into an unsupported shorthand.
            cssMinify: 'esbuild',
        },
    },
    output: 'server',
    adapter: vercel({
		isr: true,
	}),
})
