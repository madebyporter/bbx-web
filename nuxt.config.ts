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
      title: 'BBX Resource Database',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' }
      ]
    }
  }
})