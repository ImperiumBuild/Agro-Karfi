from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import ee
from gee_tools import get_satellite_image_tile_url, get_climatology_data, get_soil_data
from auth import initialize_ee # Assuming this file handles your Service Account initialization

# --- 1. Pydantic Schema for Frontend Data ---
# Defines the structure of the incoming JSON data (polygon is a list of [lat, lon] pairs)
class PolygonRequest(BaseModel):
    # Field validation ensures the input is correct
    polygon: list[list[float]] = Field(
        ..., 
        description="List of [latitude, longitude] pairs defining the polygon vertices."
    )

# --- 2. FastAPI Setup ---
app = FastAPI(title="Agri-Geospatial Backend")

origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# --- 3. Earth Engine Initialization ---
try:
    initialize_ee()
    print("🌍 Google Earth Engine initialized successfully.")
except Exception as e:
    print(f"FATAL ERROR: EE Initialization failed. Check Service Account. Details: {e}")
    # Note: The API can still run, but EE calls will fail.

# ---------------------------------------------
# --- 4. API Endpoint ---
# ---------------------------------------------

@app.post("/calculate")
async def calculate_geospatial_data(request: PolygonRequest):
    """
    Processes the user-drawn polygon to retrieve satellite image URL, 
    climatology, and soil data.
    """
    polygon_coords = request.polygon
    
    if len(polygon_coords) < 3:
        raise HTTPException(
            status_code=400, 
            detail="Polygon must have at least 3 coordinates."
        )

    try:
        # Call GEE functions (using the updated polygon input signatures)
        image_url = get_satellite_image_tile_url(polygon_coords)
        climatology_result = get_climatology_data(polygon_coords)
        soil_result = get_soil_data(polygon_coords)
        
        # Check for errors in results
        if "Error" in image_url:
             raise Exception(f"Satellite Image Error: {image_url}")
        
        # Parse Climatology result string (Example: "Average Climatology: Temp 26.1°C (Mean Air Temp), Precip 1383 mm (Avg Annual Total)")
        # For simplicity, we'll return the raw strings for now.
        
        return {
            "status": "success",
            "area_sq_m": ee.Geometry.Polygon([[lon, lat] for lat, lon in polygon_coords]).area().getInfo(),
            "image_tile_url": image_url,
            "climatology": climatology_result,
            "soil_pH": soil_result,
            "polygon_bounds": polygon_coords # Return polygon back to help the frontend
        }

    except Exception as e:
        print(f"API Error during GEE processing: {e}")
        raise HTTPException(
            status_code=500, 
            detail=f"Geospatial processing failed: {e}"
        )

# ---------------------------------------------
# --- 5. RUN COMMAND ---
# ---------------------------------------------

# To run the server, use this command in your terminal:
# uvicorn main:app --reload --host 0.0.0.0 --port 8000