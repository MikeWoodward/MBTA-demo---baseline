import React, { useState, useEffect } from 'react'
import Tabs from './components/Tabs'
import ArrivalTimesTab from './components/ArrivalTimesTab'
import RouteDiagramTab from './components/RouteDiagramTab'
import AboutTab from './components/AboutTab'
import useGeographicData from './hooks/useGeographicData'
import api from './services/api'

function App() {
  const [activeTab, setActiveTab] = useState('arrival-times')
  const [error, setError] = useState(null)
  
  // Load all geographic data once on app startup (shared by both tabs)
  const geographicData = useGeographicData()
  
  // Catch any errors in geographic data loading
  useEffect(() => {
    if (geographicData.error) {
      setError(geographicData.error)
    }
  }, [geographicData.error])


  const renderTabContent = () => {
    switch (activeTab) {
      case 'arrival-times':
        return <ArrivalTimesTab geographicData={geographicData} />
      case 'route-diagram':
        return <RouteDiagramTab geographicData={geographicData} />
      case 'about':
        return <AboutTab />
      default:
        return <ArrivalTimesTab geographicData={geographicData} />
    }
  }

  return (
    <div id="root">
      <div className="app-header">
        <h1 className="app-title">Mike on the MBTA</h1>
      </div>
      <Tabs activeTab={activeTab} onTabChange={setActiveTab} />
      <div className="tab-content">
        {error ? (
          <div style={{ padding: '20px', textAlign: 'center', color: 'red' }}>
            Error loading data: {error.message || String(error)}
          </div>
        ) : geographicData.loading ? (
          <div style={{ padding: '20px', textAlign: 'center' }}>
            Loading subway data...
          </div>
        ) : (
          renderTabContent()
        )}
      </div>
    </div>
  )
}

export default App
