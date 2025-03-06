import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  vite: {
    plugins: [
      tailwindcss()
    ]
  },
  css: ['~/assets/css/tailwind.css'],
  // Development
  devtools: { enabled: true },
  // PostCSS configuration
  postcss: {
    plugins: {
      'tailwindcss/nesting': {},
      '@tailwindcss/postcss': {},
      autoprefixer: {},
    }
  },
  runtimeConfig: {
    // Private keys are only available on the server
    supabaseServiceKey: process.env.SUPABASE_SERVICE_KEY,
    
    // Public keys that are exposed to the client
    public: {
      supabaseUrl: process.env.NUXT_PUBLIC_SUPABASE_URL,
      supabaseKey: process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY,
      NETLIFY_IDENTITY_URL: process.env.NETLIFY_IDENTITY_URL,
      NETLIFY_SITE_ID: process.env.NETLIFY_SITE_ID,
      SITE_URL: process.env.SITE_URL
    }
  },
  nitro: {
    devProxy: {
      '/.netlify/identity': {
        target: process.env.NETLIFY_IDENTITY_URL || 'http://localhost:9999/.netlify/identity',
        changeOrigin: true
      }
    }
  },
  app: {
    head: {
      htmlAttrs: {
        lang: 'en'
      },
      viewport: 'width=device-width, initial-scale=1.0',
      title: 'Beatbox - A curated collection of music production tools.',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'Beatbox - A curated collection of music production tools and resources.' },
        { name: 'format-detection', content: 'telephone=no' },
        { name: 'theme-color', content: '#000000' },
        
        // Open Graph / Facebook
        { property: 'og:type', content: 'website' },
        { property: 'og:title', content: 'Beatbox' },
        { property: 'og:description', content: 'A curated collection of music production tools and resources.' },
        { property: 'og:site_name', content: 'Beatbox' },
        { property: 'og:image', content: 'https://beatbox.studio/img/og-image.jpg' },
        { property: 'og:image:width', content: '1200' },
        { property: 'og:image:height', content: '630' },
        { property: 'og:image:alt', content: 'Beatbox - A curated collection of music production tools' },
        { property: 'og:url', content: 'https://beatbox.studio' },
        
        // Twitter
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:title', content: 'Beatbox' },
        { name: 'twitter:description', content: 'A curated collection of music production tools and resources.' },
        { name: 'twitter:image', content: 'https://beatbox.studio/img/og-image.jpg' },
        { name: 'twitter:image:alt', content: 'Beatbox - A curated collection of music production tools' },
        { name: 'twitter:site', content: '@beatboxstudio' }
      ],
      link: [
        // Canonical URL
        { rel: 'canonical', href: 'https://beatbox.studio' },
        
        // Favicons
        { rel: 'icon', type: 'image/png', href: '/favicons/favicon-96x96.png', sizes: '96x96' },
        { rel: 'icon', type: 'image/svg+xml', href: '/favicons/favicon.svg' },
        { rel: 'shortcut icon', href: '/favicons/favicon.ico' },
        { rel: 'apple-touch-icon', sizes: '180x180', href: '/favicons/apple-touch-icon.png' },
        { rel: 'manifest', href: '/favicons/site.webmanifest' }
      ]
    }
  },
  plugins: [
    '~/plugins/supabase.client.ts',
    '~/plugins/netlifyIdentity.client.ts',
    '~/plugins/google-analytics.client.ts'
  ]
})