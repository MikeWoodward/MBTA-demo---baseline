/**
 * Utility functions for getting route colors.
 */

/**
 * Normalize route ID - treat Mattapan Trolley routes as Red Line.
 * @param {string} routeId - Route ID
 * @returns {string} Normalized route ID (Mattapan routes become "Red")
 */
export const normalizeRouteId = (routeId) => {
  if (typeof routeId !== 'string') return routeId
  
  // Check if this is a Mattapan Trolley route
  // Mattapan routes typically have "Mattapan" in the ID or are route type 0/1 with line-Mattapan
  if (routeId.toLowerCase().includes('mattapan')) {
    return 'Red'
  }
  
  return routeId
}

/**
 * Get line color for a route.
 * MBTA subway lines use color names: Green Line is green, Red Line is red, etc.
 * @param {string} routeId - Route ID
 * @param {Array} routes - Array of route objects
 * @param {Array} lines - Array of line objects
 * @returns {string} Hex color code
 */
export const getRouteColor = (routeId, routes, lines) => {
  // Type checking
  if (typeof routeId !== 'string') return '#007bff'
  if (!Array.isArray(routes) || routes.length === 0) return '#007bff'
  if (!Array.isArray(lines) || lines.length === 0) return '#007bff'
  
  // Find the route (try original ID first, then normalized)
  let route = routes.find((r) => r && r.id === routeId)
  
  // If not found and it might be a Mattapan route, try to find it
  if (!route) {
    const normalizedId = normalizeRouteId(routeId)
    if (normalizedId !== routeId) {
      // Try to find any route that belongs to Red Line
      route = routes.find((r) => {
        const lineId = r?.relationships?.line?.data?.id
        return lineId === 'line-Red'
      })
    }
  }
  
  if (!route) return '#007bff'
  
  // Get the line ID from the route's relationships or attributes
  const lineId = route.relationships?.line?.data?.id || 
                 route.attributes?.line_id
  
  if (!lineId) {
    // Fallback to route color if no line relationship
    if (route?.attributes?.color) {
      return `#${route.attributes.color}`
    }
    return '#007bff'
  }
  
  // Find the line and use its color (this ensures Green Line is green, Red Line is red, etc.)
  const line = lines.find((l) => l.id === lineId)
  if (line?.attributes?.color) {
    return `#${line.attributes.color}`
  }
  
  // Final fallback
  return '#007bff'
}
