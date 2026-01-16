/**
 * Custom Leaflet tile layer that uses backend-cached tiles when available.
 * Tiles are cached in the backend Data folder and served via /api/tiles/{z}/{x}/{y}.png
 */
import L from 'leaflet'

/**
 * Create a custom tile layer that checks backend cache first.
 * @param {string} urlTemplate - The URL template for the tiles (e.g., "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").
 * @param {object} options - Leaflet TileLayer options.
 * @returns {L.TileLayer} A new instance of the custom cached tile layer.
 */
export const createCachedTileLayer = (urlTemplate, options = {}) => {
  const CachedTileLayer = L.TileLayer.extend({
    getTileUrl: function (coords) {
      // Try backend cache first: /api/tiles/{z}/{x}/{y}.png
      // Use relative URL so it goes through the Vite proxy
      const backendUrl = `/api/tiles/${coords.z}/${coords.x}/${coords.y}.png`
      
      // Return backend URL - if tile is cached, it will be served
      // If not cached (404), Leaflet will fall back to the original URL template
      return backendUrl
    },
    
    createTile: function (coords, done) {
      const tile = document.createElement('img')
      
      L.DomEvent.on(tile, 'load', L.Util.bind(this._tileOnLoad, this, done, tile))
      
      if (this.options.crossOrigin) {
        tile.crossOrigin = ''
      }
      
      tile.alt = ''
      tile.setAttribute('role', 'presentation')
      
      // Build the original OpenStreetMap URL as fallback
      const subdomain = (coords.x + coords.y) % 3
      const originalUrl = urlTemplate
        .replace('{s}', String(subdomain))
        .replace('{z}', String(coords.z))
        .replace('{x}', String(coords.x))
        .replace('{y}', String(coords.y))
      
      // Try backend cache first
      const backendUrl = this.getTileUrl(coords)
      
      // Set up error handler that falls back to OpenStreetMap
      let triedBackend = false
      tile.onerror = () => {
        if (!triedBackend) {
          // Backend cache failed, try OpenStreetMap
          triedBackend = true
          tile.src = originalUrl
        } else {
          // Both failed, use Leaflet's default error handling
          L.DomEvent.on(tile, 'error', L.Util.bind(this._tileOnError, this, done, tile))
        }
      }
      
      // Try backend cache first
      tile.src = backendUrl
      
      return tile
    },
  })
  
  return new CachedTileLayer(urlTemplate, {
    ...options,
    // Disable browser caching since we handle it ourselves
    cache: false,
  })
}
