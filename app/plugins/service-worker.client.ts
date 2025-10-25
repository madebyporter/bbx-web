// Service Worker registration plugin for Beatbox
// Registers the service worker to enable aggressive audio caching

export default defineNuxtPlugin(() => {
  // Only run in browser
  if (typeof window === 'undefined') return

  // Check if service workers are supported
  if ('serviceWorker' in navigator) {
    // Register service worker after page load
    window.addEventListener('load', async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/'
        })

        console.log('[SW Plugin] Service Worker registered successfully:', registration.scope)

        // Check for updates periodically
        setInterval(() => {
          registration.update()
        }, 60 * 60 * 1000) // Check every hour

        // Listen for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing
          
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'activated') {
                console.log('[SW Plugin] Service Worker updated')
              }
            })
          }
        })

      } catch (error) {
        console.error('[SW Plugin] Service Worker registration failed:', error)
      }
    })

    // Provide utility methods to the app
    const clearAudioCache = async (): Promise<boolean> => {
      const registration = await navigator.serviceWorker.ready
      
      return new Promise((resolve) => {
        const messageChannel = new MessageChannel()
        messageChannel.port1.onmessage = (event) => {
          resolve(event.data.success)
        }
        
        registration.active?.postMessage(
          { type: 'CLEAR_AUDIO_CACHE' },
          [messageChannel.port2]
        )
      })
    }

    const getCacheSize = async (): Promise<{ size: number; maxSize: number } | null> => {
      const registration = await navigator.serviceWorker.ready
      
      return new Promise((resolve) => {
        const messageChannel = new MessageChannel()
        messageChannel.port1.onmessage = (event) => {
          if (event.data.success) {
            resolve({ size: event.data.size, maxSize: event.data.maxSize })
          } else {
            resolve(null)
          }
        }
        
        registration.active?.postMessage(
          { type: 'GET_CACHE_SIZE' },
          [messageChannel.port2]
        )
      })
    }

    // Make utilities available globally
    if (typeof window !== 'undefined') {
      (window as any).bbxCache = {
        clearAudioCache,
        getCacheSize
      }
    }
  } else {
    console.warn('[SW Plugin] Service Workers are not supported in this browser')
  }
})

