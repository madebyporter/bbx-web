import netlifyIdentity from 'netlify-identity-widget'

export default defineNuxtPlugin((nuxtApp) => {
  if (process.client) {
    netlifyIdentity.init({
      locale: 'en'
    })
  }

  return {
    provide: {
      netlifyIdentity
    }
  }
}) 