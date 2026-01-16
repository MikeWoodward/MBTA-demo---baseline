/**
 * Cached tile layer component for React-Leaflet.
 * Uses cached tiles when available, falls back to OpenStreetMap.
 */
import { useEffect } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'

const CachedTileLayer = ({ url, ...props }) => {
  const map = useMap()

  useEffect(() => {
    if (!map) return

    // Create a custom tile layer that checks backend cache first, then falls back to OpenStreetMap
    const BackendCachedTileLayer = L.TileLayer.extend({
      getTileUrl: function (coords) {
        // Try backend cache first
        return `/api/tiles/${coords.z}/${coords.x}/${coords.y}.png`
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
        const originalUrl = url
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
            // Backend cache failed (404), try OpenStreetMap
            triedBackend = true
            tile.onerror = null // Clear handler
            tile.src = originalUrl
          } else {
            // Both failed, use Leaflet's default error handling
            L.DomEvent.on(tile, 'error', L.Util.bind(this._tileOnError, this, done, tile))
          }
        }
        
        // Start with backend cache
        tile.src = backendUrl
        
        return tile
      },
    })
    
    const cachedLayer = new BackendCachedTileLayer(url, {
      attribution: props.attribution || '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: props.maxZoom || 18,
      minZoom: props.minZoom || 0,
      crossOrigin: 'anonymous',
    })

    // Add to map
    cachedLayer.addTo(map)

    // Cleanup on unmount
    return () => {
      if (map.hasLayer(cachedLayer)) {
        map.removeLayer(cachedLayer)
      }
    }
  }, [map, url, props.attribution, props.maxZoom, props.minZoom])

  return null
}

export default CachedTileLayer
