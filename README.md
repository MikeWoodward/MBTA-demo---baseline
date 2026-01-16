# MBTA Subway Arrival Times App

A web application that displays MBTA subway line maps with real-time arrival predictions, route diagrams, and service alerts. The app features an interactive map with subway lines displayed using their official MBTA colors (Green Line is green, Red Line is red, Orange Line is orange, Blue Line is blue).

![MBTA Subway Arrival Times App](Screenshot%202026-01-16%20at%2015.31.19.png)

You can watch a video of the app here: [link](https://github.com/MikeWoodward/MBTA-demo---baseline/blob/main/Screen%20Recording%202026-01-16%20at%2015.39.12.mov)

## Features

### Arrival Times Tab
- **Line Selection**: Dropdown to select any MBTA subway line (Red, Orange, Blue, Green)
- **Red Line Includes Mattapan Trolley**: The Mattapan Trolley is treated as part of the Red Line system
- **Interactive Map**: 
  - Displays the selected subway line with its official color
  - White circle markers for each station (MBTA style)
  - Auto-zooms to fit the full extent of the selected line
  - Faded map background for better line visibility
  - Map tiles fetched directly from OpenStreetMap
- **Real-time Predictions**: Hover over any station circle to see:
  - Next 5 trains arriving at that station
  - Route and direction information (Mattapan stations show as "Red Line")
  - Arrival times (e.g., "3 min", "Due", "Arriving")
- **Service Alerts**: Panel below the map showing alerts for the selected line, ordered by severity (most severe first)

### Route Diagram Tab
- **Complete System View**: Displays all MBTA subway lines simultaneously
- **Color-coded Lines**: Each line uses its official MBTA color
- **All Stations**: Shows all subway stations across the system
- **Auto-zoom**: Automatically adjusts to show the full subway system
- **Station Facilities**: Hover over any station to see facility information (elevators, escalators, etc.)
  - Clean, formatted facility names (numbers, brackets, and duplicates removed)
  - Proper capitalization for better readability

### About Tab
- Information about the app, technology stack, data sources, and authorship

## Technology Stack

### Backend
- **FastAPI** (0.104.1) - Python web framework for building the API
- **Uvicorn** (0.24.0) - ASGI server for running FastAPI
- **httpx** (0.25.1) - Async HTTP client for MBTA API requests
- **python-dotenv** (1.0.0) - Environment variable management

### Frontend
- **React** (18.2.0) - UI framework
- **Leaflet** (1.9.4) & **React-Leaflet** (4.2.1) - Interactive map visualization
- **Axios** (1.6.2) - HTTP client for API communication
- **Vite** (5.0.8) - Build tool and development server

## Setup Instructions

### Prerequisites
- Python 3.8+ (Python 3.12 recommended)
- Node.js 16+ and npm
- MBTA API key (get one at https://api-v3.mbta.com/)

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Create a `.env` file in the **root** directory (same level as `backend` and `frontend` folders):
```bash
# From the project root directory
echo "MBTA_API_KEY=your_mbta_api_key_here" > .env
```

Or manually create `.env` in the root directory with:
```
MBTA_API_KEY=your_mbta_api_key_here
```

5. Run the backend server:
```bash
# From the backend directory
uvicorn app.main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

The app will be available at `http://localhost:5173` (Vite default port)

## Running the Application

1. Start the backend server (from `backend` directory):
```bash
source venv/bin/activate  # If not already activated
uvicorn app.main:app --reload --port 8000
```

2. Start the frontend server (from `frontend` directory, in a new terminal):
```bash
npm run dev
```

3. Open your browser to `http://localhost:5173`

## Project Structure

```
/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py              # FastAPI app entry point with CORS setup
│   │   ├── api/
│   │   │   ├── __init__.py
│   │   │   └── routes.py        # API route handlers
│   │   └── services/
│   │       ├── __init__.py
│   │       ├── cache_manager.py  # Data caching utilities
│   │       └── mbta_client.py    # MBTA API client with async requests
│   ├── requirements.txt
│   └── venv/                     # Virtual environment (not in git)
├── frontend/
│   ├── src/
│   │   ├── App.jsx              # Main app component with tab navigation
│   │   ├── main.jsx             # React entry point
│   │   ├── components/          # React components
│   │   │   ├── AboutTab.jsx
│   │   │   ├── AlertsPanel.jsx
│   │   │   ├── ArrivalTimesTab.jsx
│   │   │   ├── LineSelector.jsx
│   │   │   ├── Map.jsx          # Map component for arrival times
│   │   │   ├── RouteDiagram.jsx # Map component for route diagram
│   │   │   ├── RouteDiagramTab.jsx
│   │   │   ├── StationMarker.jsx # Station marker with facilities tooltip
│   │   │   └── Tabs.jsx
│   │   ├── services/
│   │   │   └── api.js           # Backend API client
│   │   ├── utils/               # Utility functions
│   │   │   ├── constants.js     # App constants
│   │   │   ├── facilities.js    # Facility formatting utilities
│   │   │   ├── polyline.js      # Polyline decoding
│   │   │   ├── predictions.js   # Prediction processing
│   │   │   └── routeColors.js   # Route color logic
│   │   └── styles/
│   │       └── App.css          # Main styles
│   ├── package.json
│   ├── vite.config.js           # Vite configuration with proxy
│   └── index.html
├── .env                          # MBTA_API_KEY (not in git)
└── README.md
```

## API Endpoints

The backend provides the following REST API endpoints:

- `GET /api/lines` - Get all subway lines
- `GET /api/routes/{line_id}` - Get routes for a specific line (includes line data)
- `GET /api/routes` - Get all subway routes (includes line data)
- `GET /api/stops/{route_id}` - Get stops for a specific route
- `GET /api/stops?route_ids=...` - Get stops for multiple routes (comma-separated)
- `GET /api/predictions/{route_id}` - Get predictions for a route (includes stop data)
- `GET /api/shapes/{route_id}` - Get shapes (polylines) for a route
- `GET /api/shapes?route_ids=...` - Get shapes for multiple routes (comma-separated)
- `GET /api/alerts/{line_id}` - Get alerts for a line (sorted by severity)
- `GET /api/facilities/{stop_id}` - Get facilities (elevators, escalators, etc.) for a stop

All endpoints return JSON:API format responses.

## Key Features & Implementation Details

### Performance Optimizations
- **Memoized computations**: Polyline decoding and prediction processing are memoized to avoid unnecessary recalculations
- **Parallel API calls**: Multiple API requests are made in parallel using `Promise.allSettled` for faster loading
- **Parallel shape fetching**: Backend fetches shapes for all routes in parallel using `asyncio.gather()` instead of sequential calls
- **Progressive data loading**: Frontend displays lines and routes immediately while stops and shapes load in the background
- **Extended cache**: MBTA data cache expires after 7 days (168 hours) to reduce API calls
- **Efficient data structures**: Predictions are pre-processed into Maps for O(1) lookup performance
- **Type safety**: Comprehensive type checking and validation throughout the codebase

### Map Features
- **Auto-zoom**: Automatically adjusts map bounds to show the full extent of selected lines
- **Faded background**: Map tiles are faded for better visibility of subway lines
- **Station markers**: White circle markers matching MBTA's official map style
- **Interactive tooltips**: Hover over stations to see real-time arrival predictions (Arrival Times) or facility information (Route Diagram)
- **Direct tile loading**: Map tiles are fetched directly from OpenStreetMap servers (no local caching)

### Code Organization
- **Utility modules**: Reusable functions extracted to `utils/` directory
- **Separation of concerns**: Business logic separated from UI components
- **Type validation**: All functions validate input types and handle edge cases

## Data Source

This application uses the [MBTA V3 API](https://www.mbta.com/developers/v3-api) to fetch real-time transit data. All data is provided by the Massachusetts Bay Transportation Authority (MBTA).

The app uses the following MBTA API endpoints:
- `/lines` - Subway line information
- `/routes` - Route information with line relationships
- `/stops` - Station/stop information
- `/predictions` - Real-time arrival predictions
- `/shapes` - Route polylines for map display
- `/alerts` - Service alerts and disruptions

## Data Caching

- **MBTA Data Cache**: Geographic data (lines, routes, stops, shapes) is cached locally for 7 days
- **Cache Location**: `backend/Data/` directory
- **Cache Files**: JSON files named by cache key (e.g., `subway_lines.json`, `all_subway_routes.json`)
- **Predictions**: Never cached - always fetched fresh from the MBTA API for real-time accuracy
- **Map Tiles**: No caching - fetched directly from OpenStreetMap servers

## Special Features

### Red Line and Mattapan Trolley
- The Mattapan Trolley is integrated as part of the Red Line system
- When selecting Red Line, both Red Line and Mattapan Trolley routes, stops, and shapes are displayed
- Mattapan stations are treated as Red Line stations (displayed as "Red" in predictions)
- When selecting other lines, Mattapan data is automatically filtered out

### Station Information Formatting
- **Station Names**: Numbers are automatically removed from station names for cleaner display
- **Facility Information**: 
  - Numbers, brackets, and station names are removed from facility descriptions
  - Duplicates are eliminated (case-insensitive)
  - Text is properly capitalized (title case)
  - Example: "Station [Elevator 1]" → "Elevator"

## Development Notes

- The backend loads the `.env` file from the project root directory
- CORS is enabled for local development (frontend on port 5173, backend on port 8000)
- The frontend uses Vite's proxy configuration to forward API requests to the backend
- All subway lines use their official MBTA colors for consistency
- Backend automatically reloads on code changes (uvicorn --reload)
- Frontend automatically reloads on code changes (Vite HMR)

## License

This project is for demonstration purposes.
