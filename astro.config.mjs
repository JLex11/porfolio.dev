import compressor from 'astro-compressor'
import { defineConfig } from 'astro/config'

import robotsTxt from 'astro-robots-txt'

import tailwindcss from '@tailwindcss/vite'

import vercel from '@astrojs/vercel';

// https://astro.build/config
export default defineConfig({
  integrations: [robotsTxt(), compressor({ brotli: true })],
  site: 'https://alexander-porfolio-dev.vercel.app/',

  i18n: {
      defaultLocale: 'es',
      locales: ['es', 'en'],
  },

  vite: {
    plugins: [tailwindcss()],
  },

  adapter: vercel(),
})