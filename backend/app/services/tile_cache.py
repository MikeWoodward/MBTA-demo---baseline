"""
Map tile caching service.
Downloads and caches OpenStreetMap tiles to the Data folder.
"""
import os
import json
import traceback
import aiofiles
from pathlib import Path
from typing import Tuple, Optional
import httpx
from .cache_manager import ensure_cache_dir

# Boston center coordinates
BOSTON_CENTER = (42.3601, -71.0589)
CACHE_RADIUS_MILES = 40
CACHE_RADIUS_KM = CACHE_RADIUS_MILES * 1.60934

# Zoom levels to cache
CACHE_ZOOM_LEVELS = [9, 10, 11, 12, 13, 14, 15]

# Tile cache directory
TILE_CACHE_DIR = ensure_cache_dir() / "tiles"


def lat_lng_to_tile(lat: float, lng: float, zoom: int) -> Tuple[int, int, int]:
    """
    Convert lat/lng to tile coordinates.
    
    Returns:
        Tuple of (x, y, z)
    """
    n = 2 ** zoom
    x = int((lng + 180) / 360 * n)
    lat_rad = (lat * 3.141592653589793) / 180
    y = int(((1 - (1 / 3.141592653589793) * 
              (1 + (1 / 3.141592653589793)) * 
              (1 - (1 / 3.141592653589793)) * 
              (1 + (1 / 3.141592653589793))) / 2) * n)
    
    # Correct calculation
    import math
    y = int((1 - math.log(math.tan(lat_rad) + 1 / math.cos(lat_rad)) / math.pi) / 2 * n)
    
    return (x, y, zoom)


def get_cache_bounds():
    """Calculate bounding box for cache area."""
    import math
    # 1 degree latitude ≈ 69 miles
    # 1 degree longitude ≈ 69 * cos(latitude) miles
    lat_degrees = CACHE_RADIUS_MILES / 69
    lng_degrees = CACHE_RADIUS_MILES / (69 * math.cos(math.radians(BOSTON_CENTER[0])))
    
    return {
        "north": BOSTON_CENTER[0] + lat_degrees,
        "south": BOSTON_CENTER[0] - lat_degrees,
        "east": BOSTON_CENTER[1] + lng_degrees,
        "west": BOSTON_CENTER[1] - lng_degrees,
    }


def generate_tile_coordinates():
    """Generate all tile coordinates for the cache area."""
    bounds = get_cache_bounds()
    tiles = []
    
    for zoom in CACHE_ZOOM_LEVELS:
        # Get tile coordinates for all four corners
        nw_tile = lat_lng_to_tile(bounds["north"], bounds["west"], zoom)
        ne_tile = lat_lng_to_tile(bounds["north"], bounds["east"], zoom)
        sw_tile = lat_lng_to_tile(bounds["south"], bounds["west"], zoom)
        se_tile = lat_lng_to_tile(bounds["south"], bounds["east"], zoom)
        
        # Find min/max x and y values
        min_x = min(nw_tile[0], ne_tile[0], sw_tile[0], se_tile[0])
        max_x = max(nw_tile[0], ne_tile[0], sw_tile[0], se_tile[0])
        min_y = min(nw_tile[1], ne_tile[1], sw_tile[1], se_tile[1])
        max_y = max(nw_tile[1], ne_tile[1], sw_tile[1], se_tile[1])
        
        # Generate all tiles in the bounding box
        for x in range(min_x, max_x + 1):
            for y in range(min_y, max_y + 1):
                tiles.append((x, y, zoom))
    
    return tiles


def get_tile_path(x: int, y: int, z: int) -> Path:
    """Get the file path for a cached tile."""
    # Organize tiles by zoom level: tiles/z/x/y.png
    tile_dir = TILE_CACHE_DIR / str(z) / str(x)
    tile_dir.mkdir(parents=True, exist_ok=True)
    return tile_dir / f"{y}.png"


async def download_tile(x: int, y: int, z: int) -> bool:
    """Download and cache a single tile."""
    try:
        subdomain = (x + y) % 3
        url = f"https://{subdomain}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(url)
            response.raise_for_status()
            
            # Save tile to cache
            tile_path = get_tile_path(x, y, z)
            async with aiofiles.open(tile_path, 'wb') as f:
                await f.write(response.content)
            
            return True
    except Exception as e:
        tb = traceback.extract_tb(e.__traceback__)
        line_no = tb[-1].lineno if tb else "unknown"
        print(f"Exception at line {line_no}: Error downloading tile {z}/{x}/{y}: {e}")
        return False


def get_cached_tile(x: int, y: int, z: int) -> Optional[Path]:
    """Check if a tile is cached and return its path."""
    tile_path = get_tile_path(x, y, z)
    if tile_path.exists():
        return tile_path
    return None


async def preload_map_tiles(on_progress=None):
    """Download all tiles for the cache area."""
    try:
        # Ensure tile cache directory exists
        TILE_CACHE_DIR.mkdir(parents=True, exist_ok=True)
        
        tiles = generate_tile_coordinates()
        total_tiles = len(tiles)
        downloaded = 0
        failed = 0
        
        # Download tiles in batches
        BATCH_SIZE = 10
        DELAY_BETWEEN_BATCHES = 0.1  # seconds
        
        for i in range(0, len(tiles), BATCH_SIZE):
            batch = tiles[i:i + BATCH_SIZE]
            
            import asyncio
            results = await asyncio.gather(
                *[download_tile(x, y, z) for x, y, z in batch],
                return_exceptions=True
            )
            
            for result in results:
                if result is True:
                    downloaded += 1
                else:
                    failed += 1
            
            # Report progress
            if on_progress:
                on_progress({
                    "downloaded": downloaded,
                    "failed": failed,
                    "total": total_tiles,
                    "percentage": int((downloaded / total_tiles) * 100) if total_tiles > 0 else 0
                })
            
            # Small delay between batches
            if i + BATCH_SIZE < len(tiles):
                await asyncio.sleep(DELAY_BETWEEN_BATCHES)
        
        print(f"Map tile cache complete: {downloaded}/{total_tiles} tiles downloaded")
        return {"downloaded": downloaded, "failed": failed, "total": total_tiles}
    except Exception as e:
        tb = traceback.extract_tb(e.__traceback__)
        line_no = tb[-1].lineno if tb else "unknown"
        print(f"Exception at line {line_no}: Error preloading map tiles: {e}")
        return {"downloaded": 0, "failed": 0, "total": 0}
