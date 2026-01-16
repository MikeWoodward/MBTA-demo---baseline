"""
Cache manager for MBTA data.
Saves and loads cached data from files in the Data folder.
"""
import json
import os
import traceback
from pathlib import Path
from typing import Any, Dict, Optional
from datetime import datetime, timedelta

# Cache directory (in project root)
CACHE_DIR = Path(__file__).parent.parent.parent / "Data"
CACHE_EXPIRY_HOURS = 168  # Cache expires after 7 days (1 week)


def ensure_cache_dir() -> Path:
    """Ensure the cache directory exists."""
    CACHE_DIR.mkdir(exist_ok=True)
    return CACHE_DIR


def get_cache_file_path(cache_key: str) -> Path:
    """Get the full path to a cache file."""
    ensure_cache_dir()
    return CACHE_DIR / f"{cache_key}.json"


def is_cache_valid(cache_file: Path) -> bool:
    """Check if cache file exists and is not expired."""
    if not cache_file.exists():
        return False
    
    # Check file modification time
    file_time = datetime.fromtimestamp(cache_file.stat().st_mtime)
    age = datetime.now() - file_time
    
    return age < timedelta(hours=CACHE_EXPIRY_HOURS)


def save_to_cache(cache_key: str, data: Any) -> bool:
    """
    Save data to cache file.
    
    Args:
        cache_key: Unique identifier for the cache entry
        data: Data to cache (must be JSON serializable)
        
    Returns:
        True if successful, False otherwise
    """
    try:
        cache_file = get_cache_file_path(cache_key)
        
        cache_data = {
            "timestamp": datetime.now().isoformat(),
            "data": data
        }
        
        with open(cache_file, 'w', encoding='utf-8') as f:
            json.dump(cache_data, f, indent=2, ensure_ascii=False)
        
        return True
    except Exception as e:
        tb = traceback.extract_tb(e.__traceback__)
        line_no = tb[-1].lineno if tb else "unknown"
        print(f"Exception at line {line_no}: Error saving cache for {cache_key}: {e}")
        return False


def load_from_cache(cache_key: str) -> Optional[Any]:
    """
    Load data from cache file.
    
    Args:
        cache_key: Unique identifier for the cache entry
        
    Returns:
        Cached data if valid, None otherwise
    """
    try:
        cache_file = get_cache_file_path(cache_key)
        
        if not is_cache_valid(cache_file):
            return None
        
        with open(cache_file, 'r', encoding='utf-8') as f:
            cache_data = json.load(f)
        
        return cache_data.get("data")
    except Exception as e:
        tb = traceback.extract_tb(e.__traceback__)
        line_no = tb[-1].lineno if tb else "unknown"
        print(f"Exception at line {line_no}: Error loading cache for {cache_key}: {e}")
        return None


def clear_cache(cache_key: Optional[str] = None) -> bool:
    """
    Clear cache file(s).
    
    Args:
        cache_key: Specific cache key to clear, or None to clear all
        
    Returns:
        True if successful, False otherwise
    """
    try:
        if cache_key:
            cache_file = get_cache_file_path(cache_key)
            if cache_file.exists():
                cache_file.unlink()
        else:
            # Clear all cache files
            cache_dir = ensure_cache_dir()
            for cache_file in cache_dir.glob("*.json"):
                cache_file.unlink()
        
        return True
    except Exception as e:
        tb = traceback.extract_tb(e.__traceback__)
        line_no = tb[-1].lineno if tb else "unknown"
        print(f"Exception at line {line_no}: Error clearing cache: {e}")
        return False
