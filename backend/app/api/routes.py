"""API route handlers for MBTA data."""
import traceback
from fastapi import APIRouter, HTTPException, Query
from typing import List, Dict, Any, Optional
from ..services.mbta_client import mbta_client

router = APIRouter(prefix="/api", tags=["mbta"])


@router.get("/lines")
async def get_lines() -> Dict[str, Any]:
    """Get all subway lines."""
    try:
        lines = await mbta_client.get_subway_lines()
        return {"data": lines}
    except Exception as e:
        tb = traceback.extract_tb(e.__traceback__)
        line_no = tb[-1].lineno if tb else "unknown"
        print(f"Exception at line {line_no}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching lines: {str(e)}"
        )


@router.get("/routes/{line_id}")
async def get_routes_for_line(line_id: str) -> Dict[str, Any]:
    """Get routes for a specific line. Includes line relationships for colors."""
    try:
        routes_response = await mbta_client.get_routes_for_line(line_id)
        return {
            "data": routes_response.get("data", []),
            "included": routes_response.get("included", [])
        }
    except Exception as e:
        tb = traceback.extract_tb(e.__traceback__)
        line_no = tb[-1].lineno if tb else "unknown"
        print(f"Exception at line {line_no}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching routes for line {line_id}: {str(e)}"
        )


@router.get("/routes")
async def get_all_subway_routes() -> Dict[str, Any]:
    """Get all subway routes (for route diagram)."""
    try:
        routes_response = await mbta_client.get_all_subway_routes()
        return {
            "data": routes_response.get("data", []),
            "included": routes_response.get("included", [])
        }
    except Exception as e:
        tb = traceback.extract_tb(e.__traceback__)
        line_no = tb[-1].lineno if tb else "unknown"
        print(f"Exception at line {line_no}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching all subway routes: {str(e)}"
        )


@router.get("/stops/{route_id}")
async def get_stops_for_route(route_id: str) -> Dict[str, Any]:
    """Get stops for a specific route."""
    try:
        stops = await mbta_client.get_stops_for_route(route_id)
        return {"data": stops}
    except Exception as e:
        tb = traceback.extract_tb(e.__traceback__)
        line_no = tb[-1].lineno if tb else "unknown"
        print(f"Exception at line {line_no}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching stops for route {route_id}: {str(e)}"
        )


@router.get("/stops")
async def get_all_stops_for_routes(
    route_ids: Optional[str] = Query(None)
) -> Dict[str, Any]:
    """
    Get all stops for multiple routes (for route diagram).
    
    Args:
        route_ids: Comma-separated route IDs (query parameter)
    """
    try:
        if not route_ids:
            raise HTTPException(
                status_code=400,
                detail="route_ids parameter is required"
            )
        route_ids_list = [r.strip() for r in route_ids.split(",")]
        stops = await mbta_client.get_all_stops_for_routes(route_ids_list)
        return {"data": stops}
    except HTTPException:
        raise
    except Exception as e:
        tb = traceback.extract_tb(e.__traceback__)
        line_no = tb[-1].lineno if tb else "unknown"
        print(f"Exception at line {line_no}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching stops: {str(e)}"
        )


@router.get("/predictions/{route_id}")
async def get_predictions_for_route(
    route_id: str
) -> Dict[str, Any]:
    """
    Get predictions for a specific route. Includes stop data for matching.
    
    NOTE: Predictions are NEVER cached - always fetched fresh from API.
    """
    try:
        predictions_response = await mbta_client.get_predictions_for_route(route_id)
        return {
            "data": predictions_response.get("data", []),
            "included": predictions_response.get("included", [])
        }
    except Exception as e:
        tb = traceback.extract_tb(e.__traceback__)
        line_no = tb[-1].lineno if tb else "unknown"
        print(f"Exception at line {line_no}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching predictions for route {route_id}: {str(e)}"
        )


@router.get("/predictions/stop/{stop_id}")
async def get_predictions_for_stop(
    stop_id: str
) -> Dict[str, Any]:
    """
    Get predictions for a specific stop.
    
    NOTE: Predictions are NEVER cached - always fetched fresh from API.
    """
    try:
        predictions_response = await mbta_client.get_predictions_for_stop(stop_id)
        return {
            "data": predictions_response.get("data", []),
            "included": predictions_response.get("included", [])
        }
    except Exception as e:
        tb = traceback.extract_tb(e.__traceback__)
        line_no = tb[-1].lineno if tb else "unknown"
        print(f"Exception at line {line_no}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching predictions for stop {stop_id}: {str(e)}"
        )


@router.get("/shapes/{route_id}")
async def get_shapes_for_route(route_id: str) -> Dict[str, Any]:
    """Get shapes (polylines) for a specific route."""
    try:
        shapes = await mbta_client.get_shapes_for_route(route_id)
        return {"data": shapes}
    except Exception as e:
        tb = traceback.extract_tb(e.__traceback__)
        line_no = tb[-1].lineno if tb else "unknown"
        print(f"Exception at line {line_no}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching shapes for route {route_id}: {str(e)}"
        )


@router.get("/shapes")
async def get_all_shapes_for_routes(
    route_ids: Optional[str] = Query(None)
) -> Dict[str, Any]:
    """
    Get all shapes for multiple routes (for route diagram).
    Returns shapes with route information for color mapping.
    
    Args:
        route_ids: Comma-separated route IDs (query parameter)
    """
    try:
        if not route_ids:
            raise HTTPException(
                status_code=400,
                detail="route_ids parameter is required"
            )
        route_ids_list = [r.strip() for r in route_ids.split(",")]
        shapes_response = await mbta_client.get_all_shapes_for_routes(route_ids_list)
        return {
            "data": shapes_response.get("data", []),
            "included": []  # Shapes don't have included relationships, route_id is in attributes
        }
    except HTTPException:
        raise
    except Exception as e:
        tb = traceback.extract_tb(e.__traceback__)
        line_no = tb[-1].lineno if tb else "unknown"
        print(f"Exception at line {line_no}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching shapes: {str(e)}"
        )


@router.get("/alerts/{line_id}")
async def get_alerts_for_line(line_id: str) -> Dict[str, Any]:
    """
    Get alerts for a subway line.
    
    First fetches routes for the line, then gets alerts for those routes.
    """
    try:
        # First get routes for the line
        routes_response = await mbta_client.get_routes_for_line(line_id)
        routes_data = routes_response.get("data", [])
        if not routes_data:
            return {"data": []}
        
        # Extract route IDs
        route_ids = [route.get("id") for route in routes_data if route.get("id")]
        
        # Get alerts for those routes
        alerts = await mbta_client.get_alerts_for_line(route_ids)
        return {"data": alerts}
    except Exception as e:
        tb = traceback.extract_tb(e.__traceback__)
        line_no = tb[-1].lineno if tb else "unknown"
        print(f"Exception at line {line_no}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching alerts for line {line_id}: {str(e)}"
        )


@router.get("/facilities/{stop_id}")
async def get_facilities_for_stop(stop_id: str) -> Dict[str, Any]:
    """Get facilities (elevators, escalators, etc.) for a specific stop."""
    try:
        facilities = await mbta_client.get_facilities_for_stop(stop_id)
        return {"data": facilities}
    except Exception as e:
        tb = traceback.extract_tb(e.__traceback__)
        line_no = tb[-1].lineno if tb else "unknown"
        print(f"Exception at line {line_no}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching facilities for stop {stop_id}: {str(e)}"
        )


