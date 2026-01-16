/**
 * Station marker component with hover tooltip showing facilities.
 * Used in RouteDiagram to display stations with facility information.
 */
import React, { useState, useEffect, useMemo } from 'react'
import { CircleMarker, Tooltip } from 'react-leaflet'
import { getFacilitiesForStop } from '../services/api'
import { STATION_MARKER_CONFIG } from '../utils/constants'
import { formatFacilitiesText } from '../utils/facilities'

const StationMarker = ({ stop, stopName, latitude, longitude }) => {
  const [facilities, setFacilities] = useState([])
  const [loadingFacilities, setLoadingFacilities] = useState(false)
  const [hovered, setHovered] = useState(false)

  // Fetch facilities when user hovers over the station
  useEffect(() => {
    if (!hovered || facilities.length > 0 || loadingFacilities) return

    const fetchFacilities = async () => {
      try {
        setLoadingFacilities(true)
        const facilitiesData = await getFacilitiesForStop(stop.id)
        setFacilities(facilitiesData || [])
      } catch (error) {
        console.error(`Error loading facilities for stop ${stop.id}:`, error)
        setFacilities([])
      } finally {
        setLoadingFacilities(false)
      }
    }

    fetchFacilities()
  }, [hovered, stop.id, facilities.length, loadingFacilities])

  // Format facilities text - remove station name, duplicates, and capitalize
  const facilitiesText = useMemo(() => {
    // Clean station name (remove numbers) for comparison
    const cleanStationName = typeof stopName === 'string' 
      ? stopName.replace(/\d+/g, '').replace(/\s+/g, ' ').trim()
      : stopName
    return formatFacilitiesText(facilities, loadingFacilities, cleanStationName)
  }, [facilities, loadingFacilities, stopName])

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
        mouseover: () => setHovered(true),
        mouseout: () => setHovered(false)
      }}
    >
      <Tooltip permanent={false} direction="top" offset={[0, -10]} opacity={0.95} interactive={true}>
        <div className="station-tooltip-name">
          {typeof stopName === 'string' 
            ? stopName.replace(/\d+/g, '').replace(/\s+/g, ' ').trim()
            : stopName}
        </div>
        <div className="station-tooltip-facilities">
          {facilitiesText}
        </div>
      </Tooltip>
    </CircleMarker>
  )
}

export default StationMarker
