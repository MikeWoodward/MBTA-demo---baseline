/**
 * Leaflet configuration utilities.
 * Centralizes Leaflet icon setup to avoid duplication.
 */
import L from 'leaflet'

/**
 * Configure Leaflet default icon to use CDN URLs.
 * This fixes the default marker icon issue in React-Leaflet.
 */
export const configureLeafletIcons = () => {
  delete L.Icon.Default.prototype._getIconUrl
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  })
}
