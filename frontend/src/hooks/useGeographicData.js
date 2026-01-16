/**
 * Custom hook for loading and managing geographic data.
 * Centralizes the geographic data loading logic.
 */
import { useState, useEffect } from 'react'
import {
  getLines,
  getAllSubwayRoutes,
  getAllStopsForRoutes,
  getAllShapesForRoutes,
} from '../services/api'

const useGeographicData = () => {
  const [geographicData, setGeographicData] = useState({
    lines: [],
    routes: [],
    stops: [],
    shapes: [],
    loaded: false,
    loading: false,
    error: null
  })

  useEffect(() => {
    const loadGeographicData = async () => {
      try {
        setGeographicData(prev => ({ ...prev, loading: true }))
        
        // Stage 1: Load lines and routes first (needed for colors)
        const [linesData, routesResponse] = await Promise.all([
          getLines(),
          getAllSubwayRoutes()
        ])
        
        const routesData = routesResponse.routes || []
        
        // Extract line data from included array and merge with lines
        const includedLines = (routesResponse.included || []).filter(
          (item) => item.type === 'line'
        )
        
        // Merge included lines with existing lines (avoid duplicates)
        const allLineIds = new Set(linesData.map((l) => l.id))
        includedLines.forEach((line) => {
          if (!allLineIds.has(line.id)) {
            linesData.push(line)
            allLineIds.add(line.id)
          }
        })

        // Show lines and routes immediately (progressive loading)
        setGeographicData(prev => ({
          ...prev,
          lines: linesData,
          routes: routesData
        }))

        if (routesData.length === 0) {
          setGeographicData(prev => ({ ...prev, loading: false }))
          return
        }

        const routeIds = routesData
          .map((r) => r?.id)
          .filter(id => typeof id === 'string' && id.length > 0)

        // Stage 2: Load stops and shapes in parallel
        const [stopsData, shapesResponse] = await Promise.all([
          getAllStopsForRoutes(routeIds),
          getAllShapesForRoutes(routeIds)
        ])
        
        const finalStops = stopsData || []
        const shapesData = shapesResponse.shapes || []
        
        // Extract route data from included array and merge with routes
        let finalRoutes = routesData
        const includedRoutes = (shapesResponse.included || []).filter(
          (item) => item.type === 'route'
        )
        if (includedRoutes.length > 0) {
          const existingRouteIds = new Set(routesData.map((r) => r.id))
          const newRoutes = includedRoutes.filter(
            (r) => !existingRouteIds.has(r.id)
          )
          if (newRoutes.length > 0) {
            finalRoutes = [...routesData, ...newRoutes]
          }
        }
        
        // Set the complete shared geographic data
        setGeographicData({
          lines: linesData,
          routes: finalRoutes,
          stops: finalStops,
          shapes: shapesData,
          loaded: true,
          loading: false
        })
      } catch (error) {
        console.error('Error loading geographic data:', error)
        setGeographicData(prev => ({ 
          ...prev, 
          loading: false,
          error: error
        }))
      }
    }

    // Start loading immediately on app startup (only once)
    loadGeographicData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return geographicData
}

export default useGeographicData
