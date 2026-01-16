import React from 'react'

const LineSelector = ({ lines, selectedLine, onLineChange, loading }) => {
  if (loading) {
    return (
      <div className="line-selector-container">
        <select className="line-selector" disabled>
          <option>Loading lines...</option>
        </select>
      </div>
    )
  }

  return (
    <div className="line-selector-container">
      <select
        className="line-selector"
        value={selectedLine || ''}
        onChange={(e) => onLineChange(e.target.value)}
      >
        <option value="">Select a subway line...</option>
        {lines.map((line) => (
          <option key={line.id} value={line.id}>
            {line.attributes?.long_name || line.id}
          </option>
        ))}
      </select>
    </div>
  )
}

export default LineSelector
