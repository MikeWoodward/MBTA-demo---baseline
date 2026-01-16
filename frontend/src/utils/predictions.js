/**
 * Utility functions for processing and matching predictions.
 */

/**
 * Format prediction time difference for display.
 * @param {number} diffMinutes - Time difference in minutes
 * @returns {string} Formatted time string
 */
export const formatPredictionTime = (diffMinutes) => {
  if (diffMinutes < 0) return 'Arriving'
  if (diffMinutes === 0) return 'Due'
  return `${diffMinutes} min`
}

/**
 * Get direction name for a route and direction ID.
 * @param {string} routeId - Route ID
 * @param {number} directionId - Direction ID (0 or 1)
 * @returns {string} Direction name with " to " prefix
 */
export const getDirectionName = (routeId, directionId) => {
  if (directionId === undefined || directionId === null) return ''
  
  // Common direction names for MBTA routes
  const directionNames = {
    'Red': { 0: 'Alewife', 1: 'Ashmont/Braintree' },
    'Orange': { 0: 'Oak Grove', 1: 'Forest Hills' },
    'Blue': { 0: 'Wonderland', 1: 'Bowdoin' },
    'Green-B': { 0: 'Boston College', 1: 'Government Center' },
    'Green-C': { 0: 'Cleveland Circle', 1: 'Government Center' },
    'Green-D': { 0: 'Riverside', 1: 'Union Square' },
    'Green-E': { 0: 'Heath Street', 1: 'Medford/Tufts' },
  }
  
  const routeDirections = directionNames[routeId]
  if (routeDirections && routeDirections[directionId]) {
    return ` to ${routeDirections[directionId]}`
  }
  return ''
}

/**
 * Process and filter predictions for a stop.
 * @param {Array} predictions - All predictions
 * @param {string} stopId - Stop ID to match
 * @param {string} stopName - Stop name for matching
 * @param {number} stopLatitude - Stop latitude
 * @param {number} stopLongitude - Stop longitude
 * @param {Array} includedStops - Included stop data from API
 * @returns {Array} Processed and sorted predictions
 */
export const processPredictionsForStop = (
  predictions,
  stopId,
  stopName,
  stopLatitude,
  stopLongitude,
  includedStops = []
) => {
  // Type checking and validation
  if (!Array.isArray(predictions) || predictions.length === 0) return []
  if (typeof stopId !== 'string') return []
  if (typeof stopName !== 'string') stopName = ''
  if (typeof stopLatitude !== 'number' || typeof stopLongitude !== 'number') {
    // If coordinates are not numbers, we can't match by coordinates
    stopLatitude = null
    stopLongitude = null
  }
  if (!Array.isArray(includedStops)) includedStops = []
  
  // Create a map of included stops by ID for faster lookup
  const includedStopsMap = new Map()
  if (includedStops.length > 0) {
    includedStops.forEach((stop) => {
      if (stop && stop.id) {
        includedStopsMap.set(stop.id, stop)
      }
    })
  }
  
  // Filter predictions that match this stop
  const stopPredictions = predictions.filter((p) => {
    const predStopId = p.relationships?.stop?.data?.id
    
    // Try exact ID match first
    if (predStopId === stopId) return true
    
    // Try to match via included stop data
    const includedStop = includedStopsMap.get(predStopId)
    if (includedStop) {
      const incStopName = includedStop.attributes?.name
      const incStopLat = includedStop.attributes?.latitude
      const incStopLng = includedStop.attributes?.longitude
      
      // Match by name (case-insensitive)
      if (incStopName && stopName && 
          incStopName.toLowerCase() === stopName.toLowerCase()) {
        return true
      }
      
      // Match by coordinates (within small tolerance)
      if (typeof incStopLat === 'number' && typeof incStopLng === 'number' && 
          typeof stopLatitude === 'number' && typeof stopLongitude === 'number') {
        const latDiff = Math.abs(incStopLat - stopLatitude)
        const lngDiff = Math.abs(incStopLng - stopLongitude)
        if (latDiff < 0.0001 && lngDiff < 0.0001) {
          return true
        }
      }
    }
    
    return false
  })
  
  // Process and sort predictions by arrival time
  const now = new Date()
  const processedPredictions = stopPredictions
    .map((prediction) => {
      // Use arrival_time if available, otherwise use departure_time
      const timeStr = prediction.attributes?.arrival_time || 
                     prediction.attributes?.departure_time
      if (typeof timeStr !== 'string' || !timeStr) return null
      
      const time = new Date(timeStr)
      // Validate that the date is valid
      if (isNaN(time.getTime())) return null
      
      const diffMinutes = Math.round((time - now) / 60000)
      
      // Skip predictions that are more than 30 minutes in the past
      if (diffMinutes < -30) return null
      
      let routeId = prediction.relationships?.route?.data?.id
      const directionId = prediction.attributes?.direction_id
      
      // Normalize Mattapan Trolley route IDs to Red Line
      if (typeof routeId === 'string' && routeId.toLowerCase().includes('mattapan')) {
        routeId = 'Red'
      }
      
      return {
        time,
        diffMinutes,
        routeId,
        directionId,
        raw: prediction
      }
    })
    .filter(Boolean) // Remove null entries
    .sort((a, b) => a.time.getTime() - b.time.getTime()) // Sort by time
    .slice(0, 5) // Limit to next 5 trains
  
  return processedPredictions
}
