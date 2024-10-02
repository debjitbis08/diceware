import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import alpinejs from '@astrojs/alpinejs';
import AstroPWA from '@vite-pwa/astro';

// https://astro.build/config
export default defineConfig({
  integrations: [
    tailwind(),
    alpinejs(),
    AstroPWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Diceware',
        short_name: 'Diceware',
        theme_color: '#ffffff',
      },
      includeAssets: ['dice-black.svg', 'dice-white.svg'],
      pwaAssets: {
        config: true,
      },
    })
  ],
  output: 'static'
});
