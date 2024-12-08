import netlifyIdentity from 'netlify-identity-widget'

export default defineNuxtPlugin((nuxtApp) => {
  if (process.client) {
    netlifyIdentity.init({
      locale: 'en'
    })

    if (process.env.NODE_ENV === 'development') {
      netlifyIdentity.on('signup', async (user) => {
        try {
          await netlifyIdentity.confirm(user)
          await netlifyIdentity.refresh()
        } catch (error) {
          console.error('Error auto-confirming user:', error)
        }
      })
    }
  }

  return {
    provide: {
      netlifyIdentity
    }
  }
}) 