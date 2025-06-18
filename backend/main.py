from fastapi import FastAPI, HTTPException  
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Any, List
import ee
import json
import logging
import os
import time
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Earth Engine
ee_initialized = False

def initialize_earth_engine():
    global ee_initialized
    try:
        # Try to initialize with private key if available
        # Look for credentials in standard locations
        ee.Initialize(project='tensorfarm')  # Specify your GEE project ID here or pass None
        logger.info("Earth Engine initialized successfully")
        ee_initialized = True
        return True
    except Exception as e:
        error_msg = str(e)
        logger.error(f"Failed to initialize Earth Engine: {error_msg}")
        if "no project found" in error_msg or "PERMISSION_DENIED" in error_msg:
            logger.warning("Authentication issue detected with Google Earth Engine")
            logger.info("Please follow these steps:")
            logger.info("1. Run 'earthengine authenticate' in your terminal")
            logger.info("2. Create a Google Cloud project if you don't have one")
            logger.info("3. Enable the Earth Engine API in your Google Cloud project")
            logger.info("4. Set up proper permissions for your account")
            logger.info("For detailed instructions, visit: https://developers.google.com/earth-engine/guides/python_install")
        ee_initialized = False
        return False

# Try to initialize at startup
initialize_earth_engine()

app = FastAPI(title="TensorFarm NDVI API", 
              description="API to get NDVI tiles from Earth Engine for a given polygon")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class PolygonData(BaseModel):
    polygon: Dict[str, Any]
    satellite_source: str = "sentinel-2"  # Options: "sentinel-2", "landsat-8", "landsat-9"
    start_date: str = "2024-11-01"  # Default start date for time series
    end_date: str = "2025-05-01"  # Default end date for time series
    time_series: bool = False  # Whether to return time series data

@app.get("/")
def read_root():
    return {"message": "Welcome to TensorFarm NDVI API"}

@app.get("/auth-status/")
def check_auth_status():
    global ee_initialized
    
    # Try to initialize if not already initialized
    if not ee_initialized:
        initialize_earth_engine()
    
    return {
        "authenticated": ee_initialized,
        "message": "Earth Engine authenticated successfully" if ee_initialized else "Earth Engine authentication required",
        "instructions": None if ee_initialized else [
            "Run 'earthengine authenticate' in your terminal",
            "Create a Google Cloud project and enable Earth Engine API",
            "Set up proper permissions for your account",
            "Restart the API server after authentication"
        ]
    }

@app.post("/ndvi-tiles/")
def get_ndvi_tiles(data: PolygonData):
    global ee_initialized
    
    # Check if Earth Engine is initialized
    if not ee_initialized:
        # Try to initialize again
        if not initialize_earth_engine():
            raise HTTPException(
                status_code=503, 
                detail="Earth Engine not authenticated. Run 'earthengine authenticate' in your terminal and restart the server."
            )
    
    try:
        # Extract the polygon from the request
        polygon_geojson = data.polygon
        
        if polygon_geojson["type"] != "Polygon":
            raise HTTPException(status_code=400, detail="Only Polygon geometry types are supported")
        
        # Convert the GeoJSON polygon to an Earth Engine geometry
        coordinates = polygon_geojson["coordinates"][0]  # Get the outer ring coordinates
        ee_polygon = ee.Geometry.Polygon(coordinates)
        
        # Get dates from request parameters or use defaults
        start_date = ee.Date(data.start_date)
        end_date = ee.Date(data.end_date)
        
        # Log the parameters being used
        logger.info(f"Processing request with: satellite={data.satellite_source}, start_date={data.start_date}, end_date={data.end_date}, time_series={data.time_series}")
        
        # Select satellite collection and bands based on source
        if data.satellite_source.lower() == "landsat-8":
            collection_name = "LANDSAT/LC08/C02/T1_L2"  # Landsat 8 Collection 2 Tier 1 Level 2
            nir_band = 'SR_B5'  # Near-infrared band
            red_band = 'SR_B4'  # Red band
            cloud_cover = 'CLOUD_COVER'
            scale_factor = 0.0000275  # Landsat 8 Collection 2 scale factor
            add_offset = -0.2  # Landsat 8 Collection 2 offset
        elif data.satellite_source.lower() == "landsat-9":
            collection_name = "LANDSAT/LC09/C02/T1_L2"  # Landsat 9 Collection 2 Tier 1 Level 2
            nir_band = 'SR_B5'  # Near-infrared band
            red_band = 'SR_B4'  # Red band
            cloud_cover = 'CLOUD_COVER'
            scale_factor = 0.0000275  # Landsat 9 Collection 2 scale factor
            add_offset = -0.2  # Landsat 9 Collection 2 offset
        else:
            # Default to Sentinel-2
            collection_name = "COPERNICUS/S2_SR"  # Sentinel-2 Surface Reflectance
            nir_band = 'B8'  # Near-infrared band
            red_band = 'B4'  # Red band
            cloud_cover = 'CLOUDY_PIXEL_PERCENTAGE'
            scale_factor = 0.0001  # Sentinel-2 scale factor
            add_offset = 0  # No offset for Sentinel-2

        # Load the selected satellite data
        image_collection = ee.ImageCollection(collection_name) \
            .filterDate(start_date, end_date) \
            .filterBounds(ee_polygon) \
            .filter(ee.Filter.lt(cloud_cover, 20))
        
        # Function to calculate NDVI for the selected satellite
        def add_ndvi(image):
            # Apply scale factor if needed for Landsat
            if data.satellite_source.lower() in ["landsat-8", "landsat-9"]:
                red = image.select(red_band).multiply(scale_factor).add(add_offset)
                nir = image.select(nir_band).multiply(scale_factor).add(add_offset)
                ndvi = nir.subtract(red).divide(nir.add(red)).rename('NDVI')
            else:
                ndvi = image.normalizedDifference([nir_band, red_band]).rename('NDVI')
            
            # Add date as a property for time series analysis
            return image.addBands(ndvi).set('system:time_start', image.get('system:time_start'))
        
        # Map the NDVI function over the image collection
        ndvi_collection = image_collection.map(add_ndvi)
        
        # Get the median NDVI value
        median_ndvi = ndvi_collection.select('NDVI').median()
        
        # Define visualization parameters
        vis_params = {
            'min': 0, 
            'max': 1, 
            'palette': [
                'FFFFFF', 'CE7E45', 'DF923D', 'F1B555', 'FCD163', '99B718',
                '74A901', '66A000', '529400', '3E8601', '207401', '056201',
                '004C00', '023B01', '012E01', '011D01', '011301'
            ]
        }
          # Create a tile URL template for Leaflet
        map_id = median_ndvi.getMapId(vis_params)
        tile_url_template = map_id['tile_fetcher'].url_format
        
        response = {
            "ndvi_tiles": {
                "url": tile_url_template,
                "attribution": f"Google Earth Engine | {data.satellite_source}",
                "min": 0,
                "max": 1,
                "satellite": data.satellite_source,
                "start_date": data.start_date,
                "end_date": data.end_date
            }
        }
        
        # Add time series data if requested
        if data.time_series:
            try:
                # Get the image collection with dates and NDVI values
                time_series_data = []
                
                # Create a list of available dates with NDVI values
                images_list = ndvi_collection.toList(ndvi_collection.size())
                size = images_list.size().getInfo()
                
                for i in range(size):
                    image = ee.Image(images_list.get(i))
                    date = ee.Date(image.get('system:time_start')).format('YYYY-MM-dd').getInfo()
                    
                    # Calculate mean NDVI for this date
                    mean_ndvi = image.select('NDVI').reduceRegion(
                        reducer=ee.Reducer.mean(),
                        geometry=ee_polygon,
                        scale=30,  # 30 meters for Landsat, 10 meters for Sentinel-2
                        maxPixels=1e9
                    ).get('NDVI').getInfo()
                    
                    if mean_ndvi is not None:
                        time_series_data.append({
                            "date": date,
                            "ndvi": mean_ndvi
                        })
                
                # Sort by date
                time_series_data.sort(key=lambda x: x['date'])                # Prepare the time series response structure with synchronized data
                response["time_series"] = {
                    "data": [],  # Will contain integrated data for each date (NDVI value and tile URL)
                    "count": len(time_series_data),
                    "timestamps": sorted(list(set([item["date"] for item in time_series_data]))),  # Sorted unique dates
                    "summary": {
                        "min_ndvi": min([item["ndvi"] for item in time_series_data]) if time_series_data else None,
                        "max_ndvi": max([item["ndvi"] for item in time_series_data]) if time_series_data else None,
                        "mean_ndvi": sum([item["ndvi"] for item in time_series_data]) / len(time_series_data) if time_series_data else None
                    }
                }
                
                # Generate tile URLs for each date in the time series and integrate with NDVI data
                for i in range(size):
                    try:
                        image = ee.Image(images_list.get(i))
                        date = ee.Date(image.get('system:time_start')).format('YYYY-MM-dd').getInfo()
                        
                        # Get NDVI band and create a tile URL for this specific date
                        ndvi_image = image.select('NDVI')
                        date_map_id = ndvi_image.getMapId(vis_params)
                        
                        # Find the corresponding NDVI value for this date
                        ndvi_value = next((item["ndvi"] for item in time_series_data if item["date"] == date), None)
                        
                        if ndvi_value is not None:
                            # Add integrated data (both NDVI value and tile URL) for this date
                            response["time_series"]["data"].append({
                                "date": date,
                                "ndvi": ndvi_value,
                                "url": date_map_id['tile_fetcher'].url_format
                            })
                    except Exception as e:
                        logger.warning(f"Could not generate tiles for date {i}: {e}")
                  # Create a time series visualization if there are at least 2 dates
                if len(time_series_data) >= 3:
                    try:
                        # Sort the data for proper time progression
                        sorted_dates = sorted(response["time_series"]["data"], key=lambda x: x["date"])
                        
                        # Use specific indices for beginning, middle, and end
                        first_idx = 0
                        middle_idx = len(sorted_dates) // 2
                        last_idx = len(sorted_dates) - 1
                        
                        # Find the images corresponding to these dates
                        first_date = sorted_dates[first_idx]["date"]
                        middle_date = sorted_dates[middle_idx]["date"]
                        last_date = sorted_dates[last_idx]["date"]
                        
                        # Get the first, middle, and last images by finding them in the images_list
                        first_image = None
                        middle_image = None
                        last_image = None
                        
                        for i in range(size):
                            image = ee.Image(images_list.get(i))
                            date = ee.Date(image.get('system:time_start')).format('YYYY-MM-dd').getInfo()
                            
                            if date == first_date:
                                first_image = image
                            elif date == middle_date:
                                middle_image = image
                            elif date == last_date:
                                last_image = image
                        
                        # Create RGB composite if we found all necessary images
                        if first_image and middle_image and last_image:
                            # Create RGB composite (R = first date, G = middle date, B = last date)
                            rgb_vis = ee.Image.rgb(
                                first_image.select('NDVI'),
                                middle_image.select('NDVI'),
                                last_image.select('NDVI')
                            )
                            
                            # Add RGB visualization to response
                            rgb_map_id = rgb_vis.getMapId({
                                'min': 0,
                                'max': 1
                            })
                            
                            response["time_series"]["rgb_visualization"] = {
                                "url": rgb_map_id['tile_fetcher'].url_format,
                                "dates": [first_date, middle_date, last_date]
                            }
                    except Exception as e:
                        logger.error(f"Error generating RGB visualization: {e}")
                        # Continue without RGB visualization
            except Exception as e:
                logger.error(f"Error generating time series data: {e}")
                response["time_series"] = {"error": str(e)}
        
        return response
    
    except Exception as e:
        logger.error(f"Error processing request: {e}")
        raise HTTPException(status_code=500, detail=f"Error processing NDVI data: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
