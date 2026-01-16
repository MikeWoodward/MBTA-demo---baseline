/** Backend API client for MBTA data. */
import axios from 'axios'

const API_BASE_URL = '/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

/**
 * Get all subway lines.
 */
export const getLines = async () => {
  const response = await api.get('/lines')
  return response.data.data
}

/**
 * Get routes for a specific line.
 * Returns both routes and included line data.
 */
export const getRoutesForLine = async (lineId) => {
  const response = await api.get(`/routes/${lineId}`)
  const routes = response.data.data || []
  const included = response.data.included || []
  
  return {
    routes: routes,
    included: included
  }
}

/**
 * Get all subway routes (for route diagram).
 * Returns both routes and included line data.
 */
export const getAllSubwayRoutes = async () => {
  const response = await api.get('/routes')
  return {
    routes: response.data.data,
    included: response.data.included || []
  }
}

/**
 * Get stops for a specific route.
 */
export const getStopsForRoute = async (routeId) => {
  const response = await api.get(`/stops/${routeId}`)
  return response.data.data
}

/**
 * Get all stops for multiple routes (for route diagram).
 */
export const getAllStopsForRoutes = async (routeIds) => {
  if (!Array.isArray(routeIds) || routeIds.length === 0) {
    return []
  }
  const routeIdsStr = routeIds.join(',')
  const response = await api.get('/stops', {
    params: { route_ids: routeIdsStr }
  })
  return response.data.data || []
}

/**
 * Get predictions for a specific route.
 * Returns both predictions and included stop data.
 * 
 * NOTE: Predictions are NEVER cached - always fetched fresh from API.
 */
export const getPredictionsForRoute = async (routeId) => {
  const response = await api.get(`/predictions/${routeId}`)
  return {
    predictions: response.data.data || [],
    included: response.data.included || []
  }
}

/**
 * Get predictions for a specific stop.
 * Returns both predictions and included stop/route data.
 * 
 * NOTE: Predictions are NEVER cached - always fetched fresh from API.
 */
export const getPredictionsForStop = async (stopId) => {
  const response = await api.get(`/predictions/stop/${stopId}`)
  return {
    predictions: response.data.data || [],
    included: response.data.included || []
  }
}

/**
 * Get shapes for a specific route.
 */
export const getShapesForRoute = async (routeId) => {
  const response = await api.get(`/shapes/${routeId}`)
  return response.data.data
}

/**
 * Get all shapes for multiple routes (for route diagram).
 * Returns both shapes and included route data.
 */
export const getAllShapesForRoutes = async (routeIds) => {
  if (!Array.isArray(routeIds) || routeIds.length === 0) {
    return { shapes: [], included: [] }
  }
  const routeIdsStr = routeIds.join(',')
  const response = await api.get('/shapes', {
    params: { route_ids: routeIdsStr }
  })
  return {
    shapes: response.data.data || [],
    included: response.data.included || []
  }
}

/**
 * Get alerts for a subway line.
 */
export const getAlertsForLine = async (lineId) => {
  const response = await api.get(`/alerts/${lineId}`)
  return response.data.data
}

/**
 * Get facilities (elevators, escalators, etc.) for a specific stop.
 */
export const getFacilitiesForStop = async (stopId) => {
  const response = await api.get(`/facilities/${stopId}`)
  return response.data.data || []
}

// Export the axios instance as default for direct API calls
export default api
