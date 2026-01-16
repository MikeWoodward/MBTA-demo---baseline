import React, { useState, useEffect, useMemo } from 'react'
import LineSelector from './LineSelector'
import MapComponent from './Map'
import AlertsPanel from './AlertsPanel'
import {
  getRoutesForLine,
  getAlertsForLine,
  getStopsForRoute,
} from '../services/api'

const ArrivalTimesTab = ({ geographicData }) => {
  const [selectedLine, setSelectedLine] = useState(null)
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState({
    alerts: false,
  })

  // State for routes for selected line (needed because we need to fetch them)
  const [lineRoutes, setLineRoutes] = useState([])
  const [lineStops, setLineStops] = useState([])

  // Get routes and stops for selected line when it changes
  useEffect(() => {
    if (!selectedLine || !geographicData.loaded) {
      setLineRoutes([])
      setLineStops([])
      return
    }

    const fetchLineData = async () => {
      try {
        const routesResponse = await getRoutesForLine(selectedLine)
        const routes = routesResponse.routes || []
        setLineRoutes(routes)
        
        // Fetch stops for all routes in the line
        if (routes.length > 0) {
          const routeIds = routes
            .map(r => r?.id)
            .filter(id => typeof id === 'string' && id.length > 0)
          
          const allStops = []
          for (const routeId of routeIds) {
            try {
              const stops = await getStopsForRoute(routeId)
              if (Array.isArray(stops)) {
                allStops.push(...stops)
              }
            } catch (error) {
              console.error(`Error loading stops for route ${routeId}:`, error)
            }
          }
          
          // Remove duplicates by stop ID
          const uniqueStops = Array.from(
            new Map(allStops.map(stop => [stop.id, stop])).values()
          )
          setLineStops(uniqueStops)
        } else {
          setLineStops([])
        }
      } catch (error) {
        console.error('Error getting routes for line:', error)
        setLineRoutes([])
        setLineStops([])
      }
    }

    fetchLineData()
  }, [selectedLine, geographicData.loaded])

  // Filter geographic data by selected line routes
  const filteredData = useMemo(() => {
    if (!selectedLine || !geographicData.loaded || lineRoutes.length === 0) {
      return {
        routes: [],
        stops: [],
        shapes: []
      }
    }

    const routeIds = new Set(
      lineRoutes
        .map(r => r?.id)
        .filter(id => typeof id === 'string' && id.length > 0)
    )

    // Filter out Mattapan routes unless Red Line is selected
    const isRedLine = selectedLine === 'line-Red'
    const filteredRouteIds = new Set(routeIds)
    if (!isRedLine) {
      // Remove any Mattapan routes when not on Red Line
      filteredRouteIds.forEach(routeId => {
        if (typeof routeId === 'string' && routeId.toLowerCase().includes('mattapan')) {
          filteredRouteIds.delete(routeId)
        }
      })
    }

    // Use stops fetched directly for the routes, or fall back to filtering shared data
    const filteredStops = lineStops.length > 0 
      ? lineStops 
      : geographicData.stops.filter(stop => {
          const stopRouteId = stop.relationships?.route?.data?.id
          if (!stopRouteId) return false
          // Exclude Mattapan stops unless Red Line is selected
          if (!isRedLine && typeof stopRouteId === 'string' && stopRouteId.toLowerCase().includes('mattapan')) {
            return false
          }
          return filteredRouteIds.has(stopRouteId)
        })

    const filteredShapes = geographicData.shapes.filter(shape => {
      const shapeRouteId = shape.attributes?._route_id || 
                          shape.relationships?.route?.data?.id
      if (!shapeRouteId) return false
      // Exclude Mattapan shapes unless Red Line is selected
      if (!isRedLine && typeof shapeRouteId === 'string' && shapeRouteId.toLowerCase().includes('mattapan')) {
        return false
      }
      return filteredRouteIds.has(shapeRouteId)
    })

    return {
      routes: lineRoutes.filter(route => {
        const routeId = route?.id
        if (!routeId) return false
        // Exclude Mattapan routes unless Red Line is selected
        if (!isRedLine && typeof routeId === 'string' && routeId.toLowerCase().includes('mattapan')) {
          return false
        }
        return true
      }),
      stops: filteredStops,
      shapes: filteredShapes
    }
  }, [selectedLine, geographicData, lineRoutes, lineStops])

  // Load alerts when line is selected (predictions are loaded on station click)
  useEffect(() => {
    if (!selectedLine || !geographicData.loaded || lineRoutes.length === 0) {
      setAlerts([])
      return
    }

    const loadAlerts = async () => {
      try {
        setLoading({ alerts: true })
        
        const alertsResult = await getAlertsForLine(selectedLine).catch((error) => {
          console.error('Error loading alerts:', error)
          return []
        })
        
        if (Array.isArray(alertsResult)) {
          setAlerts(alertsResult)
        }
      } catch (error) {
        console.error('Error loading alerts:', error)
      } finally {
        setLoading({ alerts: false })
      }
    }

    loadAlerts()
  }, [selectedLine, geographicData.loaded, lineRoutes])

  return (
    <div className="arrival-times-container">
      <LineSelector
        lines={geographicData.lines}
        selectedLine={selectedLine}
        onLineChange={setSelectedLine}
        loading={geographicData.loading}
      />
      <MapComponent
        lines={geographicData.lines}
        routes={filteredData.routes}
        stops={filteredData.stops}
        shapes={filteredData.shapes}
      />
      <AlertsPanel
        alerts={alerts}
        loading={loading.alerts}
      />
    </div>
  )
}

export default ArrivalTimesTab
