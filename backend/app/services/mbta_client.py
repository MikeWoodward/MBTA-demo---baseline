"""MBTA API client for fetching subway data."""
import asyncio
import os
import traceback
from pathlib import Path
from typing import Any, Dict, List, Optional
import httpx
from dotenv import load_dotenv
from .cache_manager import save_to_cache, load_from_cache

# Load .env file from root directory (one level up from backend/app/services)
root_dir = Path(__file__).parent.parent.parent.parent
env_path = root_dir / ".env"
load_dotenv(dotenv_path=env_path)

MBTA_API_BASE_URL = "https://api-v3.mbta.com"
MBTA_API_KEY = os.getenv("MBTA_API_KEY")


class MBTAClient:
    """Client for interacting with MBTA V3 API."""
    
    def __init__(self) -> None:
        """Initialize the MBTA API client."""
        self.base_url = MBTA_API_BASE_URL
        self.api_key = MBTA_API_KEY
        self.headers = {}
        if self.api_key:
            self.headers["X-API-Key"] = self.api_key
    
    async def _make_request(
            self,
            endpoint: str,
            params: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Make an HTTP request to the MBTA API.
        
        Args:
            endpoint: API endpoint path
            params: Query parameters
            
        Returns:
            JSON response data
        """
        url = f"{self.base_url}{endpoint}"
        async with httpx.AsyncClient() as client:
            response = await client.get(
                url,
                headers=self.headers,
                params=params,
                timeout=30.0
            )
            response.raise_for_status()
            return response.json()
    
    async def get_subway_lines(self) -> List[Dict[str, Any]]:
        """
        Get all subway lines.
        
        The /lines endpoint doesn't support route_type filtering,
        so we get all lines and filter for subway lines on the client side.
        Only includes color-named subway lines: Red, Orange, Blue, and Green.
        Excludes Mattapan Trolley.
        
        Returns:
            List of subway line objects (Red, Orange, Blue, Green only)
        """
        # Check cache first
        cached_data = load_from_cache("subway_lines")
        if cached_data is not None:
            return cached_data
        
        # Get all lines (no filter supported on /lines endpoint)
        data = await self._make_request("/lines")
        all_lines = data.get("data", [])
        
        # Filter for color-named subway lines only (Red, Orange, Blue, Green)
        subway_line_ids = ["line-Red", "line-Orange", "line-Blue", "line-Green"]
        subway_lines = [
            line for line in all_lines 
            if line.get("id") in subway_line_ids
        ]
        
        # Save to cache
        save_to_cache("subway_lines", subway_lines)
        
        return subway_lines
    
    async def get_routes_for_line(
            self,
            line_id: str
    ) -> Dict[str, Any]:
        """
        Get routes for a specific line.
        The /routes endpoint doesn't support filter[line], so we get all subway routes
        and filter by line relationship on the backend.
        
        For Red Line, also includes Mattapan Trolley routes since it's an extension
        of the Ashmont branch.
        
        Args:
            line_id: Line ID (e.g., "line-Red")
            
        Returns:
            Dictionary with 'data' (routes) and 'included' (lines) arrays
        """
        # Get all subway routes with line relationships included
        params = {
            "filter[type]": "0,1",
            "include": "line"
        }
        data = await self._make_request("/routes", params=params)
        all_routes = data.get("data", [])
        included_lines = data.get("included", [])
        
        # Filter routes by line_id
        filtered_routes = [
            route for route in all_routes
            if route.get("relationships", {}).get("line", {}).get("data", {}).get("id") == line_id
        ]
        
        # For Red Line, also include Mattapan Trolley routes (it's an extension of Ashmont branch)
        if line_id == "line-Red":
            mattapan_routes = [
                route for route in all_routes
                if route.get("relationships", {}).get("line", {}).get("data", {}).get("id") == "line-Mattapan"
            ]
            # Update Mattapan routes to reference Red Line instead
            for route in mattapan_routes:
                if "relationships" not in route:
                    route["relationships"] = {}
                route["relationships"]["line"] = {
                    "data": {
                        "id": "line-Red",
                        "type": "line"
                    }
                }
            filtered_routes.extend(mattapan_routes)
        
        return {
            "data": filtered_routes,
            "included": included_lines
        }
    
    async def get_all_subway_routes(self) -> Dict[str, Any]:
        """
        Get all subway routes (route_type 0 and 1).
        Includes line relationships to get line colors.
        Includes Mattapan Trolley routes as part of Red Line.
        
        Returns:
            Dictionary with 'data' (routes) and 'included' (lines) arrays
        """
        # Check cache first
        cached_data = load_from_cache("all_subway_routes")
        if cached_data is not None:
            return cached_data
        
        params = {
            "filter[type]": "0,1",
            "include": "line"
        }
        data = await self._make_request("/routes", params=params)
        all_routes = data.get("data", [])
        included_lines = data.get("included", [])
        
        # Include Mattapan Trolley routes as part of Red Line
        # Find Red Line in included lines
        red_line = next((line for line in included_lines if line.get("id") == "line-Red"), None)
        
        # Get Mattapan routes and associate them with Red Line
        mattapan_routes = [
            route for route in all_routes
            if route.get("relationships", {}).get("line", {}).get("data", {}).get("id") == "line-Mattapan"
        ]
        
        # Update Mattapan routes to reference Red Line instead
        for route in mattapan_routes:
            if "relationships" not in route:
                route["relationships"] = {}
            route["relationships"]["line"] = {
                "data": {
                    "id": "line-Red",
                    "type": "line"
                }
            }
        
        # Include all routes (Red Line routes + Mattapan routes as Red Line)
        filtered_routes = [
            route for route in all_routes
            if route.get("relationships", {}).get("line", {}).get("data", {}).get("id") != "line-Mattapan"
        ]
        filtered_routes.extend(mattapan_routes)
        
        # Filter out Mattapan line from included lines (we're using Red Line instead)
        filtered_included_lines = [
            line for line in included_lines
            if line.get("id") != "line-Mattapan"
        ]
        
        result = {
            "data": filtered_routes,
            "included": filtered_included_lines
        }
        
        # Save to cache
        save_to_cache("all_subway_routes", result)
        
        return result
    
    async def get_stops_for_route(
            self,
            route_id: str
    ) -> List[Dict[str, Any]]:
        """
        Get stops for a specific route.
        
        Args:
            route_id: Route ID
            
        Returns:
            List of stop objects
        """
        params = {"filter[route]": route_id}
        data = await self._make_request("/stops", params=params)
        return data.get("data", [])
    
    async def get_all_stops_for_routes(
            self,
            route_ids: List[str]
    ) -> List[Dict[str, Any]]:
        """
        Get all stops for multiple routes.
        
        Args:
            route_ids: List of route IDs
            
        Returns:
            List of stop objects
        """
        if not route_ids:
            return []
        
        # Create cache key from sorted route IDs
        cache_key = f"stops_{'_'.join(sorted(route_ids))}"
        
        # Check cache first
        cached_data = load_from_cache(cache_key)
        if cached_data is not None:
            return cached_data
        
        route_ids_str = ",".join(route_ids)
        params = {"filter[route]": route_ids_str}
        data = await self._make_request("/stops", params=params)
        stops = data.get("data", [])
        
        # Save to cache
        save_to_cache(cache_key, stops)
        
        return stops
    
    async def get_predictions_for_route(
            self,
            route_id: str
    ) -> Dict[str, Any]:
        """
        Get predictions for a specific route.
        Includes stop data for matching predictions to stops.
        
        NOTE: Predictions are NEVER cached - always fetched fresh from API.
        
        Args:
            route_id: Route ID
            
        Returns:
            Dictionary with 'data' (predictions) and 'included' (stops) arrays
        """
        params = {"filter[route]": route_id, "include": "stop"}
        data = await self._make_request("/predictions", params=params)
        return {
            "data": data.get("data", []),
            "included": data.get("included", [])
        }
    
    async def get_predictions_for_stop(
            self,
            stop_id: str
    ) -> Dict[str, Any]:
        """
        Get predictions for a specific stop.
        Includes stop data for matching.
        
        NOTE: Predictions are NEVER cached - always fetched fresh from API.
        
        Args:
            stop_id: Stop ID
            
        Returns:
            Dictionary with 'data' (predictions) and 'included' (stops) arrays
        """
        params = {"filter[stop]": stop_id, "include": "stop,route"}
        data = await self._make_request("/predictions", params=params)
        return {
            "data": data.get("data", []),
            "included": data.get("included", [])
        }
    
    async def get_shapes_for_route(
            self,
            route_id: str
    ) -> List[Dict[str, Any]]:
        """
        Get shapes (polylines) for a specific route.
        Filters to only include canonical/main route pattern shapes to avoid duplicates.
        Adds route_id to each shape for color mapping.
        
        Args:
            route_id: Route ID
            
        Returns:
            List of shape objects with route_id added (filtered to canonical shapes)
        """
        params = {"filter[route]": route_id}
        data = await self._make_request("/shapes", params=params)
        all_shapes = data.get("data", [])
        
        # For routes with branches (like Red Line), we need to show all distinct branches
        # Filter to show main route patterns while preserving branch diversity
        # For subway routes, we want to show a single representative shape
        # Strategy: Prefer canonical shapes, then longest shapes, avoiding duplicates
        
        if not all_shapes:
            return []
        
        # First, try to find canonical shapes (main route patterns)
        canonical_shapes = [s for s in all_shapes if s.get("id", "").startswith("canonical-")]
        
        # Special handling for Red Line: keep all canonical shapes to preserve branches
        is_red_line = route_id == "Red"
        
        if canonical_shapes:
            # Use canonical shapes, but preserve distinct branches
            # For Red Line, different shape IDs (e.g., canonical-933_0010 vs canonical-933_0009)
            # represent different branches, so we keep them all
            # Only remove exact duplicates
            filtered = []
            seen_ids = set()
            for shape in canonical_shapes:
                shape_id = shape.get("id", "")
                if shape_id not in seen_ids:
                    filtered.append(shape)
                    seen_ids.add(shape_id)
            canonical_shapes = filtered
            
            # For Red Line, if we have canonical shapes, return all of them
            # This ensures we show both branches (Ashmont and Braintree) in both directions
            if is_red_line and len(canonical_shapes) >= 2:
                # Keep all canonical shapes for Red Line - they represent the branches
                # Add route_id to each shape
                for shape in canonical_shapes:
                    if "attributes" not in shape:
                        shape["attributes"] = {}
                    shape["attributes"]["_route_id"] = route_id
                
                return canonical_shapes
        
        # For other routes, if no canonical shapes or too many, filter by longest polyline
        if (len(canonical_shapes) > 2 and not is_red_line) or not canonical_shapes:
            # Calculate polyline lengths and sort by length
            shapes_with_length = []
            for shape in all_shapes:
                polyline = shape.get("attributes", {}).get("polyline", "")
                if polyline:
                    shapes_with_length.append((len(polyline), shape))
            
            if shapes_with_length:
                # Sort by length (descending) and take the longest ones
                shapes_with_length.sort(key=lambda x: x[0], reverse=True)
                
                # For subway routes, typically want 2 shapes max (one per direction)
                # But for display, we can show just the longest one
                if canonical_shapes:
                    # Merge canonical with longest non-canonical
                    canonical_ids = {s.get("id") for s in canonical_shapes}
                    longest_non_canonical = [s for _, s in shapes_with_length if s.get("id") not in canonical_ids]
                    if longest_non_canonical:
                        canonical_shapes.append(longest_non_canonical[0])
                else:
                    # Use the longest shape(s) - typically 1-2 for subway routes
                    # Take up to 2 longest shapes (one per direction if they exist)
                    max_shapes = min(2, len(shapes_with_length))
                    canonical_shapes = [s for _, s in shapes_with_length[:max_shapes]]
        
        # Final deduplication - but preserve distinct branches
        # For Red Line, we need to keep shapes that represent different branches (Ashmont vs Braintree)
        # So we use the full shape ID (minus canonical- prefix) for deduplication
        final_shapes = []
        seen_ids = set()
        for shape in canonical_shapes:
            shape_id = shape.get("id", "")
            # For canonical shapes, use the full ID after "canonical-" for deduplication
            # This preserves different branches (e.g., canonical-933_0010 vs canonical-933_0009)
            if shape_id.startswith("canonical-"):
                dedup_id = shape_id.replace("canonical-", "")
            else:
                # For non-canonical, use the full ID
                dedup_id = shape_id
            if dedup_id not in seen_ids:
                final_shapes.append(shape)
                seen_ids.add(dedup_id)
        
        canonical_shapes = final_shapes if final_shapes else canonical_shapes
        
        # For routes with branches (like Red Line with Ashmont and Braintree),
        # we need to show multiple shapes representing different branches.
        # Strategy: Keep multiple canonical shapes if they exist, as they represent
        # distinct route patterns. Only filter aggressively if we have too many.
        if len(canonical_shapes) > 1:
            # Calculate polyline lengths
            shapes_with_length = []
            for shape in canonical_shapes:
                polyline = shape.get("attributes", {}).get("polyline", "")
                shapes_with_length.append((len(polyline), shape))
            
            # Sort by length (descending)
            shapes_with_length.sort(key=lambda x: x[0], reverse=True)
            
            # For subway routes, we typically want to show:
            # - Up to 2-3 shapes if they represent different branches (Red Line: Ashmont, Braintree)
            # - Only 1 shape if they're just different directions of the same branch
            # 
            # For routes that commonly have branches (like Red Line), be more permissive.
            # Routes with branches may have shapes of similar length but different paths.
            lengths = [length for length, _ in shapes_with_length]
            if len(lengths) >= 2:
                max_length = lengths[0]
                min_length = lengths[-1]
                
                # Special handling for Red Line which has Ashmont and Braintree branches
                # For Red Line, keep all shapes (they represent different branches)
                # For other routes, use length difference to determine if they're different branches
                if is_red_line:
                    # Red Line: keep all shapes (up to reasonable limit) to show both branches
                    canonical_shapes = [s for _, s in shapes_with_length[:5]]
                else:
                    # Other routes: check if shapes represent different branches
                    length_diff_ratio = (max_length - min_length) / max_length if max_length > 0 else 0
                    if length_diff_ratio >= 0.15:
                        # Different branches - keep up to 3 longest distinct shapes
                        canonical_shapes = [s for _, s in shapes_with_length[:3]]
                    else:
                        # Similar lengths - likely same branch, different directions
                        # Keep the longest one (most complete representation)
                        canonical_shapes = [s for _, s in shapes_with_length[:1]]
            else:
                # Only one shape, keep it
                canonical_shapes = [s for _, s in shapes_with_length]
        
        # Add route_id to each shape for easy lookup
        for shape in canonical_shapes:
            if "attributes" not in shape:
                shape["attributes"] = {}
            shape["attributes"]["_route_id"] = route_id
        
        return canonical_shapes
    
    async def get_all_shapes_for_routes(
            self,
            route_ids: List[str]
    ) -> Dict[str, Any]:
        """
        Get all shapes for multiple routes.
        Fetches shapes for each route individually and filters to main route patterns
        to avoid showing duplicate/overlapping lines.
        
        Args:
            route_ids: List of route IDs
            
        Returns:
            Dictionary with 'data' (shapes with route_id added, filtered) and route mapping
        """
        if not route_ids:
            return {"data": [], "shape_to_route": {}}
        
        # Create cache key from sorted route IDs
        cache_key = f"shapes_{'_'.join(sorted(route_ids))}"
        
        # Check cache first
        cached_data = load_from_cache(cache_key)
        if cached_data is not None:
            return cached_data
        
        all_shapes = []
        shape_to_route = {}
        
        # Fetch shapes for all routes in parallel for better performance
        shape_tasks = [self.get_shapes_for_route(route_id) for route_id in route_ids]
        shape_results = await asyncio.gather(*shape_tasks, return_exceptions=True)
        
        # Process results
        for route_id, filtered_shapes in zip(route_ids, shape_results):
            if isinstance(filtered_shapes, Exception):
                # Log error but continue with other routes
                tb = traceback.extract_tb(filtered_shapes.__traceback__) if hasattr(filtered_shapes, '__traceback__') and filtered_shapes.__traceback__ else None
                line_no = tb[-1].lineno if tb else "unknown"
                print(f"Exception at line {line_no}: Error fetching shapes for route {route_id}: {filtered_shapes}")
                continue
            
            # Add route_id to each shape (already done by get_shapes_for_route, but ensure it's there)
            for shape in filtered_shapes:
                shape_id = shape.get("id")
                if "attributes" not in shape:
                    shape["attributes"] = {}
                shape["attributes"]["_route_id"] = route_id
                shape_to_route[shape_id] = route_id
                all_shapes.append(shape)
        
        result = {
            "data": all_shapes,
            "shape_to_route": shape_to_route
        }
        
        # Create cache key from sorted route IDs
        cache_key = f"shapes_{'_'.join(sorted(route_ids))}"
        
        # Save to cache
        save_to_cache(cache_key, result)
        
        return result
    
    async def get_alerts_for_line(
            self,
            route_ids: List[str]
    ) -> List[Dict[str, Any]]:
        """
        Get alerts for routes in a line.
        
        Args:
            route_ids: List of route IDs for the line
            
        Returns:
            List of alert objects, sorted by severity descending
        """
        route_ids_str = ",".join(route_ids)
        params = {
            "filter[route]": route_ids_str,
            "filter[datetime]": "NOW",
            "include": "routes",
            "sort": "-severity"
        }
        data = await self._make_request("/alerts", params=params)
        alerts = data.get("data", [])
        # Also sort on frontend to ensure proper ordering
        alerts.sort(
            key=lambda x: x.get("attributes", {}).get("severity", 0),
            reverse=True
        )
        return alerts
    
    async def get_facilities_for_stop(
            self,
            stop_id: str
    ) -> List[Dict[str, Any]]:
        """
        Get facilities (elevators, escalators, etc.) for a specific stop.
        
        Args:
            stop_id: Stop ID
            
        Returns:
            List of facility objects
        """
        params = {"filter[stop]": stop_id}
        data = await self._make_request("/facilities", params=params)
        return data.get("data", [])


# Global client instance
mbta_client = MBTAClient()
