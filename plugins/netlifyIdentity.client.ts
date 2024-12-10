import { defineNuxtPlugin } from '#app'
import IdentityWidget from 'netlify-identity-widget'

export default defineNuxtPlugin((nuxtApp) => {
  const runtimeConfig = useRuntimeConfig()
  
  if (process.client) {
    IdentityWidget.init({
      APIUrl: runtimeConfig.public.NETLIFY_IDENTITY_URL
    })
  }

  return {
    provide: {
      identity: IdentityWidget
    }
  }
}) 