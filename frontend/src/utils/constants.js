/**
 * Application constants.
 */

// Boston area center coordinates
export const BOSTON_CENTER = [42.3601, -71.0589]

// Map configuration
export const MAP_CONFIG = {
  center: BOSTON_CENTER,
  zoom: 13,
  minZoom: 11,
  maxZoom: 18,
  padding: [50, 50],
  maxZoomOnFit: 15,
}

// Station marker configuration
export const STATION_MARKER_CONFIG = {
  radius: 8,
  fillColor: '#ffffff',
  fillOpacity: 1,
  color: '#000000',
  weight: 2,
  opacity: 1,
}
