// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';
import svelte from '@astrojs/svelte';
import react from '@astrojs/react';
import { fileURLToPath } from 'node:url';

// https://astro.build/config
export default defineConfig({
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url))
      }
    }
  },

  integrations: [svelte(), react()]
});