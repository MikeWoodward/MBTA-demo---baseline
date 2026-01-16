import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import { MapContainer, Polyline, Tooltip, CircleMarker, TileLayer } from 'react-leaflet'
import L from 'leaflet'
import { decodePolyline } from '../utils/polyline'
import { formatPredictionTime, getDirectionName, processPredictionsForStop } from '../utils/predictions'
import { getRouteColor } from '../utils/routeColors'
import { MAP_CONFIG, STATION_MARKER_CONFIG } from '../utils/constants'
import { configureLeafletIcons } from '../utils/leafletConfig'
import { getPredictionsForStop } from '../services/api'

// Configure Leaflet icons
configureLeafletIcons()

const MapComponent = ({ lines, routes, stops, shapes }) => {
  const mapRef = useRef(null)
  
  // Memoize decoded shape coordinates to avoid re-decoding on every render
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
                     shape.attributes?.route_id
      
      if (typeof routeId !== 'string' || !routeId) return null
      
      return {
        id: shape.id,
        coordinates,
        routeId,
        color: getRouteColor(routeId, validRoutes, validLines)
      }
    }).filter(Boolean)
  }, [shapes, routes, lines])
  
  // Zoom to fit the full extent of the selected line (shapes + stops)
  useEffect(() => {
    if (!mapRef.current) return
    
    const map = mapRef.current
    const allCoordinates = []
    
    // Collect coordinates from decoded shapes
    if (decodedShapes.length > 0) {
      decodedShapes.forEach((shape) => {
        allCoordinates.push(...shape.coordinates)
      })
    }
    
    // Also include stop coordinates for better bounds
    if (Array.isArray(stops) && stops.length > 0) {
      stops.forEach((stop) => {
        if (!stop) return
        const latitude = stop.attributes?.latitude
        const longitude = stop.attributes?.longitude
        if (typeof latitude === 'number' && typeof longitude === 'number' && 
            !isNaN(latitude) && !isNaN(longitude)) {
          allCoordinates.push([latitude, longitude])
        }
      })
    }
    
    if (allCoordinates.length > 0) {
      const bounds = L.latLngBounds(allCoordinates)
      
      if (bounds.isValid()) {
        // Zoom to fit the full extent of the line with padding
        map.fitBounds(bounds, { 
          padding: MAP_CONFIG.padding, 
          maxZoom: MAP_CONFIG.maxZoomOnFit 
        })
      }
    } else if (Array.isArray(stops) && stops.length > 0) {
      // Fallback: if no shapes, use stops only
      const stopCoords = stops
        .map((stop) => {
          if (!stop) return null
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
        map.fitBounds(bounds, { padding: [20, 20], maxZoom: 14 })
      }
    }
  }, [decodedShapes, stops])

  // Station marker component that fetches predictions on hover
  const StationMarker = ({ stop, stopName, latitude, longitude }) => {
    const [predictions, setPredictions] = useState([])
    const [loadingPredictions, setLoadingPredictions] = useState(false)
    const [hovered, setHovered] = useState(false)
    const [hasFetched, setHasFetched] = useState(false)

    // Fetch predictions when user hovers over the station (only once per hover session)
    useEffect(() => {
      if (!hovered || loadingPredictions || hasFetched) return

      const fetchPredictions = async () => {
        try {
          setLoadingPredictions(true)
          // NOTE: Predictions are NEVER cached - always fetched fresh from API
          console.log(`Fetching predictions for stop: ${stop.id}`)
          const response = await getPredictionsForStop(stop.id)
          const allPredictions = response.predictions || []
          const includedStops = response.included || []
          
          console.log(`Received ${allPredictions.length} predictions for stop ${stop.id}`)
          
          // Process predictions for this stop
          const stopPredictions = processPredictionsForStop(
            allPredictions,
            stop.id,
            stopName,
            latitude,
            longitude,
            includedStops
          )
          
          console.log(`Processed ${stopPredictions.length} predictions for stop ${stop.id}`)
          setPredictions(stopPredictions)
          setHasFetched(true)
        } catch (error) {
          console.error(`Error loading predictions for stop ${stop.id}:`, error)
          console.error('Error details:', error.response?.data || error.message)
          setPredictions([])
          setHasFetched(true)
        } finally {
          setLoadingPredictions(false)
        }
      }

      fetchPredictions()
    }, [hovered, stop.id, stopName, latitude, longitude, loadingPredictions, hasFetched])

    // Reset fetch flag when hover ends
    useEffect(() => {
      if (!hovered) {
        setHasFetched(false)
        setPredictions([])
      }
    }, [hovered])

    // Clean stop name - remove numbers
    const cleanedStopName = useMemo(() => {
      if (typeof stopName === 'string') {
        return stopName.replace(/\d+/g, '').replace(/\s+/g, ' ').trim()
      }
      return stopName
    }, [stopName])

    // Memoize tooltip content to prevent flickering
    const tooltipContent = useMemo(() => (
      <div className="station-tooltip">
        <div className="station-tooltip-name">
          {cleanedStopName}
        </div>
        {loadingPredictions ? (
          <div className="station-tooltip-loading">
            Loading predictions...
          </div>
        ) : predictions.length > 0 ? (
          <div className="station-tooltip-predictions">
            <div style={{ fontSize: '11px', fontWeight: 'bold', marginBottom: '4px' }}>
              Next Trains:
            </div>
            {predictions.map((pred, index) => {
              const originalRouteId = pred.routeId || 'Train'
              // Normalize route ID - treat Mattapan as Red Line
              const normalizedRouteId = originalRouteId.toLowerCase().includes('mattapan') 
                ? 'Red' 
                : originalRouteId
              const direction = getDirectionName(normalizedRouteId, pred.directionId)
              return (
                <div 
                  key={index} 
                  style={{ 
                    fontSize: '12px', 
                    marginBottom: '2px',
                    padding: '1px 0'
                  }}
                >
                  <span style={{ fontWeight: 'bold' }}>{normalizedRouteId}</span>
                  {direction && <span style={{ color: '#666' }}> {direction}</span>}
                  {' - '}
                  <span style={{ fontWeight: 'bold', color: '#0066cc' }}>
                    {formatPredictionTime(pred.diffMinutes)}
                  </span>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="station-tooltip-no-predictions">
            No predictions available
          </div>
        )}
      </div>
    ), [cleanedStopName, loadingPredictions, predictions])

    // Use callbacks to prevent re-renders
    const handleMouseOver = useCallback(() => {
      setHovered(true)
    }, [])

    const handleMouseOut = useCallback(() => {
      setHovered(false)
    }, [])

    return (
      <CircleMarker
        center={[latitude, longitude]}
        radius={STATION_MARKER_CONFIG.radius}
        fillColor={STATION_MARKER_CONFIG.fillColor}
        fillOpacity={STATION_MARKER_CONFIG.fillOpacity}
        color={STATION_MARKER_CONFIG.color}
        weight={STATION_MARKER_CONFIG.weight}
        opacity={STATION_MARKER_CONFIG.opacity}
        eventHandlers={{
          mouseover: handleMouseOver,
          mouseout: handleMouseOut
        }}
      >
        <Tooltip 
          permanent={false} 
          direction="top" 
          offset={[0, -10]} 
          opacity={0.95}
          interactive={true}
          sticky={true}
        >
          {tooltipContent}
        </Tooltip>
      </CircleMarker>
    )
  }

  return (
    <div className="map-container">
      <MapContainer
        center={MAP_CONFIG.center}
        zoom={MAP_CONFIG.zoom}
        minZoom={MAP_CONFIG.minZoom}
        maxZoom={MAP_CONFIG.maxZoom}
        style={{ height: '100%', width: '100%' }}
        ref={mapRef}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Draw route polylines */}
        {decodedShapes.map((shape) => {
          // Make Blue line more visible with higher opacity and weight
          const isBlueLine = shape.routeId === 'Blue'
          return (
            <Polyline
              key={shape.id}
              positions={shape.coordinates}
              color={shape.color}
              weight={isBlueLine ? 8 : 6}
              opacity={isBlueLine ? 1.0 : 0.9}
            />
          )
        })}
        
        {/* Draw station markers as white circles (MBTA style) */}
        {stops && stops.map((stop) => {
          // MBTA API returns latitude/longitude directly in attributes
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

export default MapComponent
