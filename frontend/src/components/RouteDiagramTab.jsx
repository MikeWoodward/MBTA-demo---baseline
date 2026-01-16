import React from 'react'
import RouteDiagram from './RouteDiagram'

const RouteDiagramTab = ({ geographicData }) => {
  return (
    <RouteDiagram
      lines={geographicData.lines}
      routes={geographicData.routes}
      stops={geographicData.stops}
      shapes={geographicData.shapes}
    />
  )
}

export default RouteDiagramTab
