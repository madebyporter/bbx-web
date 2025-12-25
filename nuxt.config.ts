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
  devtools: { enabled: false },
  
  // Enable SSR
  ssr: true,
  
  // Pages configuration
  pages: true,
  
  // Router configuration
  router: {
    options: {
      strict: false
    }
  },
  
  // PostCSS configuration
  postcss: {
    plugins: {
      'postcss-import': {},
      'postcss-nesting': {},
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
      SITE_URL: process.env.SITE_URL
    }
  },
  
  app: {
    head: {
      htmlAttrs: {
        lang: 'en'
      },
      viewport: 'width=device-width, initial-scale=1.0',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'format-detection', content: 'telephone=no' },
        { name: 'theme-color', content: '#000000' },
        
        // Static Open Graph defaults (pages will override specific values)
        { property: 'og:site_name', content: 'Beatbox' },
        { property: 'og:image', content: 'https://beatbox.studio/img/og-image.jpg' },
        { property: 'og:image:width', content: '1200' },
        { property: 'og:image:height', content: '630' },
        { property: 'og:image:alt', content: 'Beatbox - A curated collection of music production tools' },
        
        // Static Twitter defaults (pages will override specific values)
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:image', content: 'https://beatbox.studio/img/og-image.jpg' },
        { name: 'twitter:image:alt', content: 'Beatbox - A curated collection of music production tools' },
        { name: 'twitter:site', content: '@beatboxstudio' }
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
    '~/plugins/supabase.client.ts',
    '~/plugins/google-analytics.client.ts',
    '~/plugins/service-worker.client.ts'
  ],

  // Set compatibility date and Netlify preset
  nitro: {
    compatibilityDate: '2024-04-03',
    preset: 'netlify',
    // Ensure service worker is served with correct MIME type
    publicAssets: [
      {
        dir: 'public',
        maxAge: 0, // Service worker should not be cached
        baseURL: '/'
      }
    ]
  },

  // Optimize build for caching
  experimental: {
    payloadExtraction: false
  }
})