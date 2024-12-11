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
  runtimeConfig: {
    public: {
      supabaseUrl: process.env.NUXT_PUBLIC_SUPABASE_URL,
      supabaseKey: process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY,
      NETLIFY_IDENTITY_URL: process.env.NETLIFY_IDENTITY_URL,
      NETLIFY_SITE_ID: process.env.NETLIFY_SITE_ID,
      SITE_URL: process.env.SITE_URL
    }
  },
  app: {
    head: {
      viewport: 'width=device-width, initial-scale=1.0',
      title: 'Beatbox - A curated collection of music production tools and resources.',
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
        
        // Twitter
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:title', content: 'Beatbox' },
        { name: 'twitter:description', content: 'A curated collection of music production tools and resources.' }
      ],
      link: [
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
    '~/plugins/google-analytics.client.ts'
  ]
})