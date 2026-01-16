import React from 'react'

const Tabs = ({ activeTab, onTabChange }) => {
  return (
    <div className="tabs-container">
      <button
        className={`tab-button ${activeTab === 'arrival-times' ? 'active' : ''}`}
        onClick={() => onTabChange('arrival-times')}
      >
        Arrival Times
      </button>
      <button
        className={`tab-button ${activeTab === 'route-diagram' ? 'active' : ''}`}
        onClick={() => onTabChange('route-diagram')}
      >
        Route Diagram
      </button>
      <button
        className={`tab-button ${activeTab === 'about' ? 'active' : ''}`}
        onClick={() => onTabChange('about')}
      >
        About
      </button>
    </div>
  )
}

export default Tabs
