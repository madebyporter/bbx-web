// Service Worker for Beatbox Audio Caching
// Aggressively caches audio files to reduce Supabase egress

const CACHE_VERSION = 'bbx-audio-v1';
const AUDIO_CACHE = `${CACHE_VERSION}-audio`;
const MAX_AUDIO_CACHE_SIZE = 100; // Maximum number of audio files to cache

// Supabase storage URL pattern
const SUPABASE_AUDIO_PATTERN = /\.supabase\.co\/storage\/v1\/object\/public\/sounds\//;

self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  // Skip waiting to activate immediately
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  event.waitUntil(
    // Clean up old caches
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName.startsWith('bbx-audio-v') && cacheName !== AUDIO_CACHE) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Take control of all clients immediately
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  // Only cache audio files from Supabase storage
  if (SUPABASE_AUDIO_PATTERN.test(url) && event.request.method === 'GET') {
    event.respondWith(
      caches.open(AUDIO_CACHE).then(async (cache) => {
        // Try to get from cache first
        const cachedResponse = await cache.match(event.request);
        
        if (cachedResponse) {
          console.log('[Service Worker] Serving from cache:', url);
          return cachedResponse;
        }

        console.log('[Service Worker] Fetching and caching:', url);
        
        // Fetch from network
        try {
          const networkResponse = await fetch(event.request);
          
          // Only cache successful responses
          if (networkResponse && networkResponse.status === 200) {
            // Clone the response before caching
            const responseToCache = networkResponse.clone();
            
            // Cache the audio file
            cache.put(event.request, responseToCache);
            
            // Manage cache size
            manageCacheSize(cache);
          }
          
          return networkResponse;
        } catch (error) {
          console.error('[Service Worker] Fetch failed:', error);
          // If we're offline and have a cached version, return it
          // Otherwise, let the error propagate
          throw error;
        }
      })
    );
  }
  
  // For non-audio requests, use default fetch behavior
});

// Manage cache size by removing oldest entries
async function manageCacheSize(cache) {
  const keys = await cache.keys();
  
  if (keys.length > MAX_AUDIO_CACHE_SIZE) {
    console.log('[Service Worker] Cache size exceeded, removing oldest entries');
    // Remove the oldest entries (FIFO)
    const keysToDelete = keys.slice(0, keys.length - MAX_AUDIO_CACHE_SIZE);
    await Promise.all(keysToDelete.map(key => cache.delete(key)));
  }
}

// Listen for messages from the client
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CLEAR_AUDIO_CACHE') {
    console.log('[Service Worker] Clearing audio cache');
    event.waitUntil(
      caches.delete(AUDIO_CACHE).then(() => {
        event.ports[0].postMessage({ success: true });
      })
    );
  }
  
  if (event.data && event.data.type === 'GET_CACHE_SIZE') {
    console.log('[Service Worker] Getting cache size');
    event.waitUntil(
      caches.open(AUDIO_CACHE).then(async (cache) => {
        const keys = await cache.keys();
        event.ports[0].postMessage({ 
          success: true, 
          size: keys.length,
          maxSize: MAX_AUDIO_CACHE_SIZE
        });
      })
    );
  }
});

