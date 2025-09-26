// Service Worker for Tribe MVP - Timeline Offline Support
// Phase 3 Advanced Features

const CACHE_NAME = 'tribe-timeline-v1'
const DYNAMIC_CACHE = 'tribe-dynamic-v1'
const IMAGE_CACHE = 'tribe-images-v1'
const DATA_CACHE = 'tribe-data-v1'

// Files to cache immediately
const STATIC_ASSETS = [
  '/',
  '/dashboard',
  '/dashboard/timeline',
  '/manifest.json',
  '/offline.html'
]

// API routes to cache
const API_ROUTES = [
  '/api/updates',
  '/api/children',
  '/api/recipients'
]

// Image optimization settings
const IMAGE_QUALITY = 0.8
const MAX_IMAGE_SIZE = 1024 * 1024 // 1MB
const SUPPORTED_IMAGE_FORMATS = ['image/jpeg', 'image/png', 'image/webp']

self.addEventListener('install', (event) => {
  console.log('Service Worker installing...')

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Caching static assets')
        return cache.addAll(STATIC_ASSETS)
      })
      .then(() => {
        // Skip waiting to activate immediately
        return self.skipWaiting()
      })
  )
})

self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...')

  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter(cacheName => {
              return cacheName !== CACHE_NAME &&
                     cacheName !== DYNAMIC_CACHE &&
                     cacheName !== IMAGE_CACHE &&
                     cacheName !== DATA_CACHE
            })
            .map(cacheName => caches.delete(cacheName))
        )
      }),
      // Claim all clients
      self.clients.claim()
    ])
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Handle different types of requests
  if (request.method !== 'GET') {
    // Handle POST/PUT/DELETE requests for offline sync
    return handleNonGetRequest(event)
  }

  // Handle API requests
  if (url.pathname.startsWith('/api/')) {
    return handleApiRequest(event)
  }

  // Handle image requests
  if (SUPPORTED_IMAGE_FORMATS.some(format => request.headers.get('accept')?.includes(format))) {
    return handleImageRequest(event)
  }

  // Handle navigation requests
  if (request.mode === 'navigate') {
    return handleNavigationRequest(event)
  }

  // Handle static asset requests
  return handleStaticRequest(event)
})

// Handle API requests with caching and offline fallback
function handleApiRequest(event) {
  const { request } = event

  event.respondWith(
    caches.open(DATA_CACHE)
      .then((cache) => {
        // Try network first for fresh data
        return fetch(request)
          .then((networkResponse) => {
            // Cache successful responses
            if (networkResponse.ok) {
              cache.put(request, networkResponse.clone())
            }
            return networkResponse
          })
          .catch(() => {
            // Fallback to cache if network fails
            return cache.match(request)
              .then((cachedResponse) => {
                if (cachedResponse) {
                  // Add offline header to indicate cached data
                  const headers = new Headers(cachedResponse.headers)
                  headers.set('X-Offline-Cache', 'true')

                  return new Response(cachedResponse.body, {
                    status: cachedResponse.status,
                    statusText: cachedResponse.statusText,
                    headers: headers
                  })
                }

                // Return offline fallback data
                return getOfflineFallbackData(request)
              })
          })
      })
  )
}

// Handle image requests with progressive loading and optimization
function handleImageRequest(event) {
  const { request } = event

  event.respondWith(
    caches.open(IMAGE_CACHE)
      .then((cache) => {
        return cache.match(request)
          .then((cachedResponse) => {
            if (cachedResponse) {
              // Return cached image immediately
              return cachedResponse
            }

            // Fetch and optimize image
            return fetch(request)
              .then(async (networkResponse) => {
                if (!networkResponse.ok) {
                  throw new Error('Network response was not ok')
                }

                // Clone response for caching
                const responseClone = networkResponse.clone()

                // Optimize image if possible
                try {
                  const optimizedResponse = await optimizeImage(networkResponse)
                  cache.put(request, optimizedResponse.clone())
                  return optimizedResponse
                } catch (error) {
                  // If optimization fails, cache original
                  cache.put(request, responseClone)
                  return responseClone
                }
              })
              .catch(() => {
                // Return placeholder image for offline
                return getPlaceholderImage()
              })
          })
      })
  )
}

// Handle navigation requests with offline fallback
function handleNavigationRequest(event) {
  const { request } = event

  event.respondWith(
    fetch(request)
      .catch(() => {
        // Return cached page or offline fallback
        return caches.match(request)
          .then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse
            }

            // Return offline page
            return caches.match('/offline.html')
          })
      })
  )
}

// Handle static asset requests
function handleStaticRequest(event) {
  const { request } = event

  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse
        }

        // Fetch and cache new assets
        return fetch(request)
          .then((networkResponse) => {
            if (networkResponse.ok) {
              const responseClone = networkResponse.clone()
              caches.open(DYNAMIC_CACHE)
                .then((cache) => {
                  cache.put(request, responseClone)
                })
            }
            return networkResponse
          })
      })
  )
}

// Handle non-GET requests for offline sync
function handleNonGetRequest(event) {
  const { request } = event

  // Try to send request immediately
  event.respondWith(
    fetch(request)
      .catch(async () => {
        // If network fails, store for later sync
        await storeForOfflineSync(request)

        // Return appropriate offline response
        return new Response(
          JSON.stringify({
            success: false,
            offline: true,
            message: 'Request stored for sync when online'
          }),
          {
            status: 202,
            headers: { 'Content-Type': 'application/json' }
          }
        )
      })
  )
}

// Store requests for offline sync
async function storeForOfflineSync(request) {
  const db = await openIndexedDB()
  const transaction = db.transaction(['offline-requests'], 'readwrite')
  const store = transaction.objectStore('offline-requests')

  const requestData = {
    url: request.url,
    method: request.method,
    headers: Object.fromEntries(request.headers.entries()),
    body: await request.text(),
    timestamp: Date.now()
  }

  return store.add(requestData)
}

// Open IndexedDB for offline storage
function openIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('tribe-offline-db', 1)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)

    request.onupgradeneeded = (event) => {
      const db = event.target.result

      // Create stores
      if (!db.objectStoreNames.contains('offline-requests')) {
        const store = db.createObjectStore('offline-requests', { keyPath: 'id', autoIncrement: true })
        store.createIndex('timestamp', 'timestamp')
      }

      if (!db.objectStoreNames.contains('timeline-data')) {
        const store = db.createObjectStore('timeline-data', { keyPath: 'id' })
        store.createIndex('timestamp', 'timestamp')
      }
    }
  })
}

// Optimize images for better performance
async function optimizeImage(response) {
  const contentType = response.headers.get('content-type')

  if (!SUPPORTED_IMAGE_FORMATS.includes(contentType)) {
    return response
  }

  try {
    const arrayBuffer = await response.arrayBuffer()

    // Skip optimization for small images
    if (arrayBuffer.byteLength < MAX_IMAGE_SIZE * 0.1) {
      return new Response(arrayBuffer, {
        headers: response.headers
      })
    }

    // Create canvas for optimization
    const bitmap = await createImageBitmap(new Blob([arrayBuffer]))
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height)
    const ctx = canvas.getContext('2d')

    ctx.drawImage(bitmap, 0, 0)

    // Convert to WebP if supported, otherwise JPEG
    const optimizedBlob = await canvas.convertToBlob({
      type: 'image/webp',
      quality: IMAGE_QUALITY
    })

    return new Response(optimizedBlob, {
      headers: new Headers({
        'Content-Type': 'image/webp',
        'X-Optimized': 'true'
      })
    })
  } catch (error) {
    // Return original if optimization fails
    return response
  }
}

// Get placeholder image for offline
function getPlaceholderImage() {
  // Simple SVG placeholder
  const svgString = `
    <svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
      <rect width="400" height="300" fill="#f3f4f6"/>
      <text x="200" y="150" text-anchor="middle" fill="#9ca3af" font-family="Arial, sans-serif" font-size="16">
        Image unavailable offline
      </text>
    </svg>
  `

  return new Response(svgString, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'X-Offline-Placeholder': 'true'
    }
  })
}

// Get offline fallback data for API requests
function getOfflineFallbackData(request) {
  const url = new URL(request.url)

  // Return appropriate fallback based on API endpoint
  if (url.pathname.includes('/updates')) {
    return new Response(JSON.stringify({
      data: [],
      offline: true,
      message: 'Updates will sync when online'
    }), {
      headers: {
        'Content-Type': 'application/json',
        'X-Offline-Fallback': 'true'
      }
    })
  }

  return new Response(JSON.stringify({
    offline: true,
    message: 'Data unavailable offline'
  }), {
    status: 503,
    headers: { 'Content-Type': 'application/json' }
  })
}

// Background sync for offline requests
self.addEventListener('sync', (event) => {
  if (event.tag === 'offline-sync') {
    event.waitUntil(syncOfflineRequests())
  }
})

// Sync offline requests when connection is restored
async function syncOfflineRequests() {
  try {
    const db = await openIndexedDB()
    const transaction = db.transaction(['offline-requests'], 'readonly')
    const store = transaction.objectStore('offline-requests')
    const requests = await getAllFromStore(store)

    for (const requestData of requests) {
      try {
        const response = await fetch(requestData.url, {
          method: requestData.method,
          headers: requestData.headers,
          body: requestData.body || undefined
        })

        if (response.ok) {
          // Remove successfully synced request
          await removeFromStore(db, 'offline-requests', requestData.id)
        }
      } catch (error) {
        console.error('Failed to sync request:', error)
        // Keep request for next sync attempt
      }
    }
  } catch (error) {
    console.error('Sync failed:', error)
  }
}

// Helper function to get all items from IndexedDB store
function getAllFromStore(store) {
  return new Promise((resolve, reject) => {
    const request = store.getAll()
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

// Helper function to remove item from IndexedDB store
function removeFromStore(db, storeName, id) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readwrite')
    const store = transaction.objectStore(storeName)
    const request = store.delete(id)

    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

// Push notification handling
self.addEventListener('push', (event) => {
  if (!event.data) return

  const data = event.data.json()

  const options = {
    body: data.body,
    icon: '/icon-192.png',
    badge: '/badge-72.png',
    tag: data.tag || 'timeline-update',
    data: data.data,
    actions: [
      {
        action: 'view',
        title: 'View Update',
        icon: '/action-view.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/action-close.png'
      }
    ]
  }

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  )
})

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  const { action, data } = event.notification

  event.notification.close()

  if (action === 'view' && data?.updateId) {
    event.waitUntil(
      clients.openWindow(`/dashboard/updates/${data.updateId}`)
    )
  } else if (!action) {
    event.waitUntil(
      clients.openWindow('/dashboard/timeline')
    )
  }
})

// Message handling for client communication
self.addEventListener('message', (event) => {
  const { type, data } = event.data

  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting()
      break

    case 'CACHE_TIMELINE_DATA':
      cacheTimelineData(data)
      break

    case 'GET_CACHE_STATUS':
      getCacheStatus().then(status => {
        event.ports[0].postMessage(status)
      })
      break

    case 'CLEAR_CACHE':
      clearAllCaches().then(() => {
        event.ports[0].postMessage({ success: true })
      })
      break
  }
})

// Cache timeline data proactively
async function cacheTimelineData(data) {
  try {
    const cache = await caches.open(DATA_CACHE)
    const response = new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' }
    })
    await cache.put('/api/updates', response)
  } catch (error) {
    console.error('Failed to cache timeline data:', error)
  }
}

// Get cache status information
async function getCacheStatus() {
  const cacheNames = await caches.keys()
  const status = {}

  for (const cacheName of cacheNames) {
    const cache = await caches.open(cacheName)
    const keys = await cache.keys()
    status[cacheName] = keys.length
  }

  return status
}

// Clear all caches
async function clearAllCaches() {
  const cacheNames = await caches.keys()
  return Promise.all(
    cacheNames.map(cacheName => caches.delete(cacheName))
  )
}

console.log('Tribe Service Worker loaded successfully')