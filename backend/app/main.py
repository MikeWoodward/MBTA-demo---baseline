"""FastAPI application entry point."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .api import routes

app = FastAPI(
    title="MBTA Subway Arrival Times API",
    description="API for MBTA subway arrival times and route information",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(routes.router)


@app.get("/")
async def root() -> dict:
    """Root endpoint."""
    return {
        "message": "MBTA Subway Arrival Times API",
        "version": "1.0.0"
    }


@app.get("/health")
async def health() -> dict:
    """Health check endpoint."""
    return {"status": "healthy"}
