import React from 'react'

const AboutTab = () => {
  return (
    <div className="about-container">
      <h1>MBTA Subway Arrival Times</h1>
      
      <div className="about-section">
        <h2>About This App</h2>
        <p>
          This application provides real-time information about MBTA subway arrival times
          and displays the complete MBTA subway system route diagram. Users can select
          a subway line to view arrival predictions, station locations, and service alerts.
        </p>
      </div>

      <div className="about-section">
        <h2>Features</h2>
        <ul>
          <li>Real-time arrival predictions for MBTA subway trains</li>
          <li>Interactive map showing selected subway line with stations</li>
          <li>Subway lines displayed using official MBTA colors (Green Line is green, Red Line is red, Orange Line is orange, Blue Line is blue)</li>
          <li>Service alerts displayed for each line, sorted by severity</li>
          <li>Complete route diagram showing all MBTA subway lines with their official colors</li>
          <li>Large, readable station names and arrival times</li>
        </ul>
      </div>

      <div className="about-section">
        <h2>Technology Stack</h2>
        <ul>
          <li><strong>Backend:</strong> FastAPI (Python) - RESTful API server</li>
          <li><strong>Frontend:</strong> React - User interface framework</li>
          <li><strong>Maps:</strong> Leaflet & React-Leaflet - Interactive map visualization</li>
          <li><strong>HTTP Client:</strong> Axios - API communication</li>
        </ul>
      </div>

      <div className="about-section">
        <h2>Data Source</h2>
        <p>
          This application uses the <a href="https://www.mbta.com/developers/v3-api" target="_blank" rel="noopener noreferrer">MBTA V3 API</a> to fetch
          real-time transit data including routes, stops, predictions, shapes, and alerts.
          All data is provided by the Massachusetts Bay Transportation Authority (MBTA).
        </p>
        <p>
          The MBTA V3 API follows the JSON:API specification and provides access to
          General Transit Feed Specification (GTFS) and GTFS Realtime data.
        </p>
      </div>

      <div className="about-section author-info">
        <h2>Author</h2>
        <p>
          This application was developed as a demonstration project for displaying
          MBTA subway information with real-time arrival predictions and route visualization.
        </p>
        <p>
          For questions or issues, please refer to the MBTA Developer documentation
          or contact the development team.
        </p>
      </div>
    </div>
  )
}

export default AboutTab
