/**
 * Utility functions for formatting facility information.
 */

/**
 * Remove numbers from text.
 * 
 * @param {string} text - Text to clean
 * @returns {string} Text with numbers removed
 */
export const removeNumbers = (text) => {
  if (typeof text !== 'string' || !text) return text
  // Remove all digits
  return text.replace(/\d+/g, '').trim()
}

/**
 * Format facility type to readable text.
 * Converts "ELEVATOR" -> "Elevator", "ESCALATOR" -> "Escalator", etc.
 * 
 * @param {string} type - Facility type (e.g., "ELEVATOR", "ESCALATOR")
 * @returns {string} Formatted facility type
 */
export const formatFacilityType = (type) => {
  if (typeof type !== 'string' || !type) return null
  
  return type
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

/**
 * Remove text in brackets from description.
 * 
 * @param {string} text - Text to clean
 * @returns {string} Text with brackets and content removed
 */
export const removeBrackets = (text) => {
  if (typeof text !== 'string' || !text) return text
  // Remove text in brackets: [anything] or (anything)
  return text.replace(/\[[^\]]*\]/g, '').replace(/\([^)]*\)/g, '').trim()
}

/**
 * Extract facility description from facility object.
 * Tries multiple attributes to get a meaningful description.
 * Removes numbers and brackets from the description.
 * 
 * @param {Object} facility - Facility object from MBTA API
 * @returns {string|null} Facility description or null
 */
export const getFacilityDescription = (facility) => {
  if (!facility || typeof facility !== 'object') return null
  
  const attrs = facility.attributes || {}
  
  let description = null
  if (attrs.long_name) {
    description = attrs.long_name
  } else if (attrs.short_name) {
    description = attrs.short_name
  } else if (attrs.type) {
    description = formatFacilityType(attrs.type)
  }
  
  if (description) {
    // Remove text in brackets first
    description = removeBrackets(description)
    // Remove numbers from description
    description = removeNumbers(description)
    // Clean up extra spaces
    description = description.replace(/\s+/g, ' ').trim()
  }
  
  return description
}

/**
 * Capitalize text appropriately (title case).
 * 
 * @param {string} text - Text to capitalize
 * @returns {string} Capitalized text
 */
export const capitalizeText = (text) => {
  if (typeof text !== 'string' || !text) return text
  
  // Split by spaces and capitalize each word
  return text
    .split(' ')
    .map(word => {
      if (!word) return word
      // Capitalize first letter, lowercase the rest
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    })
    .join(' ')
}

/**
 * Remove station name from facility description.
 * 
 * @param {string} description - Facility description
 * @param {string} stationName - Station name to remove
 * @returns {string} Description with station name removed
 */
export const removeStationName = (description, stationName) => {
  if (typeof description !== 'string' || !description) return description
  if (typeof stationName !== 'string' || !stationName) return description
  
  // Clean both strings for comparison
  const cleanDescription = description.toLowerCase().trim()
  const cleanStationName = stationName.toLowerCase().trim()
  
  // Remove station name if it appears in the description
  let result = description
  if (cleanDescription.includes(cleanStationName)) {
    // Remove station name (case-insensitive)
    const regex = new RegExp(cleanStationName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')
    result = result.replace(regex, '').trim()
    // Clean up extra spaces and punctuation
    result = result.replace(/\s+/g, ' ').replace(/^[,\s-]+|[,\s-]+$/g, '').trim()
  }
  
  return result
}

/**
 * Format facilities array into readable text.
 * Removes brackets, duplicates, numbers, and station name.
 * Capitalizes appropriately.
 * 
 * @param {Array} facilities - Array of facility objects
 * @param {boolean} loading - Whether facilities are currently loading
 * @param {string} stationName - Station name to remove from descriptions (optional)
 * @returns {string} Formatted facilities text
 */
export const formatFacilitiesText = (facilities, loading = false, stationName = null) => {
  if (loading) {
    return 'Loading facilities...'
  }
  
  if (!Array.isArray(facilities) || facilities.length === 0) {
    return 'No facility information available'
  }

  let descriptions = facilities
    .map(getFacilityDescription)
    .filter(Boolean)
    .filter(desc => desc.length > 0)

  // Remove station name from descriptions if provided
  if (stationName && typeof stationName === 'string') {
    const cleanStationName = stationName.replace(/\d+/g, '').replace(/\s+/g, ' ').trim()
    descriptions = descriptions.map(desc => removeStationName(desc, cleanStationName))
      .filter(desc => desc && desc.length > 0)
  }

  // Remove any remaining brackets (in case they weren't caught earlier)
  descriptions = descriptions.map(desc => removeBrackets(desc))
    .filter(desc => desc && desc.length > 0)

  if (descriptions.length === 0) {
    return 'No facility information available'
  }

  // Remove duplicates (case-insensitive)
  const uniqueDescriptions = Array.from(
    new Map(
      descriptions.map(desc => [desc.toLowerCase().trim(), desc])
    ).values()
  )

  // Capitalize appropriately and join
  const capitalizedDescriptions = uniqueDescriptions
    .map(desc => capitalizeText(desc.trim()))
    .filter(desc => desc.length > 0)

  return capitalizedDescriptions.join(', ')
}
