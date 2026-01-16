/**
 * Map tile caching utility.
 * Downloads and caches OpenStreetMap tiles for offline use.
 */

// Boston center coordinates
const BOSTON_CENTER = [42.3601, -71.0589]
// Cache radius: 100 km from Boston center
const CACHE_RADIUS_KM = 100

// Zoom levels to cache (9-15 covers regional to street level detail)
const CACHE_ZOOM_LEVELS = [9, 10, 11, 12, 13, 14, 15]

// IndexedDB database name and version
const DB_NAME = 'mbta_map_cache'
const DB_VERSION = 1
const STORE_NAME = 'tiles'

/**
 * Convert lat/lng to tile coordinates.
 */
const latLngToTile = (lat, lng, zoom) => {
  const n = Math.pow(2, zoom)
  const x = Math.floor((lng + 180) / 360 * n)
  const latRad = (lat * Math.PI) / 180
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n
  )
  return { x, y, z: zoom }
}

/**
 * Calculate bounding box for cache area.
 * Uses 100 km radius from Boston center.
 */
const getCacheBounds = () => {
  // Approximate conversion: 1 degree latitude ≈ 111 km
  // 1 degree longitude ≈ 111 * cos(latitude) km
  const latDegrees = CACHE_RADIUS_KM / 111
  const lngDegrees = CACHE_RADIUS_KM / (111 * Math.cos((BOSTON_CENTER[0] * Math.PI) / 180))
  
  return {
    north: BOSTON_CENTER[0] + latDegrees,
    south: BOSTON_CENTER[0] - latDegrees,
    east: BOSTON_CENTER[1] + lngDegrees,
    west: BOSTON_CENTER[1] - lngDegrees,
  }
}

/**
 * Generate all tile coordinates for the cache area.
 */
const generateTileCoordinates = () => {
  const bounds = getCacheBounds()
  const tiles = []
  
  for (const zoom of CACHE_ZOOM_LEVELS) {
    // Get tile coordinates for all four corners
    const nwTile = latLngToTile(bounds.north, bounds.west, zoom)
    const neTile = latLngToTile(bounds.north, bounds.east, zoom)
    const swTile = latLngToTile(bounds.south, bounds.west, zoom)
    const seTile = latLngToTile(bounds.south, bounds.east, zoom)
    
    // Find min/max x and y values
    const minX = Math.min(nwTile.x, neTile.x, swTile.x, seTile.x)
    const maxX = Math.max(nwTile.x, neTile.x, swTile.x, seTile.x)
    const minY = Math.min(nwTile.y, neTile.y, swTile.y, seTile.y)
    const maxY = Math.max(nwTile.y, neTile.y, swTile.y, seTile.y)
    
    // Generate all tiles in the bounding box
    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        tiles.push({ x, y, z: zoom })
      }
    }
  }
  
  return tiles
}

/**
 * Get tile URL for OpenStreetMap.
 */
const getTileUrl = (x, y, z) => {
  const subdomain = (x + y) % 3 // Use different subdomains for load balancing
  return `https://${subdomain}.tile.openstreetmap.org/${z}/${x}/${y}.png`
}

/**
 * Initialize IndexedDB.
 */
const initDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'key' })
        store.createIndex('url', 'url', { unique: false })
      }
    }
  })
}

/**
 * Store tile in cache.
 */
const storeTile = async (x, y, z, blob) => {
  try {
    const db = await initDB()
    const key = `${z}/${x}/${y}`
    const transaction = db.transaction([STORE_NAME], 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    
    await new Promise((resolve, reject) => {
      const request = store.put({
        key,
        url: getTileUrl(x, y, z),
        blob,
        timestamp: Date.now(),
      })
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  } catch (error) {
    console.error(`Error storing tile ${z}/${x}/${y}:`, error)
  }
}

/**
 * Get tile from cache.
 */
const getCachedTile = async (x, y, z) => {
  try {
    const db = await initDB()
    const key = `${z}/${x}/${y}`
    const transaction = db.transaction([STORE_NAME], 'readonly')
    const store = transaction.objectStore(STORE_NAME)
    
    return new Promise((resolve, reject) => {
      const request = store.get(key)
      request.onsuccess = () => {
        const result = request.result
        if (result && result.blob) {
          resolve(URL.createObjectURL(result.blob))
        } else {
          resolve(null)
        }
      }
      request.onerror = () => reject(request.error)
    })
  } catch (error) {
    console.error(`Error getting cached tile ${z}/${x}/${y}:`, error)
    return null
  }
}

/**
 * Download a single tile.
 */
const downloadTile = async (x, y, z) => {
  try {
    const url = getTileUrl(x, y, z)
    const response = await fetch(url)
    
    if (!response.ok) {
      throw new Error(`Failed to download tile: ${response.statusText}`)
    }
    
    const blob = await response.blob()
    await storeTile(x, y, z, blob)
    return true
  } catch (error) {
    console.error(`Error downloading tile ${z}/${x}/${y}:`, error)
    return false
  }
}

/**
 * Download all tiles for the cache area.
 * This is called at app startup.
 */
export const preloadMapTiles = async (onProgress) => {
  try {
    // Initialize database
    await initDB()
    
    const tiles = generateTileCoordinates()
    const totalTiles = tiles.length
    let downloaded = 0
    let failed = 0
    
    // Download tiles in batches to avoid overwhelming the server
    const BATCH_SIZE = 10
    const DELAY_BETWEEN_BATCHES = 100 // ms
    
    for (let i = 0; i < tiles.length; i += BATCH_SIZE) {
      const batch = tiles.slice(i, i + BATCH_SIZE)
      
      const results = await Promise.allSettled(
        batch.map(tile => downloadTile(tile.x, tile.y, tile.z))
      )
      
      results.forEach((result) => {
        if (result.status === 'fulfilled' && result.value) {
          downloaded++
        } else {
          failed++
        }
      })
      
      // Report progress
      if (onProgress) {
        onProgress({
          downloaded,
          failed,
          total: totalTiles,
          percentage: Math.round((downloaded / totalTiles) * 100),
        })
      }
      
      // Small delay between batches to be respectful to the server
      if (i + BATCH_SIZE < tiles.length) {
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES))
      }
    }
    
    console.log(`Map tile cache complete: ${downloaded}/${totalTiles} tiles downloaded`)
    return { downloaded, failed, total: totalTiles }
  } catch (error) {
    console.error('Error preloading map tiles:', error)
    return { downloaded: 0, failed: 0, total: 0 }
  }
}

/**
 * Get cached tile URL or return null if not cached.
 */
export const getCachedTileUrl = async (x, y, z) => {
  return await getCachedTile(x, y, z)
}

/**
 * Check if tile is cached.
 */
export const isTileCached = async (x, y, z) => {
  const cached = await getCachedTile(x, y, z)
  return cached !== null
}
