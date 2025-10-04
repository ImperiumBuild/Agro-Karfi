import ee

# ========================================================================
#                    SATELLITE IMAGE (TILE URL)
# ========================================================================

def get_satellite_image_tile_url(polygon_coords: list) -> str:
    """
    Retrieves the best available free, medium-resolution (10m) True Color 
    Sentinel-2 image, clipped to the user-drawn Polygon.
    """
    try:
        # GEE uses (longitude, latitude) pairs. The input polygon_coords is 
        # typically in (latitude, longitude) format from the frontend.
        # We must reverse them for ee.Geometry.Polygon.
        ee_coords = [[lon, lat] for lat, lon in polygon_coords]
        ee_polygon = ee.Geometry.Polygon(ee_coords)
        
    except Exception as e:
        return f"Error creating GEE Geometry (Polygon): {e}"

    # --- 2. Sentinel-2 Image Collection (Stable) ---
    try:
        # COPERNICUS/S2_SR_HARMONIZED is the most stable and modern S2 asset
        image_collection = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED') \
            .filterBounds(ee_polygon) \
            .filterDate('2024-01-01', '2025-01-01') \
            .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 10)) 
            
        # Get the median composite of the least cloudy images
        image = image_collection.median()
        
        if image.bandNames().size().getInfo() == 0:
            return "Error: No cloud-free satellite image found for the selected area and time range."
            
        sentinel_vis_params = {
            'bands': ['B4', 'B3', 'B2'],
            'min': 0, 
            'max': 2500,
            'gamma': 1.2 
        }

        print("🟡 Generating best available Sentinel-2 (10m) True Color Composite.")
        # Clip the image to the precise polygon
        clipped_image = image.clip(ee_polygon)
        
        map_id_dict = clipped_image.getMapId(sentinel_vis_params)
        return map_id_dict['tile_fetcher'].url_format
        
    except Exception as e:
        return f"Error during GEE processing (Sentinel-2): {e}"


# ========================================================================
#                    ENVIRONMENTAL FUNCTIONS (POLYGON AVERAGE)
# ========================================================================

def get_soil_data(polygon_coords: list) -> str:
    """
    Retrieves the average topsoil pH for the entire Polygon using ISRIC SoilGrids v2.0 dataset.
    """
    try:
        # Reverse coordinates: Frontend (Lat, Lon) -> GEE (Lon, Lat)
        ee_coords = [[lon, lat] for lat, lon in polygon_coords]
        ee_polygon = ee.Geometry.Polygon(ee_coords)
        
        # SoilGrids v2.0 asset path (ph in H2O)
        soil_image = ee.Image("projects/soilgrids-isric/phh2o_mean")
        
        # Select topsoil depth band (0–5 cm)
        band_name = "phh2o_0-5cm_mean"
        
        # Use ee.Reducer.mean() to calculate the average across the entire polygon area
        soil_value = soil_image.select(band_name).reduceRegion(
            reducer=ee.Reducer.mean(),
            geometry=ee_polygon, # Use the polygon for the region
            scale=250, # 250m resolution of the data
            bestEffort=True # Allows calculation for large polygons
        ).getInfo()
        
        # Extract the value
        soil_pH_raw = soil_value.get(band_name)
        
        if soil_pH_raw is not None:
            # Correct the data scaling (divide by 10)
            soil_pH = soil_pH_raw / 10.0
            
            # Use ee.Geometry(ee_coords).area() to calculate polygon area in square meters
            area_sq_m = ee_polygon.area().getInfo()
            area_hectares = area_sq_m / 10000
            
            return (
                f"Average Topsoil (ISRIC 250m): pH {soil_pH:.2f} "
                f"(Area: {area_hectares:.2f} ha)"
            )
        else:
            return "Soil pH data not available for this location."

    except Exception as e:
        return f"Error fetching soil pH data: {e}"


def get_climatology_data(polygon_coords: list) -> str:
    """
    Retrieves the long-term average annual total precipitation (PERSIANN) and 
    average surface temperature (ERA5) for the entire Polygon area.
    """
    try:
        # Reverse coordinates: Frontend (Lat, Lon) -> GEE (Lon, Lat)
        ee_coords = [[lon, lat] for lat, lon in polygon_coords]
        ee_polygon = ee.Geometry.Polygon(ee_coords)
        
        # --- A. Precipitation Data (PERSIANN-CDR - Daily) ---
        precip_collection = ee.ImageCollection('NOAA/PERSIANN-CDR') \
            .filterDate('1983-01-01', '2024-01-01') \
            .select('precipitation') 

        # Total sum of all daily precip images across the 41-year period
        total_precip_image = precip_collection.sum()
        
        # Calculate the average total sum across the polygon area
        precip_value = total_precip_image.reduceRegion(
            reducer=ee.Reducer.mean(), # Use mean to average over the polygon
            geometry=ee_polygon,
            scale=5000, # 5km resolution
            bestEffort=True
        ).getInfo()
        
        # Calculate Average Annual Total: Total sum / (Number of years)
        num_years = 2024 - 1983 # 41 years
        annual_precip_mm = list(precip_value.values())[0] / num_years

        
        # --- B. Temperature Data (ERA5 - Monthly 2m Air Temperature) ---
        temp_collection = ee.ImageCollection('ECMWF/ERA5/MONTHLY') \
            .filterDate('1979-01-01', '2024-01-01') \
            .select('mean\_2m\_air\_temperature') # Temp in Kelvin

        # Get the mean temperature across the entire collection period
        mean_temp_image = temp_collection.mean()
        
        temp_value = mean_temp_image.reduceRegion(
            reducer=ee.Reducer.mean(), # Use mean to average over the polygon
            geometry=ee_polygon,
            scale=30000, # 30km resolution
            bestEffort=True
        ).getInfo()
        
        # Convert Kelvin to Celsius: K - 273.15
        mean_annual_temp_K = list(temp_value.values())[0]
        mean_annual_temp_C = mean_annual_temp_K - 273.15
        
        
        # --- C. Final Summary ---
        temp_str = f"{mean_annual_temp_C:.1f}°C (Mean Air Temp)"
        precip_str = f"{annual_precip_mm:.0f} mm (Avg Annual Total)"
        
        return f"Average Climatology: Temp {temp_str}, Precip {precip_str}"

    except Exception as e:
        return f"Error fetching climatology data: {e}"