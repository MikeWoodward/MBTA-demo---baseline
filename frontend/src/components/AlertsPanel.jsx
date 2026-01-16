import React from 'react'

const AlertsPanel = ({ alerts, loading }) => {
  if (loading) {
    return (
      <div className="alerts-panel">
        <h3>Service Alerts</h3>
        <p>Loading alerts...</p>
      </div>
    )
  }

  if (!alerts || alerts.length === 0) {
    return (
      <div className="alerts-panel">
        <h3>Service Alerts</h3>
        <div className="no-alerts">No alerts for this line</div>
      </div>
    )
  }

  // Sort alerts by severity (already sorted by backend, but ensure it here too)
  const sortedAlerts = [...alerts].sort((a, b) => {
    const severityA = a.attributes?.severity || 0
    const severityB = b.attributes?.severity || 0
    return severityB - severityA
  })

  const getSeverityClass = (severity) => {
    if (severity >= 7) return 'high-severity'
    if (severity >= 4) return 'medium-severity'
    return 'low-severity'
  }

  return (
    <div className="alerts-panel">
      <h3>Service Alerts</h3>
      {sortedAlerts.map((alert) => {
        const attrs = alert.attributes || {}
        const severity = attrs.severity || 0
        const header = attrs.short_header || attrs.header || 'Alert'
        const description = attrs.description || ''
        const serviceEffect = attrs.service_effect || ''
        const timeframe = attrs.timeframe || ''

        return (
          <div
            key={alert.id}
            className={`alert-item ${getSeverityClass(severity)}`}
          >
            <div className="alert-header">{header}</div>
            {description && (
              <div className="alert-description">{description}</div>
            )}
            {serviceEffect && (
              <div className="alert-effect">{serviceEffect}</div>
            )}
            {timeframe && (
              <div className="alert-timeframe">{timeframe}</div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default AlertsPanel
