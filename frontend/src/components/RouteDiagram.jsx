import React, { useEffect, useRef, useMemo } from 'react'
import { MapContainer, Polyline, TileLayer } from 'react-leaflet'
import L from 'leaflet'
import { decodePolyline } from '../utils/polyline'
import { getRouteColor } from '../utils/routeColors'
import { MAP_CONFIG } from '../utils/constants'
import { configureLeafletIcons } from '../utils/leafletConfig'
import StationMarker from './StationMarker'

// Configure Leaflet icons
configureLeafletIcons()

const RouteDiagram = ({ lines, routes, stops, shapes }) => {
  const mapRef = useRef(null)

  // Memoize decoded shapes for performance
  const decodedShapes = useMemo(() => {
    if (!Array.isArray(shapes)) return []
    const validRoutes = Array.isArray(routes) ? routes : []
    const validLines = Array.isArray(lines) ? lines : []
    
    return shapes.map((shape) => {
      if (!shape || !shape.id) return null
      
      const polyline = shape.attributes?.polyline
      if (typeof polyline !== 'string' || !polyline) return null
      
      const coordinates = decodePolyline(polyline)
      if (!Array.isArray(coordinates) || coordinates.length === 0) return null
      
      const routeId = shape.attributes?._route_id ||
                     shape.relationships?.route?.data?.id || 
                     shape.attributes?.route_id ||
                     shape.attributes?.route?.id
      
      if (typeof routeId !== 'string' || !routeId) return null
      
      return {
        id: shape.id,
        coordinates,
        routeId,
        color: getRouteColor(routeId, validRoutes, validLines)
      }
    }).filter(Boolean)
  }, [shapes, routes, lines])

  // Zoom to fit all stops when they're loaded
  useEffect(() => {
    if (!mapRef.current || !Array.isArray(stops) || stops.length === 0) return
    
    const map = mapRef.current
    const stopCoords = stops
      .map((stop) => {
        if (!stop) return null
        // MBTA API returns latitude/longitude directly in attributes
        const latitude = stop.attributes?.latitude
        const longitude = stop.attributes?.longitude
        if (typeof latitude === 'number' && typeof longitude === 'number' && 
            !isNaN(latitude) && !isNaN(longitude)) {
          return [latitude, longitude]
        }
        return null
      })
      .filter(Boolean)
    
    if (stopCoords.length === 0) return
    
    const bounds = L.latLngBounds(stopCoords)
    
    if (bounds.isValid()) {
      // Zoom out to show full extent of all subway lines including Red and Green line endpoints
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 11 })
    }
  }, [stops])

  return (
    <div className="route-diagram-container">
      <MapContainer
        center={MAP_CONFIG.center}
        zoom={11}
        minZoom={9}
        maxZoom={18}
        style={{ height: '100%', width: '100%' }}
        ref={mapRef}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Draw all route polylines - shows progressively as shapes load */}
        {decodedShapes.map((shape) => (
          <Polyline
            key={shape.id}
            positions={shape.coordinates}
            color={shape.color}
            weight={4}
            opacity={0.8}
          />
        ))}
        
        {/* Draw all station markers - shows progressively as stops load */}
        {Array.isArray(stops) && stops.map((stop) => {
          if (!stop) return null
          
          const latitude = stop.attributes?.latitude
          const longitude = stop.attributes?.longitude
          if (typeof latitude !== 'number' || typeof longitude !== 'number' ||
              isNaN(latitude) || isNaN(longitude)) return null
          
          let stopName = stop.attributes?.name || stop.id
          // Remove numbers from station name
          if (typeof stopName === 'string') {
            stopName = stopName.replace(/\d+/g, '').replace(/\s+/g, ' ').trim()
          }
          
          return (
            <StationMarker
              key={stop.id}
              stop={stop}
              stopName={stopName}
              latitude={latitude}
              longitude={longitude}
            />
          )
        })}
      </MapContainer>
    </div>
  )
}

export default RouteDiagram
